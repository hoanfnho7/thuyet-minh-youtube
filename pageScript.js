(() => {
  "use strict";
  if (window.__YT_DUB_PAGE_HOOKED__) return;
  window.__YT_DUB_PAGE_HOOKED__ = true;

  const timedtextStore = new Map();
  const tracksStore = new Map();
  const defaultTrackIdxStore = new Map();
  const transLangsStore = new Map();
  const ignoredUrls = new Set();
  const waiters = new Set();

  function isExpired(urlStr) {
    try {
      const exp = new URL(urlStr, location.origin).searchParams.get("expire");
      if (!exp) return false;
      const ms = Number(exp) * 1000;
      return Number.isFinite(ms) && ms > 0 && ms <= Date.now();
    } catch {
      return false;
    }
  }

  function recordTimedtext(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return;
    let fullUrl = "";
    try {
      const u = new URL(rawUrl, location.origin);
      if (!u.hostname.endsWith("youtube.com") || u.pathname !== "/api/timedtext") return;
      fullUrl = u.toString();
    } catch {
      return;
    }

    if (ignoredUrls.has(fullUrl) || isExpired(fullUrl)) return;
    const videoId = new URL(fullUrl).searchParams.get("v");
    if (!videoId) return;

    const existing = timedtextStore.get(videoId);
    if (existing && existing.url.includes("pot=") && !fullUrl.includes("pot=")) return;

    const entry = { url: fullUrl, at: Date.now() };
    timedtextStore.set(videoId, entry);
    waiters.forEach((fn) => fn(videoId, entry));
  }

  function extractPlayerData(data) {
    if (!data || typeof data !== "object") return;
    const candidates = [data, data.playerResponse];
    if (Array.isArray(data.entries)) {
      data.entries.forEach((e) => e?.playerResponse && candidates.push(e.playerResponse));
    }
    for (const p of candidates) {
      const vid = p?.videoDetails?.videoId;
      const renderer = p?.captions?.playerCaptionsTracklistRenderer;
      const tracks = renderer?.captionTracks;
      if (vid && Array.isArray(tracks) && tracks.length > 0) {
        tracksStore.set(vid, tracks);
        const audioTracks = renderer?.audioTracks;
        if (Array.isArray(audioTracks) && audioTracks.length > 0) {
          const defIdx = audioTracks[0]?.defaultCaptionTrackIndex;
          if (typeof defIdx === "number" && tracks[defIdx]) {
            defaultTrackIdxStore.set(vid, defIdx);
          }
        }
        const langs = renderer?.translationLanguages;
        if (Array.isArray(langs)) {
          transLangsStore.set(vid, langs.map((l) => l?.languageCode).filter(Boolean));
        }
      }
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = "";
    try {
      url = typeof input === "string" ? input : input?.url || String(input);
    } catch {}
    recordTimedtext(url);
    const res = origFetch.call(this, input, init);
    if (url.includes("/youtubei/v1/player") || url.includes("/youtubei/v1/reel/")) {
      res.then((r) => r.clone().json().then(extractPlayerData).catch(() => {})).catch(() => {});
    }
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ytDubUrl = String(url);
    recordTimedtext(this.__ytDubUrl);
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const url = this.__ytDubUrl || "";
    if (url.includes("/youtubei/v1/player") || url.includes("/youtubei/v1/reel/")) {
      this.addEventListener("load", () => {
        try {
          extractPlayerData(JSON.parse(this.responseText));
        } catch {}
      });
    }
    return origSend.call(this, body);
  };

  function getPlayer() {
    if (location.pathname.includes("/shorts/")) {
      const active = document.querySelector(
        "ytd-reel-video-renderer[is-active] #movie_player, ytd-reel-video-renderer[is-active] .html5-video-player"
      );
      if (active && typeof active.setOption === "function") return active;
    }
    const mp = document.getElementById("movie_player");
    return mp && typeof mp.setOption === "function" ? mp : null;
  }

  function getCurrentVideoId() {
    const v = new URLSearchParams(location.search).get("v");
    if (v) return v;
    const m = location.pathname.match(/\/shorts\/([^/?#]+)/);
    if (m) return m[1];
    return getPlayer()?.getVideoData?.()?.video_id || null;
  }

  function scanExisting(expectedVideoId) {
    try {
      const initPr = window.ytInitialPlayerResponse;
      if (initPr && (!expectedVideoId || initPr?.videoDetails?.videoId === expectedVideoId)) {
        extractPlayerData(initPr);
      }
      const player = getPlayer();
      const pr = player?.getPlayerResponse?.();
      if (pr && (!expectedVideoId || pr?.videoDetails?.videoId === expectedVideoId)) {
        extractPlayerData(pr);
      }
      const entries = performance.getEntriesByType?.("resource") || [];
      for (const e of entries) {
        if (e.name?.includes("/api/timedtext")) recordTimedtext(e.name);
      }
    } catch {}
  }

  function getTrackLabel(track) {
    if (track?.name?.simpleText) return track.name.simpleText;
    if (Array.isArray(track?.name?.runs)) {
      return track.name.runs.map((r) => r.text || "").join("").trim();
    }
    return track?.languageCode || "Unknown";
  }

  function decodeHtmlEntities(str) {
    return str
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function buildCaptionUrl(baseUrl, capturedUrl, opts = {}) {
    const target = new URL(baseUrl, location.origin);
    if (capturedUrl) {
      const cap = new URL(capturedUrl, location.origin);
      const sameVideo = !target.searchParams.get("v") || target.searchParams.get("v") === cap.searchParams.get("v");
      const skip = new Set(["lang", "kind", "tlang", "vssId", "name", "variant"]);
      cap.searchParams.forEach((val, key) => {
        if (skip.has(key)) return;
        if (!sameVideo && (key === "v" || key === "signature" || key === "sig" || key === "sparams")) return;
        target.searchParams.set(key, val);
      });
    }
    target.searchParams.delete("vssId");
    target.searchParams.delete("name");
    if (opts.lang) target.searchParams.set("lang", opts.lang);
    if (opts.kind === "asr") target.searchParams.set("kind", "asr");
    else if (opts.kind === "") target.searchParams.delete("kind");
    if (opts.tlang) target.searchParams.set("tlang", opts.tlang);
    else target.searchParams.delete("tlang");
    target.searchParams.set("fmt", "json3");
    return target.toString();
  }

  function parseJson3(raw) {
    const data = JSON.parse(raw);
    const events = Array.isArray(data?.events) ? data.events : [];
    const segments = [];
    for (const ev of events) {
      if (!Array.isArray(ev?.segs) || typeof ev.tStartMs !== "number" || ev.aAppend === 1) continue;
      const joined = ev.segs.map((s) => s?.utf8 || "").join("");
      const text = decodeHtmlEntities(joined).replace(/\s+/g, " ").trim();
      if (!text) continue;
      const start = ev.tStartMs / 1000;
      const dur = typeof ev.dDurationMs === "number" ? ev.dDurationMs / 1000 : 2.5;
      segments.push({ start, end: start + Math.max(dur, 0.2), text });
    }
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].end > segments[i + 1].start) {
        segments[i].end = Math.max(segments[i].start + 0.15, segments[i + 1].start);
      }
    }
    return segments;
  }

  async function fetchJson3(url) {
    ignoredUrls.add(url);
    const res = await origFetch.call(window, url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().length < 10) throw new Error("Empty timedtext");
    const segs = parseJson3(text);
    if (!segs.length) throw new Error("0 segments parsed");
    return segs;
  }

  function waitForTimedtext(videoId, sinceTime, timeoutMs = 2500) {
    const existing = timedtextStore.get(videoId);
    if (existing && existing.at > sinceTime && !isExpired(existing.url)) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      const done = (val) => {
        clearTimeout(timer);
        waiters.delete(onHit);
        resolve(val);
      };
      const onHit = (vid, entry) => {
        if (vid === videoId && entry.at > sinceTime) done(entry);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      waiters.add(onHit);
    });
  }

  function getVideoTitle() {
    try {
      const player = getPlayer();
      const t = player?.getVideoData?.()?.title || window.ytInitialPlayerResponse?.videoDetails?.title;
      if (t) return String(t).trim();
    } catch {}
    return document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }

  async function getSubtitles(targetLang = "vi", preferredSourceVssId = "") {
    const videoId = getCurrentVideoId();
    if (!videoId) throw new Error("Không tìm thấy Video ID");

    let tracks = [];
    for (let i = 0; i < 12; i++) {
      scanExisting(videoId);
      tracks = tracksStore.get(videoId) || [];
      if (tracks.length > 0) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!tracks.length) throw new Error("Video này không có phụ đề");

    const baseLang = (l) => (l || "").toLowerCase().split(/[-_]/)[0];
    const targetBase = baseLang(targetLang);
    const isAsr = (t) => t.kind === "asr" || String(t.vssId || "").startsWith("a.");

    // 1. Chọn track ngôn ngữ gốc của video (dòng trên của song ngữ)
    let sourceTrack = null;
    if (preferredSourceVssId) {
      sourceTrack =
        tracks.find((t) => (t.vssId || t.languageCode) === preferredSourceVssId) ||
        tracks.find((t) => t.languageCode === preferredSourceVssId);
    }
    if (!sourceTrack) {
      const defIdx = defaultTrackIdxStore.get(videoId);
      if (typeof defIdx === "number" && tracks[defIdx]) sourceTrack = tracks[defIdx];
    }
    if (!sourceTrack) {
      const asrTrack = tracks.find(isAsr);
      if (asrTrack) {
        const asrBase = baseLang(asrTrack.languageCode);
        sourceTrack = tracks.find((t) => baseLang(t.languageCode) === asrBase && !isAsr(t)) || asrTrack;
      }
    }
    if (!sourceTrack) {
      sourceTrack = tracks.find((t) => baseLang(t.languageCode) === "en") || tracks[0];
    }

    // 2. Kiểm tra xem video có sẵn track phụ đề người dịch đúng ngôn ngữ đích (VD: tiếng Việt) không
    const nativeTargetTrack = tracks.find(
      (t) => baseLang(t.languageCode) === targetBase && !isAsr(t)
    );

    const sourceLang = sourceTrack.languageCode || "en";
    const selectedVssId = sourceTrack.vssId || sourceTrack.languageCode;
    const trackKind = isAsr(sourceTrack) ? "asr" : "";

    let captured = timedtextStore.get(videoId);
    if (captured && isExpired(captured.url)) captured = null;

    if (!captured) {
      const player = getPlayer();
      if (player) {
        let prevTrack = null;
        try {
          prevTrack = player.getOption?.("captions", "track");
        } catch {}
        const since = Date.now() - 10;
        try {
          player.loadModule?.("captions");
          player.setOption?.("captions", "track", { languageCode: sourceLang });
        } catch {}
        captured = await waitForTimedtext(videoId, since, 2500);
        try {
          player.setOption?.("captions", "track", prevTrack && prevTrack.languageCode ? prevTrack : {});
        } catch {}
      }
    }

    const alreadyInTarget = baseLang(sourceLang) === targetBase;
    const origUrl = buildCaptionUrl(sourceTrack.baseUrl, captured?.url || null, {
      lang: sourceLang,
      kind: trackKind
    });

    const segments = await fetchJson3(origUrl);

    // Nếu video đã có sẵn bản dịch tay tiếng Việt (khác track gốc), tải song song về để dùng luôn (0 tốn quota dịch)
    let nativeTargetSegments = null;
    if (!alreadyInTarget && nativeTargetTrack && nativeTargetTrack !== sourceTrack) {
      const targetUrl = buildCaptionUrl(nativeTargetTrack.baseUrl, captured?.url || null, {
        lang: nativeTargetTrack.languageCode,
        kind: ""
      });
      nativeTargetSegments = await fetchJson3(targetUrl).catch(() => null);
    }

    const availableTracks = tracks.map((t) => ({
      vssId: t.vssId || t.languageCode,
      languageCode: t.languageCode,
      label: getTrackLabel(t),
      isAuto: isAsr(t)
    }));

    return {
      segments,
      nativeTargetSegments,
      sourceLang,
      selectedVssId,
      availableTracks,
      videoTitle: getVideoTitle(),
      translatedByYouTube: alreadyInTarget
    };
  }

  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.data?.type !== "YT_DUB_GET_SUBTITLES") return;
    const { requestId, targetLang, sourceVssId } = e.data;
    try {
      const result = await getSubtitles(targetLang || "vi", sourceVssId || "");
      window.postMessage({ type: "YT_DUB_SUBTITLES_RESULT", requestId, success: true, ...result }, "*");
    } catch (err) {
      window.postMessage(
        { type: "YT_DUB_SUBTITLES_RESULT", requestId, success: false, error: err?.message || String(err) },
        "*"
      );
    }
  });
})();