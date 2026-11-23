import sys
sys.dont_write_bytecode = True

import asyncio
import base64
import json
import re
import time
import aiohttp
import edge_tts
import numpy as np
import sherpa_onnx
import websockets

# ================= CẤU HÌNH MẶC ĐỊNH =================
HOST = "127.0.0.1"
PORT = 8765
SAMPLE_RATE = 16000
DEFAULT_TARGET_LANG = "vi"
DEFAULT_VOICE = "vi-VN-HoaiMyNeural"
DEFAULT_RATE = "+25%"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}

SENSEVOICE_DIR = "models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
VAD_MODEL = "models/silero_vad.onnx"
# ====================================================

# Cache các model recognizer theo ngôn ngữ
RECOGNIZERS = {}


def normalize_lang(lang: str) -> str:
    if not lang:
        return "auto"
    l = lang.lower().strip()
    if "ja" in l or "japan" in l:
        return "ja"
    if "zh" in l or "chin" in l or "mandarin" in l:
        return "zh"
    if "en" in l or "eng" in l:
        return "en"
    if "ko" in l or "korea" in l:
        return "ko"
    if "yue" in l or "canton" in l:
        return "yue"
    return "auto"


def get_recognizer(lang: str = "auto"):
    norm = normalize_lang(lang)
    if norm not in RECOGNIZERS:
        print(f"[Server] Đang nạp model SenseVoice cho ngôn ngữ: [{norm}]...")
        RECOGNIZERS[norm] = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=f"{SENSEVOICE_DIR}/model.int8.onnx",
            tokens=f"{SENSEVOICE_DIR}/tokens.txt",
            num_threads=4,
            use_itn=True,
            debug=False,
            language=norm,
        )
        print(f"[Server] Nạp xong model cho [{norm}]!")
    return RECOGNIZERS[norm], norm


# Pre-load sẵn các ngôn ngữ chính (Trung, Nhật, Anh, Auto)
print("[Server] Khởi tạo các bộ nhận diện SenseVoice (Trung - Nhật - Anh - Auto)...")
for l in ["auto", "zh", "ja", "en"]:
    get_recognizer(l)
print("[Server] Tất cả model ASR đã sẵn sàng!")


def create_vad():
    config = sherpa_onnx.VadModelConfig()
    config.silero_vad.model = VAD_MODEL
    # Hạ threshold xuống 0.20 để bắt cực nhạy cả giọng thì thào, tiếng Nhật/Trung nhỏ hoặc video có nhạc nền BGM
    config.silero_vad.threshold = 0.20
    config.silero_vad.min_silence_duration = 0.35
    config.silero_vad.min_speech_duration = 0.20
    config.silero_vad.max_speech_duration = 5.0
    config.sample_rate = SAMPLE_RATE
    return sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=60)


def run_asr_sync(samples: np.ndarray, source_lang: str = "auto") -> str:
    # Chuẩn hóa âm lượng: đưa đỉnh âm thanh lên 0.85 để SenseVoice nhận diện rõ nhất dù video gốc nói nhỏ
    peak = np.max(np.abs(samples)) if len(samples) > 0 else 0
    if peak > 0.01:
        samples = (samples / peak) * 0.85

    recognizer, _ = get_recognizer(source_lang)
    stream = recognizer.create_stream()
    stream.accept_waveform(SAMPLE_RATE, samples)
    recognizer.decode_stream(stream)
    text = stream.result.text.strip()
    # Xóa các thẻ nhãn đặc biệt: <|zh|>, <|NEUTRAL|>, <|Speech|>, <|BGM|>, v.v.
    text = re.sub(r"<\|.*?\|>", "", text).strip()
    return text


