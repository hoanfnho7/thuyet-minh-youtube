import os
import sys
import urllib.request

MODELS_DIR = "models"
SENSEVOICE_DIR = os.path.join(MODELS_DIR, "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")

FILES = [
    {
        "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx",
        "path": os.path.join(MODELS_DIR, "silero_vad.onnx"),
        "name": "Silero VAD (643 KB)",
    },
    {
        "url": "https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/tokens.txt",
        "path": os.path.join(SENSEVOICE_DIR, "tokens.txt"),
        "name": "SenseVoice Tokens (315 KB)",
    },
    {
        "url": "https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/model.int8.onnx",
        "path": os.path.join(SENSEVOICE_DIR, "model.int8.onnx"),
        "name": "SenseVoice Int8 Model (239 MB)",
    },
]


def download_file(url, dest, name):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"  [OK] Đã có sẵn: {name}")
        return

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"  [Downloading] Đang tải: {name}...")

    def progress(block_num, block_size, total_size):
        if total_size > 0:
            percent = min(100, block_num * block_size * 100 // total_size)
            mb = (block_num * block_size) / (1024 * 1024)
            total_mb = total_size / (1024 * 1024)
            sys.stdout.write(f"\r    -> {percent}% ({mb:.1f}MB / {total_mb:.1f}MB)")
            sys.stdout.flush()

    opener = urllib.request.build_opener()
    opener.addheaders = [("User-Agent", "Mozilla/5.0")]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(url, dest, reporthook=progress)
    print(f"\n  [Xong] Tải thành công: {name}")


def main():
    print("==================================================")
    print(" KIỂM TRA & TẢI CÁC MODEL AI CẦN THIẾT (TỐI ƯU NHẸ)")
    print("==================================================")
    for f in FILES:
        download_file(f["url"], f["path"], f["name"])
    print("\n[Hoàn tất] Tất cả model cần thiết đã sẵn sàng!")


if __name__ == "__main__":
    main()
