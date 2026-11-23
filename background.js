(() => {
  "use strict";

  const EDGE_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.3650.75";

  function sanitizeMinimal(raw) {
    if (!raw) return "";
    return String(raw)
      .normalize("NFC")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/[♪♫♬♩🎵🎶]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function translateSingle(text, targetLang = "vi", googleApiKey = "") {
    const q = text.trim();
    if (!q) return "";
    const tl = targetLang.toLowerCase().startsWith("zh") ? targetLang : targetLang.split("-")[0] || "vi";

    if (googleApiKey) {
      try {
        const res = await fetchWithTimeout(
          `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q, target: tl, format: "text" })
          },
          5000
        );
        if (res.ok) {
          const json = await res.json();
          const translated = json?.data?.translations?.[0]?.translatedText;
          if (translated) return translated;
        }
      } catch {}
    }

    const params = new URLSearchParams({ client: "gtx", sl: "auto", tl, dt: "t", q });
    const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchWithTimeout(url, {}, 5000);
        if (!res.ok) throw new Error(`Translate HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data?.[0]) ? data[0].map((item) => item[0]).join("") : q;
      } catch (err) {
        if (attempt === 1) throw err;
        await sleep(200);
      }
    }
    return q;
  }

  async function translateBatch(texts, targetLang = "vi", googleApiKey = "") {
    if (!Array.isArray(texts) || !texts.length) return [];
    const sanitized = texts.map((t) => String(t || "").replace(/\r?\n+/g, " ").trim());
    if (sanitized.length === 1) {
      return [await translateSingle(sanitized[0], targetLang, googleApiKey)];
    }

    const joined = sanitized.join("\n");
    if (joined.length <= 800) {
      try {
        const translatedBlock = await translateSingle(joined, targetLang, googleApiKey);
        const lines = translatedBlock
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === sanitized.length) {
          return lines;
        }
      } catch {}
    }

    const results = new Array(sanitized.length).fill(null);
    try {
      const taggedBlock = sanitized.map((t, i) => `[#${i}#] ${t}`).join("\n");
      const translatedBlock = await translateSingle(taggedBlock, targetLang, googleApiKey);
      const regex = /\[#\s*(\d+)\s*#\]([\s\S]*?)(?=\[#\s*\d+\s*#\]|$)/g;
      let match;
      while ((match = regex.exec(translatedBlock)) !== null) {
        const idx = parseInt(match[1], 10);
        const content = match[2].replace(/\s+/g, " ").trim();
        if (idx >= 0 && idx < results.length && content) {
          results[idx] = content;
        }
      }
    } catch {}

    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        results[i] = await translateSingle(sanitized[i], targetLang, googleApiKey).catch(() => sanitized[i]);
        if (i < results.length - 1) await sleep(80);
      }
    }

    return results;
  }

  const MS_AUTH_URL = "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";
  let cachedAuth = null;
  let authInflight = null;

  function parseJwtExp(token) {
    try {
      const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
      const parts = raw.split(".");
      if (parts.length !== 3) return Date.now() + 540000;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(4 * Math.ceil(parts[1].length / 4), "=");
      const payload = JSON.parse(atob(b64));
      if (typeof payload.exp === "number") return payload.exp * 1000;
    } catch {}
    return Date.now() + 540000;
  }

  async function getMicrosoftAuth() {
    if (cachedAuth && cachedAuth.expiredAt > Date.now() + 180000) return cachedAuth;
    if (authInflight) return authInflight;

    authInflight = (async () => {
      try {
        const traceId = crypto.randomUUID().replace(/-/g, "");
        const dateStr = new Date().toUTCString().replace(/GMT/, "").trim().toLowerCase() + " gmt";
        const encodedUrl = encodeURIComponent(MS_AUTH_URL.split("://")[1]);
        const signStr = `MSTranslatorAndroidApp${encodedUrl}${dateStr}${traceId}`.toLowerCase();

        const rawSecret = atob("oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==");
        const keyBytes = new Uint8Array(rawSecret.length);
        for (let i = 0; i < rawSecret.length; i++) keyBytes[i] = rawSecret.charCodeAt(i);

        const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signStr));
        const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

        const res = await fetchWithTimeout(
          MS_AUTH_URL,
          {
            method: "POST",
            headers: {
              "Accept-Language": "zh-Hans",
              "X-ClientVersion": "4.0.530a 5fe1dc6c",
              "X-UserId": "0f04d16a175c411e",
              "X-HomeGeographicRegion": "zh-Hans-CN",
              "X-ClientTraceId": traceId,
              "X-MT-Signature": `MSTranslatorAndroidApp::${sigBase64}::${dateStr}::${traceId}`,
              "User-Agent": EDGE_UA,
              "Content-Type": "application/json; charset=utf-8"
            },
            body: ""
          },
          5000
        );
        if (!res.ok) throw new Error(`MS Auth HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.t || !data?.r) throw new Error("Invalid MS Auth payload");

        cachedAuth = {
          token: data.t,
          region: data.r,
          expiredAt: parseJwtExp(data.t)
        };
        return cachedAuth;
      } catch (err) {
        cachedAuth = null;
        throw err;
      } finally {
        authInflight = null;
      }
    })();

    return authInflight;
  }

  async function ttsViaMicrosoftRest(ssml) {
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const auth = await getMicrosoftAuth();
        const res = await fetchWithTimeout(
          `https://${auth.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            method: "POST",
            headers: {
              Authorization: auth.token,
              "Content-Type": "application/ssml+xml",
              "User-Agent": EDGE_UA,
              "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3"
            },
            body: ssml
          },
          5500
        );
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 0) return buf;
          throw new Error("Empty MS REST audio");
        }
        if (res.status === 401 || res.status === 403) cachedAuth = null;
        lastErr = new Error(`MS REST HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
      }
      if (attempt < 1) await sleep(150);
    }
    throw lastErr || new Error("MS REST failed");
  }

  function splitTextChunks(text, maxLen = 180) {
    if (text.length <= maxLen) return [text];
    const parts = [];
    let rest = text;
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(". ", maxLen);
      if (cut < 40) cut = rest.lastIndexOf(", ", maxLen);
      if (cut < 40) cut = rest.lastIndexOf(" ", maxLen);
      if (cut < 20) cut = maxLen;
      parts.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  async function ttsViaGoogleFree(text, lang = "vi") {
    const tl = lang.toLowerCase().startsWith("zh") ? "zh-CN" : lang.split("-")[0] || "vi";
    const chunks = splitTextChunks(text, 180);
    const buffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(tl)}&client=gtx&q=${encodeURIComponent(chunk)}`;
      const res = await fetchWithTimeout(url, {}, 5000);
      if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
      buffers.push(await res.arrayBuffer());
    }

    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const b of buffers) {
      merged.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }
    return merged.buffer;
  }

  const WAVENET_MAP = {
    vi: { code: "vi-VN", male: "vi-VN-Wavenet-D", female: "vi-VN-Wavenet-A" },
    en: { code: "en-US", male: "en-US-Wavenet-D", female: "en-US-Wavenet-F" },
    es: { code: "es-ES", male: "es-ES-Wavenet-B", female: "es-ES-Wavenet-C" },
    pt: { code: "pt-BR", male: "pt-BR-Wavenet-B", female: "pt-BR-Wavenet-A" },
    fr: { code: "fr-FR", male: "fr-FR-Wavenet-B", female: "fr-FR-Wavenet-A" },
    de: { code: "de-DE", male: "de-DE-Wavenet-B", female: "de-DE-Wavenet-A" },
    ru: { code: "ru-RU", male: "ru-RU-Wavenet-B", female: "ru-RU-Wavenet-A" },
    ja: { code: "ja-JP", male: "ja-JP-Wavenet-D", female: "ja-JP-Wavenet-B" },
    ko: { code: "ko-KR", male: "ko-KR-Wavenet-C", female: "ko-KR-Wavenet-A" },
    "zh-CN": { code: "cmn-CN", male: "cmn-CN-Wavenet-B", female: "cmn-CN-Wavenet-A" },
    "zh-TW": { code: "cmn-TW", male: "cmn-TW-Wavenet-B", female: "cmn-TW-Wavenet-A" },
    hi: { code: "hi-IN", male: "hi-IN-Wavenet-B", female: "hi-IN-Wavenet-A" },
    id: { code: "id-ID", male: "id-ID-Wavenet-B", female: "id-ID-Wavenet-A" },
    th: { code: "th-TH", male: "th-TH-Standard-A", female: "th-TH-Standard-A" },
    ar: { code: "ar-XA", male: "ar-XA-Wavenet-B", female: "ar-XA-Wavenet-A" }
  };

  function resolveWaveNetVoice(voiceId, lang = "vi") {
    if (voiceId === "google-wavenet-a") return { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" };
    if (voiceId === "google-wavenet-b") return { languageCode: "vi-VN", name: "vi-VN-Wavenet-B" };
    if (voiceId === "google-wavenet-c") return { languageCode: "vi-VN", name: "vi-VN-Wavenet-C" };
    if (voiceId === "google-wavenet-d") return { languageCode: "vi-VN", name: "vi-VN-Wavenet-D" };
    const entry = WAVENET_MAP[lang] || WAVENET_MAP[lang.split("-")[0]] || WAVENET_MAP.vi;
    const isFemale = voiceId.endsWith("-female");
    return { languageCode: entry.code, name: isFemale ? entry.female : entry.male };
  }

  async function ttsViaGoogleCloud(text, voiceId, lang, apiKey) {
    const { languageCode, name } = resolveWaveNetVoice(voiceId, lang);
    const res = await fetchWithTimeout(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text.slice(0, 2000) },
          voice: { languageCode, name },
          audioConfig: { audioEncoding: "MP3", speakingRate: 1.08 }
        })
      },
      6500
    );
    if (!res.ok) throw new Error(`Google Cloud TTS HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.audioContent) throw new Error("Empty Google Cloud audio");
    return `data:audio/mpeg;base64,${json.audioContent}`;
  }

  async function ttsViaOpenAI(text, apiKey) {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "nova",
          response_format: "mp3"
        })
      },
      8000
    );
    if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  function arrayBufferToBase64Audio(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return `data:audio/mpeg;base64,${btoa(binary)}`;
  }

  async function synthesizeSpeech(rawText, voice = "vi-VN-NamMinhNeural", lang = "vi") {
    const text = sanitizeMinimal(rawText);
    if (!text) return null;

    const cfg = await chrome.storage.local.get(["byokConfig"]);
    const openaiKey = (cfg?.byokConfig?.openaiApiKey || "").trim();
    const googleKey = (cfg?.byokConfig?.googleApiKey || "").trim();

    if (voice === "openai-nova" && openaiKey) {
      const buf = await ttsViaOpenAI(text, openaiKey);
      return { data: arrayBufferToBase64Audio(buf), engine: "openai" };
    }

    if (voice === "google-free") {
      const buf = await ttsViaGoogleFree(text, lang);
      return { data: arrayBufferToBase64Audio(buf), engine: "google-free" };
    }

    if (voice.startsWith("google-wavenet-") && googleKey) {
      const data = await ttsViaGoogleCloud(text, voice, lang, googleKey);
      return { data, engine: "google-wavenet" };
    }

    const xmlLang = voice.split("-").slice(0, 2).join("-") || "vi-VN";
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${xmlLang}'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;

    try {
      const buf = await ttsViaMicrosoftRest(ssml);
      return { data: arrayBufferToBase64Audio(buf), engine: "edge-neural" };
    } catch {
      const buf = await ttsViaGoogleFree(text, lang);
      return { data: arrayBufferToBase64Audio(buf), engine: "google-free" };
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Keepalive ping để Chrome MV3 không kill Service Worker khi xem video dài
    if (msg.action === "ping") {
      sendResponse({ success: true });
      return false;
    }

    if (msg.action === "translateBatch") {
      chrome.storage.local.get(["byokConfig"], (res) => {
        const gKey = (res?.byokConfig?.googleApiKey || "").trim();
        translateBatch(msg.texts, msg.targetLang || "vi", gKey)
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      });
      return true;
    }

    if (msg.action === "tts") {
      synthesizeSpeech(msg.text, msg.voice, msg.lang)
        .then((result) => sendResponse({ success: true, data: result?.data || null, engine: result?.engine || "unknown" }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });
})();