async def translate_google(session: aiohttp.ClientSession, text: str, source_lang: str = "auto", target_lang: str = "vi") -> str:
    url = "https://translate.googleapis.com/translate_a/single"
    norm_src = normalize_lang(source_lang)
    sl = norm_src if norm_src in ["zh", "ja", "en", "ko"] else "auto"

    for client_param in ["dict-chrome-ex", "gtx", "webapp"]:
        params = {
            "client": client_param,
            "sl": sl,
            "tl": target_lang or "vi",
            "dt": "t",
            "q": text,
        }
        try:
            async with session.get(url, params=params, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return "".join(part[0] for part in data[0] if part and part[0]).strip()
        except Exception:
            continue
    return ""


async def synthesize_edge_tts(text: str, voice: str = DEFAULT_VOICE, rate: str = DEFAULT_RATE) -> str:
    try:
        communicate = edge_tts.Communicate(text, voice or DEFAULT_VOICE, rate=rate or DEFAULT_RATE)
        audio_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes.extend(chunk["data"])
        return base64.b64encode(audio_bytes).decode("ascii")
    except Exception as e:
        print(f"[TTS Error] {e}")
        return ""


async def process_segment(websocket, http_session, samples: np.ndarray, config: dict):
    t0 = time.perf_counter()
    src_lang = config.get("sourceLang", "auto")
    tgt_lang = config.get("targetLang", DEFAULT_TARGET_LANG)
    voice = config.get("voice", DEFAULT_VOICE)
    rate = config.get("rate", DEFAULT_RATE)
    duration_sec = round(len(samples) / SAMPLE_RATE, 2)

    # 1. Nhận diện giọng nói
    orig_text = await asyncio.to_thread(run_asr_sync, samples, src_lang)
    clean_text = re.sub(r"[。，、！？.!?\s\r\n]", "", orig_text)

    # Nếu model ngôn ngữ chỉ định chưa ra chữ, thử lại với model auto
    if not clean_text and normalize_lang(src_lang) != "auto":
        orig_text = await asyncio.to_thread(run_asr_sync, samples, "auto")
        clean_text = re.sub(r"[。，、！？.!?\s\r\n]", "", orig_text)

    if not clean_text:
        # Đoạn âm thanh chỉ có nhạc nền hoặc tiếng động, bỏ qua
        return

    t_asr = (time.perf_counter() - t0) * 1000

    # 2. Dịch sang ngôn ngữ đích
    trans_text = await translate_google(http_session, orig_text, source_lang=src_lang, target_lang=tgt_lang)
    if not trans_text:
        print(f"[Lỗi Dịch] Không dịch được: '{orig_text}'")
        return
    t_trans = (time.perf_counter() - t0) * 1000

    # 3. Tạo giọng đọc Edge TTS
    audio_b64 = await synthesize_edge_tts(trans_text, voice=voice, rate=rate)
    t_total = (time.perf_counter() - t0) * 1000

    print(f"[{src_lang.upper()} -> {tgt_lang.upper()} | {duration_sec}s | ASR {t_asr:.0f}ms | Tổng {t_total:.0f}ms] {orig_text} --> {trans_text}")

    # 4. Gửi trả về Extension
    payload = {
        "type": "subtitle",
        "orig": orig_text,
        "trans": trans_text,
        "audio_b64": audio_b64,
        "duration": duration_sec
    }
    try:
        await websocket.send(json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass


async def handle_client(websocket, *args):
    print("\n[Server] === Extension đã kết nối! ===")
    vad = create_vad()
    window_size = 512
    buffer = np.array([], dtype=np.float32)
    chunk_counter = 0

    client_config = {
        "sourceLang": "auto",
        "targetLang": DEFAULT_TARGET_LANG,
        "voice": DEFAULT_VOICE,
        "rate": DEFAULT_RATE
    }

    queue = asyncio.Queue()

    async with aiohttp.ClientSession(headers=HEADERS) as http_session:
        async def queue_worker():
            while True:
                try:
                    samples = await queue.get()
                    if samples is None:
                        break
                    await process_segment(websocket, http_session, samples, client_config)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"[Queue Worker Error] {e}")
                finally:
                    queue.task_done()

        worker_task = asyncio.create_task(queue_worker())

        try:
            async for message in websocket:
                if isinstance(message, bytes):
                    chunk_counter += 1
                    pcm16 = np.frombuffer(message, dtype=np.int16)
                    float32 = pcm16.astype(np.float32) / 32768.0
                    buffer = np.concatenate((buffer, float32))

                    # Báo trạng thái nhận audio mỗi 3 giây một lần
                    if chunk_counter % 80 == 0:
                        peak_val = np.max(np.abs(float32)) if len(float32) > 0 else 0
                        if peak_val < 0.002:
                            print("[Cảnh báo] Âm thanh nhận vào gần như = 0! Kiểm tra video YouTube có đang bật volume không.")
                        else:
                            print(f"[Audio Stream] Đang nhận âm thanh... (Âm lượng đỉnh: {peak_val:.2f})")

                    while len(buffer) >= window_size:
                        vad.accept_waveform(buffer[:window_size])
                        buffer = buffer[window_size:]

                    while not vad.empty():
                        segment = np.array(vad.front.samples, dtype=np.float32)
                        vad.pop()
                        seg_sec = round(len(segment) / SAMPLE_RATE, 2)
                        print(f"[VAD] Bắt được câu nói dài {seg_sec}s -> Đang nhận diện...")
                        await queue.put(segment)

                elif isinstance(message, str):
                    data = json.loads(message)
                    msg_type = data.get("type")
                    if msg_type == "reset":
                        vad.reset()
                        buffer = np.array([], dtype=np.float32)
                        while not queue.empty():
                            try:
                                queue.get_nowait()
                                queue.task_done()
                            except asyncio.QueueEmpty:
                                break
                        print("[Server] Đã reset trạng thái cho video mới.")
                    elif msg_type == "config":
                        if "sourceLang" in data:
                            client_config["sourceLang"] = data["sourceLang"]
                        if "targetLang" in data:
                            client_config["targetLang"] = data["targetLang"]
                        if "voice" in data:
                            client_config["voice"] = data["voice"]
                        if "rate" in data:
                            client_config["rate"] = data["rate"]
                        print(f"[Server] Cập nhật ngôn ngữ nhận diện: [{client_config['sourceLang'].upper()}] -> [{client_config['targetLang'].upper()}]")

        except websockets.exceptions.ConnectionClosed:
            print("[Server] Extension đã ngắt kết nối.")
        finally:
            worker_task.cancel()
            await asyncio.gather(worker_task, return_exceptions=True)


async def main():
    async with websockets.serve(handle_client, HOST, PORT, max_size=2**22):
        print(f"[Server] Đang lắng nghe tại ws://{HOST}:{PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
