/**
 * asr/asrBridge.js
 * Bắt âm thanh từ <video> YouTube -> downsample 16kHz PCM16 -> stream qua WebSocket ws://127.0.0.1:8765
 * Nhận lại { orig, trans, audio_b64, duration } từ server.py (SenseVoice + Silero VAD + Edge TTS)
 */

const WS_URL = "ws://127.0.0.1:8765";
const TARGET_SAMPLE_RATE = 16000;
const videoAudioNodes = new WeakMap();

class AsrBridge {
  constructor(options = {}) {
    this.sourceLang = options.sourceLang || "auto";
    this.targetLang = options.targetLang || "vi";
    this.voice = options.voice || "vi-VN-HoaiMyNeural";
    this.rate = options.rate || "+25%";

    this.onCueReady = options.onCueReady || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onError = options.onError || ((err) => console.error("[ASR Bridge]", err));

    this.dubCore = options.dubCore || null;
    this.isActive = false;
    this.isPaused = false;
    this.cueCounter = 0;
    this.cues = [];

    this.ws = null;
    this._video = null;
    this._processor = null;
    this._workletNode = null;
    this._silentGain = null;

    // Giữ tương thích với lệnh state.asrBridge?.capture?.setPaused(...) trong contentScript.js
    this.capture = {
      setPaused: (p) => {
        this.isPaused = Boolean(p);
      }
    };

    this._onVideoSeeking = this._handleVideoReset.bind(this);
    this._onVideoEnded = this._handleVideoReset.bind(this);
  }

  attachDubCore(dubCoreInstance) {
    this.dubCore = dubCoreInstance;
  }

