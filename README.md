<div align="center">

# 🎧 YouTube AI Voice Dubber

**Real-time subtitle translation and natural AI voice-over (dubbing) for YouTube & YouTube Shorts**

[English](#-english) • [Tiếng Việt](#-tiếng-việt) • [Live ASR Guide (No Sub)](#-advanced-feature-real-time-live-ai-dubbing-no-subtitles) • [Landing Page](https://hoanfnho7.github.io/thuyet-minh-youtube/) • [Releases](https://github.com/hoanfnho7/thuyet-minh-youtube/releases)

</div>

---

## 🇺🇸 English

**YouTube AI Voice Dubber** is a free, open-source browser extension (Chrome, Edge, Brave, Cốc Cốc) that translates YouTube captions and generates real-time AI voice-over directly in your browser — **no account, no time limits, and no API key required for built-in voices**.

### ✨ Key Features
- **15 Supported Target Languages:** English, Vietnamese, Spanish, Portuguese, French, German, Russian, Japanese, Korean, Chinese (Simplified & Traditional), Hindi, Indonesian, Thai, and Arabic.
- **Built-in Free AI Voices:** Uses Microsoft Edge Neural voices and Google Standard TTS out of the box.
- **Smart Fit-to-Pacing:** Automatically adjusts speech rate to match the speaker's pace (from slow podcasts to fast-paced videos), or switch to manual custom speed anytime.
- **Audio Ducking:** Automatically lowers the original video volume while dubbing and restores it afterward.
- **Bilingual Script & Word-by-Word Karaoke:** Displays original and translated subtitles side-by-side with real-time karaoke word highlighting. Click any line to jump straight to that timestamp.
- **YouTube & Shorts + Ad Detection:** Works on both standard videos and YouTube Shorts, automatically pausing voice-over during ads.
- **Optional BYOK (Bring Your Own Key):** Supports personal OpenAI TTS (`nova`) and Google Cloud WaveNet API keys for premium voices.

---

### 🎙️ [Advanced Feature] Real-Time Live AI Dubbing (No Subtitles)
> **Available on branch `feat/live-asr-dubbing`:** Dubs YouTube videos that have **NO subtitles/captions** using local on-device AI speech recognition!

Powered by **SenseVoice-Small** (Alibaba DAMO Academy) + **Silero VAD** + **Edge TTS** via a high-performance local WebSocket server:
- **Supported ASR input languages:** English, Chinese (Mandarin), Japanese, Korean, and Auto-Detect.
- **Low-latency streaming:** 16kHz PCM audio stream via Web Audio API AudioWorkletNode.
- **One-click model setup:** Automatically downloads only the required lightweight quantized models (~240 MB) from HuggingFace.

#### 🛠️ Quick Setup for Live ASR:
1. **Install Python requirements** (Python 3.9+ required):
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the local ASR server:**
   - Double-click `start_server.bat` (or run `python -B server.py`).
   - *On first launch, it will automatically download the 3 required models (~240MB total).*
3. **Use on YouTube:**
   - Load this extension folder in `chrome://extensions/` (Developer Mode).
   - Open any video without subtitles.
   - In the extension panel, select **Source sub:** `AI Listen: English / Chinese / Japanese (No Sub)`.
   - Click **Start Dubbing** (`Alt + Shift + D`). Enjoy real-time live interpretation!

---

### 🚀 Standard Installation (Manual / Developer Mode)
1. Download the latest `.zip` package from **[Releases](https://github.com/hoanfnho7/thuyet-minh-youtube/releases/latest)** and extract it to a permanent folder.
2. Open `chrome://extensions` (Chrome/Brave) or `edge://extensions` (Microsoft Edge).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the extracted folder.

### ⌨️ Shortcuts
- `Alt + Shift + D` — Toggle AI Voice Dubbing on/off
- `Alt + Shift + V` — Toggle Bilingual Karaoke Script panel

---

## 🇻🇳 Tiếng Việt

**YouTube AI Voice Dubber** là tiện ích mở rộng mã nguồn mở (Chrome, Edge, Brave, Cốc Cốc) giúp dịch phụ đề và thuyết minh (lồng tiếng) video YouTube theo thời gian thực với giọng đọc AI tự nhiên — **miễn phí, không giới hạn thời lượng, dùng ngay không cần nhập API Key**.

### ✨ Tính năng nổi bật
- **Hỗ trợ 15 ngôn ngữ dịch & đọc:** Tiếng Việt, Anh, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Nga, Nhật, Hàn, Trung (Giản thể & Phồn thể), Hindi, Indonesia, Thái Lan và Ả Rập.
- **Giọng đọc AI miễn phí có sẵn:** Tích hợp sẵn giọng đọc Edge Neural (Nam Minh, Hoài My...) và Google Standard, cài xong là dùng ngay.
- **Đồng bộ nhịp thông minh (Fit-to-Pacing):** Chế độ *Mặc định* tự động co giãn tốc độ đọc khớp với nhịp người nói, hoặc chỉnh tốc độ thủ công.
- **Tự động giảm âm lượng gốc (Audio Ducking):** Hạ nhỏ tiếng gốc khi AI đang thuyết minh để nghe rõ lời dịch.
- **Kịch bản song ngữ & Chạy chữ Karaoke:** Hiển thị câu gốc + bản dịch chạy sáng từng từ theo giọng đọc, bấm vào câu bất kỳ để tua nhanh tới đoạn đó.
- **Hỗ trợ YouTube thường, Shorts & Tránh quảng cáo:** Tự động bắt đúng ngôn ngữ gốc của video và tự ngắt tiếng thuyết minh khi video chạy quảng cáo.
- **Tùy chọn BYOK:** Hỗ trợ nhập API Key cá nhân (OpenAI TTS / Google Cloud WaveNet) nếu muốn dùng thêm giọng cao cấp.

---

### 🎙️ [Nâng cao] Thuyết minh trực tiếp bằng AI ASR (Video không có phụ đề)
> **Tính năng độc quyền trên nhánh `feat/live-asr-dubbing`:** Cho phép dịch và thuyết minh các video **hoàn toàn KHÔNG có phụ đề** trên YouTube bằng AI nhận diện giọng nói chạy cục bộ!

Sử dụng kết hợp **SenseVoice-Small** (Alibaba DAMO Academy) + **Silero VAD** + **Edge TTS** qua WebSocket server nội bộ:
- **Hỗ trợ nhận diện giọng nói:** Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, và Tự động phát hiện (Auto).
- **Tối ưu tốc độ cao:** Sử dụng `AudioWorkletNode` bắt âm thanh 16kHz nền không làm lag trình duyệt.
- **Tự động tải model nhẹ (~240MB):** Không tải file rác, chỉ tải đúng 3 file model int8 cần thiết.

#### 🛠️ Hướng dẫn cài đặt chế độ Live ASR:
1. **Cài đặt thư viện Python** (Yêu cầu Python 3.9+):
   ```bash
   pip install -r requirements.txt
   ```
2. **Khởi động server AI:**
   - Nhấp đúp vào file `start_server.bat` (hoặc chạy `python -B server.py`).
   - *(Lần đầu chạy, hệ thống sẽ tự động tải các model cần thiết ~240MB về thư mục `models/`)*.
3. **Sử dụng trên YouTube:**
   - Mở video tiếng Anh, Nhật hoặc Trung bất kỳ (kể cả video không có phụ đề).
   - Trong bảng điều khiển của tiện ích, mục **Phụ đề nguồn (Source sub)**: chọn `AI Listen: English / Chinese / Japanese (No Sub)`.
   - Bấm **Bắt đầu thuyết minh** (`Alt + Shift + D`) để nghe dịch trực tiếp!

---

### 🚀 Hướng dẫn cài đặt tiện ích thủ công
1. Tải file `.zip` mới nhất tại mục **[Releases](https://github.com/hoanfnho7/thuyet-minh-youtube/releases/latest)** và giải nén vào một thư mục cố định.
2. Mở trình duyệt và truy cập `chrome://extensions` (Chrome/Brave) hoặc `edge://extensions` (Edge).
3. Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
4. Bấm **Load unpacked (Tải tiện ích đã giải nén)** -> chọn thư mục vừa giải nén.

### ⌨️ Phím tắt
- `Alt + Shift + D` — Bật / Tắt nhanh thuyết minh
- `Alt + Shift + V` — Bật / Tắt bảng kịch bản song ngữ Karaoke

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
