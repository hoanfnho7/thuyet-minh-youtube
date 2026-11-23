/**
 * asr/vadWorklet.js
 * Chạy trên AudioWorklet thread riêng (Background Audio Rendering Thread)
 */

class VadCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(512);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    let readIdx = 0;
    while (readIdx < channel.length) {
      const space = 512 - this._offset;
      const toCopy = Math.min(space, channel.length - readIdx);
      this._buffer.set(channel.subarray(readIdx, readIdx + toCopy), this._offset);
      this._offset += toCopy;
      readIdx += toCopy;

      if (this._offset >= 512) {
        const out = new Float32Array(this._buffer);
        this.port.postMessage(out, [out.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}

class AsrStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    let readIdx = 0;
    while (readIdx < channel.length) {
      const space = 2048 - this._offset;
      const toCopy = Math.min(space, channel.length - readIdx);
      this._buffer.set(channel.subarray(readIdx, readIdx + toCopy), this._offset);
      this._offset += toCopy;
      readIdx += toCopy;

      if (this._offset >= 2048) {
        const out = new Float32Array(this._buffer);
        this.port.postMessage(out, [out.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("vad-capture-processor", VadCaptureProcessor);
registerProcessor("asr-stream-processor", AsrStreamProcessor);