  _sendConfig() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "config",
          sourceLang: this.sourceLang,
          targetLang: this.targetLang,
          voice: this.voice,
          rate: this.rate
        })
      );
    }
  }

  setLanguages({ sourceLang, targetLang, voice, rate } = {}) {
    if (sourceLang) this.sourceLang = sourceLang;
    if (targetLang) this.targetLang = targetLang;
    if (voice) this.voice = voice;
    if (rate) this.rate = rate;
    this._sendConfig();
  }

  async start(videoElement) {
    const video = videoElement || document.querySelector("video");
    if (!video) {
      this.onError(new Error("Không tìm thấy thẻ <video> trên trang."));
      return;
    }

    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;
    this.isPaused = false;
    this.cues = [];
    this.cueCounter = 0;
    this._video = video;

    video.addEventListener("seeking", this._onVideoSeeking);
    video.addEventListener("ended", this._onVideoEnded);

    this._emitStatus({ status: "connecting" });

    try {
      await this._connectWebSocket();
      await this._startAudioStream(video);
    } catch (err) {
      this.onError(err);
      this.stop();
    }
  }

  _connectWebSocket() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Không kết nối được server.py (ws://127.0.0.1:8765). Kiểm tra đã chạy python server.py chưa."));
        }
      }, 4000);

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this._sendConfig();
          this._emitStatus({ status: "ready", device: "LOCAL" });
          resolve();
        }
      };

      ws.onmessage = (event) => {
        if (!this.isActive) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "subtitle" && data.orig) {
            const nowT = this._video ? this._video.currentTime : 0;
            const duration = Number(data.duration) || 2.0;
            const cue = {
              id: ++this.cueCounter,
              // start và end được gán để bám sát hiện tại mà không bị AudioQueue drop vì trễ
              start: Math.max(0, nowT - 0.5),
              end: nowT + Math.max(1.5, duration),
              origText: data.orig.trim(),
              text: (data.trans || data.orig).trim(),
              audioDataUrl: data.audio_b64 ? `data:audio/mp3;base64,${data.audio_b64}` : null
            };
            this._dispatchFinalCue(cue);
          }
        } catch (err) {
          console.warn("[ASR Bridge] Lỗi parse JSON từ server:", err);
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("Lỗi kết nối WebSocket tới ws://127.0.0.1:8765"));
        } else if (this.isActive) {
          this._emitStatus({ status: "error", error: "Mất kết nối server.py" });
        }
      };

      ws.onclose = () => {
        if (this.isActive) {
          this._emitStatus({ status: "error", error: "Server local đã đóng kết nối" });
        }
      };
    });
  }

  async _startAudioStream(video) {
    let nodes = videoAudioNodes.get(video);
    if (!nodes) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      let source;
      try {
        // Luôn ưu tiên createMediaElementSource vì không bao giờ bị CORS làm câm tiếng (silence) trên YouTube
        source = audioCtx.createMediaElementSource(video);
        source.connect(audioCtx.destination);
      } catch (_) {
        const captureFn = video.captureStream || video.mozCaptureStream;
        if (typeof captureFn === "function") {
          const stream = captureFn.call(video);
          source = audioCtx.createMediaStreamSource(stream);
        }
      }
      nodes = { audioCtx, source };
      videoAudioNodes.set(video, nodes);
    }

    const { audioCtx, source } = nodes;
    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => {});
    }

    const inputSampleRate = audioCtx.sampleRate;

    const handleAudioData = (inputFloat32) => {
      if (!this.isActive || this.isPaused) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (!this._video || this._video.paused || this._video.ended) return;

      const pcm16 = this._downsampleToPcm16(inputFloat32, inputSampleRate, TARGET_SAMPLE_RATE);
      if (pcm16.length > 0) {
        this.ws.send(pcm16.buffer);
      }
    };

    // Dùng AudioWorkletNode hiện đại thay thế ScriptProcessorNode (tránh deprecation warning và giật lag main thread)
    let usedWorklet = false;
    if (audioCtx.audioWorklet && chrome.runtime?.getURL) {
      try {
        const workletUrl = chrome.runtime.getURL("asr/vadWorklet.js");
        await audioCtx.audioWorklet.addModule(workletUrl);
        const workletNode = new AudioWorkletNode(audioCtx, "asr-stream-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1
        });

        workletNode.port.onmessage = (e) => {
          handleAudioData(e.data);
        };

        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        source.connect(workletNode);
        workletNode.connect(silentGain);
        silentGain.connect(audioCtx.destination);

        this._workletNode = workletNode;
        this._silentGain = silentGain;
        usedWorklet = true;
      } catch (err) {
        console.warn("[ASR Bridge] Fallback sang ScriptProcessor:", err);
      }
    }

    // Fallback sang ScriptProcessor chỉ khi trình duyệt cũ không tải được worklet
    if (!usedWorklet) {
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        handleAudioData(e.inputBuffer.getChannelData(0));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      this._processor = processor;
    }
  }

  _downsampleToPcm16(float32Buffer, fromRate, toRate) {
    if (fromRate === toRate) {
      const out = new Int16Array(float32Buffer.length);
      for (let i = 0; i < float32Buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Buffer[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return out;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.floor(float32Buffer.length / ratio);
    const out = new Int16Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const idx = i * ratio;
      const idx0 = Math.floor(idx);
      const idx1 = Math.min(idx0 + 1, float32Buffer.length - 1);
      const frac = idx - idx0;
      const vol = this._video ? this._video.volume : 1.0;
      const gain = vol > 0.05 ? Math.min(5.0, 1.5 / vol) : 1.5;
      const sample = (float32Buffer[idx0] * (1 - frac) + float32Buffer[idx1] * frac) * gain;
      const s = Math.max(-1, Math.min(1, sample));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  _dispatchFinalCue(cue) {
    if (!this.isActive) return;
    if (this._video && this._video.ended) return;

    this.cues.push(cue);
    if (this.cues.length > 500) this.cues.shift();

    this.onCueReady(cue);
    window.dispatchEvent(new CustomEvent("yt-dubber-asr-cue", { detail: cue }));
  }

  _handleVideoReset() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "reset" }));
    }
  }

  stop() {
    this.isActive = false;

    if (this._workletNode) {
      try {
        this._workletNode.disconnect();
        this._workletNode.port.onmessage = null;
      } catch {}
      this._workletNode = null;
    }

    if (this._silentGain) {
      try { this._silentGain.disconnect(); } catch {}
      this._silentGain = null;
    }

    if (this._processor) {
      try { this._processor.disconnect(); } catch {}
      this._processor = null;
    }

    if (this._video) {
      this._video.removeEventListener("seeking", this._onVideoSeeking);
      this._video.removeEventListener("ended", this._onVideoEnded);
      this._video = null;
    }

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    this._emitStatus({ status: "stopped" });
  }

  _emitStatus(statusObj) {
    this.onStatus(statusObj);
    window.dispatchEvent(new CustomEvent("yt-dubber-asr-status", { detail: statusObj }));
  }
}

window.AsrBridge = AsrBridge;
