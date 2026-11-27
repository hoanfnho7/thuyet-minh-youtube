(() => {
  "use strict";
  if (window.__YT_DUB_CONTENT_LOADED__) return;
  window.__YT_DUB_CONTENT_LOADED__ = true;

  const FALLBACK_EN = {
    closePanel: "Close panel",
    sourceSubLabel: "Source sub",
    sourceAutoDefault: "Auto (Video original)",
    autoTag: "Auto",
    targetLangLabel: "Dub to",
    voiceLabel: "Voice",
    speedLabel: "Speech rate",
    speedDefaultBtn: "Default",
    speedDefaultTooltip: "Automatically match video speaking pace",
    speedAutoVal: "Auto",
    origVolLabel: "Original volume",
    autoStartLabel: "Auto-start on video",
    btnStart: "Start Dubbing (Alt+Shift+D)",
    btnStop: "Stop Dubbing (Alt+Shift+D)",
    btnScript: "Bilingual Script (Alt+Shift+V)",
    statusReady: "Ready",
    statusStopped: "Stopped",
    statusReloadRequired: "Extension updated — Please reload the page",
    statusReading: "Dubbing {current}/{total}",
    statusAdPaused: "Paused (Ad playing)",
    statusPreparing: "Preparing line {index}...",
    statusTranslatingInit: "Translating opening lines...",
    statusSynthesizingInit: "Generating AI voice...",
    statusFetchingSub: "Fetching subtitles...",
    statusNoVideo: "Video player not found",
    statusEmptySub: "Subtitles are empty",
    statusReadyCount: "Ready ({total} lines)",
    scriptHeaderDefault: "Bilingual Script",
    scriptHeaderLangs: "Bilingual ({src} → {dst})",
    errNoVideoId: "Video ID not found",
    errNoSubtitles: "No subtitles available for this video",
    errFetchSubtitles: "Failed to load subtitles",
    errTimeoutSubtitles: "Subtitle request timed out",
    voiceGoogleStd: "Google - Standard"
  };

  function t(key, vars = {}) {
    let msg = "";
    try {
      msg = chrome.i18n?.getMessage(key) || "";
    } catch {}
    if (!msg) msg = FALLBACK_EN[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replaceAll(`{${k}}`, String(v));
    }
    return msg;
  }

  function mapSubError(rawMsg) {
    if (rawMsg === "ERR_NO_VIDEO_ID") return t("errNoVideoId");
    if (rawMsg === "ERR_NO_SUBTITLES") return t("errNoSubtitles");
    if (rawMsg === "ERR_FETCH_SUBTITLES") return t("errFetchSubtitles");
    if (rawMsg === "ERR_TIMEOUT_SUBTITLES") return t("errTimeoutSubtitles");
    return rawMsg || t("errFetchSubtitles");
  }

const LANGUAGE_CONFIG = [
    {
      code: "en",
      label: "English",
      voices: [
        { id: "en-US-AndrewNeural", label: "Edge - Andrew (Male)" },
        { id: "en-US-AvaNeural", label: "Edge - Ava (Female)" }
      ]
    },
    {
      code: "vi",
      label: "Tiếng Việt",
      voices: [
        { id: "vi-VN-NamMinhNeural", label: "Edge - Nam Minh (Male)" },
        { id: "vi-VN-HoaiMyNeural", label: "Edge - Hoài My (Female)" }
      ]
    },
    {
      code: "es",
      label: "Español (Spanish)",
      voices: [
        { id: "es-ES-AlvaroNeural", label: "Edge - Alvaro (Male)" },
        { id: "es-MX-DaliaNeural", label: "Edge - Dalia (Female)" }
      ]
    },
    {
      code: "pt",
      label: "Português (Portuguese)",
      voices: [
        { id: "pt-BR-AntonioNeural", label: "Edge - Antonio (Male)" },
        { id: "pt-BR-FranciscaNeural", label: "Edge - Francisca (Female)" }
      ]
    },
    {
      code: "fr",
      label: "Français (French)",
      voices: [
        { id: "fr-FR-HenriNeural", label: "Edge - Henri (Male)" },
        { id: "fr-FR-DeniseNeural", label: "Edge - Denise (Female)" }
      ]
    },
    {
      code: "de",
      label: "Deutsch (German)",
      voices: [
        { id: "de-DE-ConradNeural", label: "Edge - Conrad (Male)" },
        { id: "de-DE-KatjaNeural", label: "Edge - Katja (Female)" }
      ]
    },
    {
      code: "ru",
      label: "Русский (Russian)",
      voices: [
        { id: "ru-RU-DmitryNeural", label: "Edge - Dmitry (Male)" },
        { id: "ru-RU-SvetlanaNeural", label: "Edge - Svetlana (Female)" }
      ]
    },
    {
      code: "ja",
      label: "日本語 (Japanese)",
      voices: [
        { id: "ja-JP-KeitaNeural", label: "Edge - Keita (Male)" },
        { id: "ja-JP-NanamiNeural", label: "Edge - Nanami (Female)" }
      ]
    },
    {
      code: "ko",
      label: "한국어 (Korean)",
      voices: [
        { id: "ko-KR-InJoonNeural", label: "Edge - InJoon (Male)" },
        { id: "ko-KR-SunHiNeural", label: "Edge - SunHi (Female)" }
      ]
    },
    {
      code: "zh-CN",
      label: "简体中文 (Chinese Simp.)",
      voices: [
        { id: "zh-CN-YunxiNeural", label: "Edge - Yunxi (Male)" },
        { id: "zh-CN-XiaoxiaoNeural", label: "Edge - Xiaoxiao (Female)" }
      ]
    },
    {
      code: "zh-TW",
      label: "繁體中文 (Chinese Trad.)",
      voices: [
        { id: "zh-TW-YunJheNeural", label: "Edge - YunJhe (Male)" },
        { id: "zh-TW-HsiaoChenNeural", label: "Edge - HsiaoChen (Female)" }
      ]
    },
    {
      code: "hi",
      label: "हिन्दी (Hindi)",
      voices: [
        { id: "hi-IN-MadhurNeural", label: "Edge - Madhur (Male)" },
        { id: "hi-IN-SwaraNeural", label: "Edge - Swara (Female)" }
      ]
    },
    {
      code: "id",
      label: "Bahasa Indonesia",
      voices: [
        { id: "id-ID-ArdiNeural", label: "Edge - Ardi (Male)" },
        { id: "id-ID-GadisNeural", label: "Edge - Gadis (Female)" }
      ]
    },
    {
      code: "th",
      label: "ไทย (Thai)",
      voices: [
        { id: "th-TH-NiwatNeural", label: "Edge - Niwat (Male)" },
        { id: "th-TH-PremwadeeNeural", label: "Edge - Premwadee (Female)" }
      ]
    },
    {
      code: "ar",
      label: "العربية (Arabic)",
      voices: [
        { id: "ar-SA-HamedNeural", label: "Edge - Hamed (Male)" },
        { id: "ar-SA-ZariyahNeural", label: "Edge - Zariyah (Female)" }
      ]
    }
  ];

  const VOICES = Object.fromEntries(
    LANGUAGE_CONFIG.map((item) => [
      item.code,
      [...item.voices, { id: "google-free", label: t("voiceGoogleStd") }]
    ])
  );

  function getDefaultTargetLang() {
    try {
      const ui = (chrome.i18n?.getUILanguage?.() || navigator.language || "en").toLowerCase();
      if (ui.startsWith("zh-tw") || ui.startsWith("zh-hk") || ui.startsWith("zh-hant")) return "zh-TW";
      if (ui.startsWith("zh")) return "zh-CN";
      const base = ui.split(/[-_]/)[0];
      if (LANGUAGE_CONFIG.some((l) => l.code === base)) return base;
    } catch {}
    return "en";
  }

  const DEFAULT_LANG = getDefaultTargetLang();
  const DEFAULT_VOICE = (VOICES[DEFAULT_LANG] || VOICES.en)[0].id;

  const PRE_ENQUEUE_AHEAD_SEC = 5.0;
  const STALE_LOADING_MS = 14000;
  const audioQueue = new window.DubCore.DubAudioQueue();

  const state = {
    enabled: false,
    panelOpen: false,
    scriptOpen: false,
    contextDead: false,
    lang: DEFAULT_LANG,
    sourceLang: "en",
    selectedSourceVssId: "",
    availableTracks: [],
    voice: DEFAULT_VOICE,
    autoSpeed: true,
    speed: 1.25,
    origVolume: 0.25,
    autoStart: false,
    preparingSession: false,
    savedPrevMuted: null,
    storageLoaded: false,
    hasOpenAiKey: false,
    hasGoogleKey: false,
    segments: [],
    translatedMap: new Map(),
    translatingMap: new Map(),
    translateCooldownUntil: 0,
    audioCache: new Map(),
    enqueuedSet: new Set(),
    MAX_CACHE: 160,
    playingIndex: -1,
    activeAudio: null,
    video: null,
    savedUserVolume: null,
    syncInterval: null,
    keepaliveInterval: null,
    sessionToken: 0,
    alreadyTranslated: false,
    userInteractingScriptUntil: 0,
    karaokeRaf: null,
    karaokeOrigWords: [],
    karaokeTransWords: [],
    karaokeOrigIdx: -1,
    karaokeTransIdx: -1
  };

  let domObserver = null;
  let injectTimer = null;

  function getProviderSpeedFactor(voiceId, engine) {
    if (engine === "google-free" || voiceId === "google-free") return 1.05;
    if (voiceId.startsWith("google-wavenet-") || voiceId === "openai-nova") return 0.95;
    return 0.9;
  }

  function applyAudioSettings() {
    audioQueue.setVolume(1.0);
    audioQueue.setAutoPacing(state.autoSpeed);
    audioQueue.setBaseSpeed(state.speed);
    audioQueue.setProviderSpeedMultiplier(getProviderSpeedFactor(state.voice));
    if (state.video) audioQueue.setVideoPlaybackRate(state.video.playbackRate || 1);
  }

  function startKeepalive() {
    stopKeepalive();
    state.keepaliveInterval = setInterval(() => {
      if (!state.enabled || !checkContextAlive()) return;
      try {
        chrome.runtime.sendMessage({ action: "ping" }, () => {
          void chrome.runtime?.lastError;
        });
      } catch {}
    }, 25000);
  }

  function stopKeepalive() {
    if (state.keepaliveInterval) {
      clearInterval(state.keepaliveInterval);
      state.keepaliveInterval = null;
    }
  }

  function syncOriginalVideoVolume() {
    if (!state.video) return;
    if (state.enabled && !isAdPlaying()) {
      if (state.savedUserVolume === null) {
        state.savedUserVolume = state.video.volume > 0 ? state.video.volume : 1;
      }
      const target = Math.max(0, Math.min(1, state.origVolume));
      if (Math.abs(state.video.volume - target) > 0.01) {
        state.video.volume = target;
      }
    } else if (state.savedUserVolume !== null) {
      state.video.volume = state.savedUserVolume;
      if (!state.enabled) state.savedUserVolume = null;
    }
  }

  function onVolumeChange() {
    if (!state.video) return;
    if (state.enabled && !isAdPlaying()) {
      const target = Math.max(0, Math.min(1, state.origVolume));
      if (Math.abs(state.video.volume - target) > 0.02) {
        state.video.volume = target;
      }
    } else {
      state.savedUserVolume = state.video.volume;
    }
  }

  audioQueue.onChunkStart = (item, audio) => {
    state.playingIndex = item.index;
    state.activeAudio = audio;
    const cached = state.audioCache.get(item.index);
    if (cached?.engine) {
      audioQueue.setProviderSpeedMultiplier(getProviderSpeedFactor(state.voice, cached.engine));
    }
    syncOriginalVideoVolume();
    highlightScriptItem(item.index);
    startKaraokeLoop(item.index, audio);
    setStatus(t("statusReading", { current: item.index + 1, total: state.segments.length }), "#34d399");
  };

  audioQueue.onChunkEnd = (item) => {
    if (state.playingIndex === item?.index) {
      state.playingIndex = -1;
      state.activeAudio = null;
      stopKaraokeLoop();
    }
  };

  function checkContextAlive() {
    if (state.contextDead) return false;
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) return true;
    } catch {}
    handleContextInvalidated();
    return false;
  }

  function endPreparing(video = state.video) {
    state.preparingSession = false;
    if (video && state.savedPrevMuted !== null) {
      video.muted = state.savedPrevMuted;
    }
    state.savedPrevMuted = null;
  }

  function handleContextInvalidated() {
    if (state.contextDead) return;
    state.contextDead = true;
    state.enabled = false;
    state.sessionToken++;
    endPreparing();
    stopSyncLoop();
    stopKeepalive();
    stopAudioAll();
    syncOriginalVideoVolume();
    clearAudioCache();
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (injectTimer) {
      clearTimeout(injectTimer);
      injectTimer = null;
    }
    syncUI();
    setStatus(t("statusReloadRequired"), "#fbbf24");
  }

  function safeSendMessage(payload, timeoutMs = 12000) {
    if (!checkContextAlive()) return Promise.reject(new Error("Extension context invalidated"));
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`${payload?.action || "msg"} timed out (${timeoutMs}ms)`));
        }
      }, timeoutMs);

      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const lastErr = chrome.runtime?.lastError;
          if (lastErr) {
            if (lastErr.message?.includes("context invalidated")) handleContextInvalidated();
            return reject(new Error(lastErr.message));
          }
          resolve(response);
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          handleContextInvalidated();
          reject(err);
        }
      }
    });
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "className") node.className = v;
      else if (k === "textContent") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const child of children) {
      if (typeof child === "string") node.appendChild(document.createTextNode(child));
      else if (child) node.appendChild(child);
    }
    return node;
  }

  function createHeadphoneSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "22");
    svg.setAttribute("height", "22");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const p1 = document.createElementNS(ns, "path");
    p1.setAttribute("d", "M3 18v-6a9 9 0 0 1 18 0v6");
    const p2 = document.createElementNS(ns, "path");
    p2.setAttribute(
      "d",
      "M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"
    );
    svg.appendChild(p1);
    svg.appendChild(p2);
    return svg;
  }

  function isWatchOrShortsPage() {
    return location.pathname === "/watch" || location.pathname.startsWith("/shorts/");
  }

  function loadStorage() {
    if (!checkContextAlive()) return;
    try {
      chrome.storage?.local?.get(["ytDubSettings", "byokConfig"], (res) => {
        if (!checkContextAlive()) return;
        if (res?.ytDubSettings) {
          const savedLang = res.ytDubSettings.lang || DEFAULT_LANG;
          const fallbackVoice = (VOICES[savedLang] || VOICES.en)[0].id;
          Object.assign(state, {
            lang: savedLang,
            voice: res.ytDubSettings.voice || fallbackVoice,
            autoSpeed: res.ytDubSettings.autoSpeed !== undefined ? Boolean(res.ytDubSettings.autoSpeed) : true,
            speed: res.ytDubSettings.speed || 1.25,
            origVolume: res.ytDubSettings.origVolume ?? 0.25,
            autoStart: Boolean(res.ytDubSettings.autoStart)
          });
        }
        state.storageLoaded = true;
        state.hasOpenAiKey = Boolean(res?.byokConfig?.openaiApiKey?.trim());
        state.hasGoogleKey = Boolean(res?.byokConfig?.googleApiKey?.trim());
        applyAudioSettings();
        populateVoices();
        syncUI();

        if (state.autoStart && !state.enabled && isWatchOrShortsPage()) {
          state.enabled = true;
          syncUI();
          startSession({ fromNavigation: true });
        }
      });
    } catch {
      handleContextInvalidated();
    }
  }

  function saveSettings() {
    if (!checkContextAlive()) return;
    try {
      chrome.storage?.local?.set({
        ytDubSettings: {
          lang: state.lang,
          voice: state.voice,
          autoSpeed: state.autoSpeed,
          speed: state.speed,
          origVolume: state.origVolume,
          autoStart: state.autoStart
        }
      });
    } catch {
      handleContextInvalidated();
    }
  }

  function clearAudioCache() {
    for (const item of state.audioCache.values()) {
      if (item?.blobUrl) {
        try {
          URL.revokeObjectURL(item.blobUrl);
        } catch {}
      }
    }
    state.audioCache.clear();
  }

  function setAudioCache(idx, value) {
    if (state.audioCache.has(idx)) {
      const old = state.audioCache.get(idx);
      if (old?.blobUrl && old.blobUrl !== value?.blobUrl) {
        try {
          URL.revokeObjectURL(old.blobUrl);
        } catch {}
      }
      state.audioCache.delete(idx);
    } else if (state.audioCache.size >= state.MAX_CACHE) {
      for (const [k, old] of state.audioCache.entries()) {
        if (k === state.playingIndex || audioQueue.isQueued(`seg_${k}`)) continue;
        if (old?.blobUrl) {
          try {
            URL.revokeObjectURL(old.blobUrl);
          } catch {}
        }
        state.audioCache.delete(k);
        break;
      }
    }
    state.audioCache.set(idx, value);
  }

  function clampPanelToViewport() {
    const panel = document.getElementById("yt-dub-panel");
    if (!panel || panel.classList.contains("hidden") || !panel.style.left) return;
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    panel.style.left = `${Math.max(8, Math.min(maxLeft, rect.left))}px`;
    panel.style.top = `${Math.max(8, Math.min(maxTop, rect.top))}px`;
  }

  function populateSourceTracks() {
    const sel = document.getElementById("ytDubSourceLang");
    if (!sel) return;
    const opts = [el("option", { value: "", textContent: t("sourceAutoDefault") })];
    for (const track of state.availableTracks) {
      const label = track.isAuto ? `${track.label} (${t("autoTag")})` : track.label;
      opts.push(el("option", { value: track.vssId, textContent: label }));
    }
    sel.replaceChildren(...opts);
    sel.value = state.selectedSourceVssId || "";
  }

  function createPanel() {
    if (document.getElementById("yt-dub-panel") || !document.body) return;

    const dot = el("span", { className: "yt-dub-dot", id: "ytDubDot" });
    const title = el("div", { className: "yt-dub-title" }, [dot, "AI Dubber"]);
    const closeBtn = el("button", {
      className: "yt-dub-close",
      id: "ytDubCloseBtn",
      title: t("closePanel"),
      textContent: "×"
    });
    const header = el("div", { className: "yt-dub-header", id: "ytDubDragHeader" }, [title, closeBtn]);

    const sourceSelect = el("select", { id: "ytDubSourceLang", className: "yt-dub-select" }, [
      el("option", { value: "", textContent: t("sourceAutoDefault") })
    ]);
    const sourceRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubSourceLang", textContent: t("sourceSubLabel") }),
      sourceSelect
    ]);

const langSelect = el(
      "select",
      { id: "ytDubLang", className: "yt-dub-select" },
      LANGUAGE_CONFIG.map((item) => el("option", { value: item.code, textContent: item.label }))
    );
    const langRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubLang", textContent: t("targetLangLabel") }),
      langSelect
    ]);

    const voiceSelect = el("select", { id: "ytDubVoice", className: "yt-dub-select" });
    const voiceRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubVoice", textContent: t("voiceLabel") }),
      voiceSelect
    ]);

    const speedResetBtn = el("button", {
      id: "ytDubSpeedResetBtn",
      className: "yt-dub-mini-btn active",
      type: "button",
      title: t("speedDefaultTooltip"),
      textContent: t("speedDefaultBtn")
    });
    const speedVal = el("span", { id: "ytDubSpeedVal", textContent: t("speedAutoVal") });
    const speedRight = el("div", { style: "display:flex;align-items:center;gap:6px;" }, [
      speedVal,
      speedResetBtn
    ]);
    const speedSlider = el("input", {
      id: "ytDubSpeed",
      className: "yt-dub-slider",
      type: "range",
      min: "0.85",
      max: "1.8",
      step: "0.05",
      value: "1.25"
    });
    const speedGroup = el("div", { className: "yt-dub-slider-group" }, [
      el("div", { className: "yt-dub-slider-label" }, [el("span", { textContent: t("speedLabel") }), speedRight]),
      speedSlider
    ]);

    const volVal = el("span", { id: "ytDubVolVal", textContent: "25%" });
    const volSlider = el("input", {
      id: "ytDubVol",
      className: "yt-dub-slider",
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: "25"
    });
    const volGroup = el("div", { className: "yt-dub-slider-group" }, [
      el("div", { className: "yt-dub-slider-label" }, [el("span", { textContent: t("origVolLabel") }), volVal]),
      volSlider
    ]);

    const autoStartInput = el("input", {
      id: "ytDubAutoStart",
      className: "yt-dub-checkbox",
      type: "checkbox"
    });
    const autoStartRow = el("div", { className: "yt-dub-toggle-row" }, [
      el("label", { for: "ytDubAutoStart", textContent: t("autoStartLabel") }),
      autoStartInput
    ]);

    const mainBtn = el("button", {
      id: "ytDubMainBtn",
      className: "yt-dub-main-btn",
      textContent: t("btnStart")
    });

    const scriptBtn = el("button", {
      id: "ytDubScriptBtn",
      className: "yt-dub-sub-btn",
      textContent: t("btnScript")
    });

    const statusDiv = el("div", {
      id: "ytDubStatus",
      className: "yt-dub-status",
      textContent: t("statusReady")
    });

    const panel = el("div", { id: "yt-dub-panel", className: "hidden" }, [
      header,
      sourceRow,
      langRow,
      voiceRow,
      speedGroup,
      volGroup,
      autoStartRow,
      mainBtn,
      scriptBtn,
      statusDiv
    ]);

    document.body.appendChild(panel);
    makeDraggable(panel, header);

    closeBtn.onclick = () => togglePanel(false);
    mainBtn.onclick = () => toggleDubbing(!state.enabled);
    scriptBtn.onclick = () => toggleScriptPanel();

    sourceSelect.onchange = (e) => {
      if (!checkContextAlive()) return;
      state.selectedSourceVssId = e.target.value;
      if (state.enabled) startSession();
    };

    langSelect.onchange = (e) => {
      if (!checkContextAlive()) return;
      state.lang = e.target.value;
      populateVoices(true);
      applyAudioSettings();
      saveSettings();
      if (state.enabled) startSession();
    };

    voiceSelect.onchange = (e) => {
      if (!checkContextAlive()) return;
      state.voice = e.target.value;
      applyAudioSettings();
      saveSettings();
      if (state.enabled) {
        stopAudioAll();
        clearAudioCache();
        state.enqueuedSet.clear();
        if (state.video) {
          const curT = state.video.currentTime;
          for (let i = 0; i < state.segments.length; i++) {
            if (state.segments[i].end < curT - 0.3) state.enqueuedSet.add(i);
          }
          pipelineAhead(curT, state.sessionToken);
          syncPlayback();
        }
      }
    };

    autoStartInput.onchange = (e) => {
      if (!checkContextAlive()) return;
      state.autoStart = Boolean(e.target.checked);
      saveSettings();
    };

    speedSlider.oninput = (e) => {
      state.autoSpeed = false;
      state.speed = parseFloat(e.target.value);
      audioQueue.setAutoPacing(false);
      audioQueue.setBaseSpeed(state.speed);
      syncUI();
      saveSettings();
    };

    speedResetBtn.onclick = () => {
      state.autoSpeed = true;
      audioQueue.setAutoPacing(true);
      syncUI();
      saveSettings();
    };

    volSlider.oninput = (e) => {
      state.origVolume = parseInt(e.target.value, 10) / 100;
      volVal.textContent = `${e.target.value}%`;
      syncOriginalVideoVolume();
      saveSettings();
    };

    populateVoices();
    syncUI();
  }

  function populateVoices(resetToDefault = false) {
    const sel = document.getElementById("ytDubVoice");
    if (!sel) return;
    const list = [...(VOICES[state.lang] || VOICES.en)];

    if (state.hasGoogleKey) {
      if (state.lang === "vi") {
        list.push(
          { id: "google-wavenet-b", label: "Google WaveNet - Male 1" },
          { id: "google-wavenet-d", label: "Google WaveNet - Male 2" },
          { id: "google-wavenet-a", label: "Google WaveNet - Female 1" },
          { id: "google-wavenet-c", label: "Google WaveNet - Female 2" }
        );
      } else {
        list.push(
          { id: "google-wavenet-male", label: "Google WaveNet (Male)" },
          { id: "google-wavenet-female", label: "Google WaveNet (Female)" }
        );
      }
    }

    if (state.hasOpenAiKey) {
      list.push({ id: "openai-nova", label: "OpenAI Nova (BYOK)" });
    }

    sel.replaceChildren(...list.map((v) => el("option", { value: v.id, textContent: v.label })));
    if (resetToDefault || !list.some((v) => v.id === state.voice)) {
      state.voice = list[0].id;
    }
    sel.value = state.voice;
  }

  function makeDraggable(elNode, handle) {
    let dragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      const rect = elNode.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      elNode.style.right = "auto";
      elNode.style.bottom = "auto";
      elNode.style.left = `${origLeft}px`;
      elNode.style.top = `${origTop}px`;
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const left = Math.max(8, Math.min(window.innerWidth - elNode.offsetWidth - 8, origLeft + e.clientX - startX));
      const top = Math.max(8, Math.min(window.innerHeight - elNode.offsetHeight - 8, origTop + e.clientY - startY));
      elNode.style.left = `${left}px`;
      elNode.style.top = `${top}px`;
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });
  }

  function togglePanel(force) {
    createPanel();
    state.panelOpen = typeof force === "boolean" ? force : !state.panelOpen;
    const panel = document.getElementById("yt-dub-panel");
    if (panel) {
      panel.classList.toggle("hidden", !state.panelOpen);
      if (state.panelOpen) clampPanelToViewport();
    }
  }

  function createScriptPanel() {
    if (document.getElementById("yt-dub-script-panel") || !document.body) return;
    const closeBtn = el("button", { className: "yt-dub-close", textContent: "×" });
    const header = el("div", { className: "yt-dub-script-header" }, [
      el("span", { id: "ytDubScriptTitle", textContent: t("scriptHeaderDefault") }),
      closeBtn
    ]);
    const body = el("div", { id: "ytDubScriptBody", className: "yt-dub-script-body" });
    const panel = el("div", { id: "yt-dub-script-panel", className: "hidden" }, [header, body]);

    const markUserScroll = () => {
      state.userInteractingScriptUntil = Date.now() + 4500;
    };
    ["wheel", "pointerdown", "touchstart"].forEach((ev) => {
      body.addEventListener(ev, markUserScroll, { passive: true });
    });

    document.body.appendChild(panel);
    makeDraggable(panel, header);
    closeBtn.onclick = () => toggleScriptPanel(false);
  }

  function toggleScriptPanel(force) {
    createScriptPanel();
    state.scriptOpen = typeof force === "boolean" ? force : !state.scriptOpen;
    const panel = document.getElementById("yt-dub-script-panel");
    const btn = document.getElementById("ytDubScriptBtn");
    if (panel) panel.classList.toggle("hidden", !state.scriptOpen);
    if (btn) btn.classList.toggle("active", state.scriptOpen);
    if (state.scriptOpen && state.segments.length) {
      renderScriptList();
      if (state.playingIndex >= 0 && state.activeAudio) {
        highlightScriptItem(state.playingIndex);
        startKaraokeLoop(state.playingIndex, state.activeAudio);
      }
    }
  }

  function fillKaraokeWords(container, text, lang) {
    container.replaceChildren();
    const tokens = window.DubCore.segmentWordsForKaraoke(text, lang);
    for (const tok of tokens) {
      container.appendChild(el("span", { className: "w pending", textContent: tok.text }));
      if (tok.trailingSpace) container.appendChild(document.createTextNode(" "));
    }
  }

  function renderScriptList() {
    createScriptPanel();
    const body = document.getElementById("ytDubScriptBody");
    if (!body) return;
    body.replaceChildren();

    const titleEl = document.getElementById("ytDubScriptTitle");
    if (titleEl) {
      titleEl.textContent = t("scriptHeaderLangs", {
        src: state.sourceLang.toUpperCase(),
        dst: state.lang.toUpperCase()
      });
    }

    const frag = document.createDocumentFragment();
    state.segments.forEach((seg, idx) => {
      const origDiv = el("div", { className: "yt-dub-script-orig" });
      fillKaraokeWords(origDiv, seg.text, state.sourceLang);

      const transDiv = el("div", { className: "yt-dub-script-trans" });
      fillKaraokeWords(transDiv, state.translatedMap.get(idx) || "...", state.lang);

      const item = el("div", { className: "yt-dub-script-item", "data-idx": String(idx) }, [
        origDiv,
        transDiv
      ]);
      item.onclick = () => {
        if (state.video) {
          state.video.currentTime = seg.start;
          if (state.video.paused) state.video.play().catch(() => {});
        }
      };
      frag.appendChild(item);
    });
    body.appendChild(frag);

    if (state.playingIndex >= 0) highlightScriptItem(state.playingIndex);
  }

  function updateScriptItemTranslation(idx, translatedText) {
    const item = document.querySelector(`.yt-dub-script-item[data-idx="${idx}"]`);
    if (!item) return;
    const transDiv = item.querySelector(".yt-dub-script-trans");
    if (!transDiv) return;

    fillKaraokeWords(transDiv, translatedText, state.lang);

    if (idx === state.playingIndex && item.classList.contains("current")) {
      state.karaokeTransWords = Array.from(transDiv.querySelectorAll(".w"));
      state.karaokeTransIdx = -1;
    } else if (idx < state.playingIndex) {
      transDiv.querySelectorAll(".w").forEach((n) => (n.className = "w done"));
    }
  }

  function highlightScriptItem(idx) {
    const body = document.getElementById("ytDubScriptBody");
    if (!body) return;

    const items = body.querySelectorAll(".yt-dub-script-item");
    let activeEl = null;

    items.forEach((node) => {
      const i = parseInt(node.getAttribute("data-idx") || "-1", 10);
      node.classList.remove("current");
      if (i === idx) {
        node.classList.add("current");
        activeEl = node;
        node.querySelectorAll(".w").forEach((w) => (w.className = "w pending"));
      } else if (i < idx) {
        node.querySelectorAll(".w").forEach((w) => (w.className = "w done"));
      } else {
        node.querySelectorAll(".w").forEach((w) => (w.className = "w pending"));
      }
    });

    if (activeEl && state.scriptOpen && Date.now() >= state.userInteractingScriptUntil) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function stepKaraokeList(nodes, targetIdx, prevIdx) {
    if (!nodes.length) return -1;
    const clampedTarget = Math.min(nodes.length - 1, Math.max(0, targetIdx));
    const nextIdx = prevIdx < 0 ? 0 : Math.min(clampedTarget, prevIdx + 1);
    if (nextIdx === prevIdx) return prevIdx;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].className = i < nextIdx ? "w done" : i === nextIdx ? "w active" : "w pending";
    }
    return nextIdx;
  }

  function startKaraokeLoop(idx, audio) {
    stopKaraokeLoop();
    const item = document.querySelector(`.yt-dub-script-item[data-idx="${idx}"]`);
    if (!item) return;

    state.karaokeOrigWords = Array.from(item.querySelectorAll(".yt-dub-script-orig .w"));
    state.karaokeTransWords = Array.from(item.querySelectorAll(".yt-dub-script-trans .w"));
    state.karaokeOrigIdx = -1;
    state.karaokeTransIdx = -1;

    const tick = () => {
      if (state.activeAudio !== audio || !audio || audio.paused) return;
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        const ratio = Math.max(0, Math.min(1, audio.currentTime / dur));
        if (state.karaokeOrigWords.length) {
          const targetO = Math.floor(ratio * state.karaokeOrigWords.length);
          state.karaokeOrigIdx = stepKaraokeList(state.karaokeOrigWords, targetO, state.karaokeOrigIdx);
        }
        if (state.karaokeTransWords.length) {
          const targetT = Math.floor(ratio * state.karaokeTransWords.length);
          state.karaokeTransIdx = stepKaraokeList(state.karaokeTransWords, targetT, state.karaokeTransIdx);
        }
      }
      state.karaokeRaf = requestAnimationFrame(tick);
    };
    state.karaokeRaf = requestAnimationFrame(tick);
  }

  function stopKaraokeLoop() {
    if (state.karaokeRaf) {
      cancelAnimationFrame(state.karaokeRaf);
      state.karaokeRaf = null;
    }
  }

  function syncUI() {
    const dot = document.getElementById("ytDubDot");
    if (dot) dot.classList.toggle("on", state.enabled);

    const btn = document.getElementById("ytDubMainBtn");
    if (btn) {
      btn.textContent = state.enabled ? t("btnStop") : t("btnStart");
      btn.classList.toggle("active", state.enabled);
    }

    const langSel = document.getElementById("ytDubLang");
    if (langSel) langSel.value = state.lang;

    const sIn = document.getElementById("ytDubSpeed");
    if (sIn) sIn.value = String(state.speed);
    const sVal = document.getElementById("ytDubSpeedVal");
    if (sVal) sVal.textContent = state.autoSpeed ? t("speedAutoVal") : `${state.speed.toFixed(2)}x`;
    const sReset = document.getElementById("ytDubSpeedResetBtn");
    if (sReset) sReset.classList.toggle("active", state.autoSpeed);

    const vIn = document.getElementById("ytDubVol");
    if (vIn) vIn.value = String(Math.round(state.origVolume * 100));
    const vVal = document.getElementById("ytDubVolVal");
    if (vVal) vVal.textContent = `${Math.round(state.origVolume * 100)}%`;

    const autoIn = document.getElementById("ytDubAutoStart");
    if (autoIn) autoIn.checked = Boolean(state.autoStart);

    document.querySelectorAll(".yt-dub-player-btn, .yt-dub-shorts-btn").forEach((b) => {
      b.classList.toggle("active", state.enabled);
    });
  }

  function setStatus(text, color = "#94a3b8") {
    const elNode = document.getElementById("ytDubStatus");
    if (elNode) {
      elNode.textContent = text;
      elNode.style.color = color;
    }
  }

  function injectPlayerControls() {
    if (state.contextDead) return;
    const isShorts = location.pathname.includes("/shorts/");
    const existingShortsBtn = document.querySelector(".yt-dub-shorts-btn");

    if (isShorts) {
      if (!existingShortsBtn && document.body) {
        const sBtn = el(
          "button",
          {
            className: `yt-dub-shorts-btn ${state.enabled ? "active" : ""}`,
            title: "AI Dubber (Alt+Shift+D)"
          },
          [createHeadphoneSvg()]
        );
        sBtn.onclick = () => togglePanel();
        document.body.appendChild(sBtn);
      }
      return;
    } else if (existingShortsBtn) {
      existingShortsBtn.remove();
    }

    const rightControls = document.querySelector("#movie_player .ytp-right-controls");
    if (rightControls && !rightControls.querySelector(".yt-dub-player-btn")) {
      const btn = el(
        "button",
        {
          className: `ytp-button yt-dub-player-btn ${state.enabled ? "active" : ""}`,
          title: "AI Dubber (Alt+Shift+D)",
          "aria-label": "AI Dubber"
        },
        [createHeadphoneSvg()]
      );
      btn.onclick = (e) => {
        e.stopPropagation();
        togglePanel();
      };

      const leftGroup = rightControls.querySelector(".ytp-right-controls-left");
      const targetContainer = leftGroup || rightControls;
      const subBtn = targetContainer.querySelector(".ytp-subtitles-button");
      if (subBtn) targetContainer.insertBefore(btn, subBtn);
      else targetContainer.prepend(btn);
    }
  }

  document.addEventListener("fullscreenchange", () => {
    const targetParent = document.fullscreenElement || document.body;
    const panel = document.getElementById("yt-dub-panel");
    if (panel && panel.parentElement !== targetParent) targetParent.appendChild(panel);
    const scriptPanel = document.getElementById("yt-dub-script-panel");
    if (scriptPanel && scriptPanel.parentElement !== targetParent) targetParent.appendChild(scriptPanel);
    requestAnimationFrame(clampPanelToViewport);
  });

  window.addEventListener("resize", clampPanelToViewport);

  function isAdPlaying() {
    const player = document.getElementById("movie_player");
    return Boolean(player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting")));
  }

  function requestSubtitlesFromPage() {
    return new Promise((resolve, reject) => {
      const requestId = "sub_" + Math.random().toString(36).slice(2);
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMsg);
        reject(new Error("ERR_TIMEOUT_SUBTITLES"));
      }, 9000);

      const onMsg = (e) => {
        if (e.source !== window || e.data?.type !== "YT_DUB_SUBTITLES_RESULT" || e.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        if (e.data.success) resolve(e.data);
        else reject(new Error(e.data.error || "ERR_NO_SUBTITLES"));
      };

      window.addEventListener("message", onMsg);
      window.postMessage(
        {
          type: "YT_DUB_GET_SUBTITLES",
          requestId,
          targetLang: state.lang,
          sourceVssId: state.selectedSourceVssId
        },
        "*"
      );
    });
  }

  function mergeShortSegments(rawSegments) {
    if (!rawSegments.length) return [];
    const mapped = rawSegments.map((s) => ({
      text: s.text,
      startTime: s.start,
      endTime: s.end
    }));
    const merged = window.DubCore.mergeCaptionSegments(mapped, {
      minChars: 22,
      maxDuration: 5.0,
      maxUnpunctuatedDuration: 6.8,
      maxGap: 0.38,
      hardGap: 0.95,
      maxChars: 115,
      maxWords: 19
    });
    return merged.map((s) => ({
      text: s.text,
      start: s.startTime,
      end: s.endTime
    }));
  }

  async function dataUrlToBlobUrl(dataUrl) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function translateAheadBatch(currentTime, token) {
    if (!checkContextAlive()) return;
    const now = Date.now();
    if (now < state.translateCooldownUntil) return;

    if (state.alreadyTranslated) {
      for (let i = 0; i < state.segments.length; i++) {
        if (!state.translatedMap.has(i)) {
          const text = state.segments[i].text;
          state.translatedMap.set(i, text);
          updateScriptItemTranslation(i, text);
        }
      }
      return;
    }

    for (const [idx, startedAt] of state.translatingMap.entries()) {
      if (now - startedAt > STALE_LOADING_MS) state.translatingMap.delete(idx);
    }

    if (state.translatingMap.size >= 14) return;

    const indices = [];
    for (let i = 0; i < state.segments.length; i++) {
      const seg = state.segments[i];
      if (seg.end < currentTime - 1.0) continue;
      if (seg.start > currentTime + 80) break;
      if (!state.translatedMap.has(i) && !state.translatingMap.has(i)) {
        indices.push(i);
        if (indices.length >= 8) break;
      }
    }

    if (!indices.length) return;
    indices.forEach((i) => state.translatingMap.set(i, now));

    try {
      const texts = indices.map((i) => state.segments[i].text);
      const res = await safeSendMessage(
        { action: "translateBatch", texts, targetLang: state.lang },
        14000
      );
      if (token !== state.sessionToken) return;

      if (res?.success && Array.isArray(res.data)) {
        indices.forEach((segIdx, pos) => {
          const translated = res.data[pos] || state.segments[segIdx].text;
          state.translatedMap.set(segIdx, translated);
          updateScriptItemTranslation(segIdx, translated);
        });
        if (state.video) synthesizeAhead(state.video.currentTime, token);
      } else {
        state.translateCooldownUntil = Date.now() + 1500;
      }
    } catch {
      state.translateCooldownUntil = Date.now() + 1500;
    } finally {
      indices.forEach((i) => state.translatingMap.delete(i));
    }
  }

  async function prepareAudioForIndex(idx, token) {
    if (!checkContextAlive()) return false;
    if (idx < 0 || idx >= state.segments.length) return false;
    const rawOut = state.translatedMap.get(idx);
    if (!rawOut) return false;

    const existing = state.audioCache.get(idx);
    if (existing?.status === "ready") return true;
    if (existing?.status === "loading" && Date.now() - (existing.startedAt || 0) <= STALE_LOADING_MS) {
      return false;
    }

    const textOut = window.DubCore.cleanTextForTTS(rawOut, state.lang);
    if (!textOut) {
      setAudioCache(idx, { status: "error", blobUrl: null, engine: null, retried: true, startedAt: Date.now() });
      return false;
    }

    setAudioCache(idx, {
      status: "loading",
      blobUrl: null,
      engine: null,
      retried: existing?.retried || false,
      startedAt: Date.now()
    });

    try {
      const tts = await safeSendMessage(
        {
          action: "tts",
          text: textOut,
          voice: state.voice,
          lang: state.lang,
          allowFallback: Boolean(existing?.retried)
        },
        16000
      );
      if (token !== state.sessionToken) return false;
      if (!tts?.success || !tts.data) throw new Error(tts?.error || "TTS failed");

      const blobUrl = await dataUrlToBlobUrl(tts.data);
      if (token !== state.sessionToken) {
        URL.revokeObjectURL(blobUrl);
        return false;
      }

      setAudioCache(idx, { status: "ready", blobUrl, engine: tts.engine || "unknown", retried: false, startedAt: 0 });
      syncPlayback();
      return true;
    } catch {
      if (token === state.sessionToken && !state.contextDead) {
        setAudioCache(idx, {
          status: "error",
          blobUrl: null,
          engine: null,
          retried: existing?.retried || false,
          startedAt: Date.now()
        });
      }
      return false;
    }
  }

  function synthesizeAhead(currentTime, token) {
    if (state.contextDead) return;
    const now = Date.now();
    let inflight = 0;

    for (const [k, v] of state.audioCache.entries()) {
      if (v.status === "loading") {
        if (now - (v.startedAt || 0) > STALE_LOADING_MS) {
          state.audioCache.set(k, { status: "error", blobUrl: null, engine: null, retried: false, startedAt: now });
        } else {
          inflight++;
        }
      }
    }
    if (inflight >= 3) return;

    for (let i = 0; i < state.segments.length; i++) {
      const seg = state.segments[i];
      if (seg.end < currentTime - 1.0) continue;
      if (seg.start > currentTime + 55) break;
      if (!state.translatedMap.has(i)) continue;

      const c = state.audioCache.get(i);
      if (!c || (c.status === "error" && !c.retried)) {
        if (c?.status === "error") c.retried = true;
        prepareAudioForIndex(i, token);
        inflight++;
        if (inflight >= 3) break;
      }
    }
  }

  function pipelineAhead(currentTime, token) {
    if (!checkContextAlive()) return;
    translateAheadBatch(currentTime, token);
    synthesizeAhead(currentTime, token);
  }

  function findVideo() {
    if (location.pathname.includes("/shorts/")) {
      const v = document.querySelector("ytd-reel-video-renderer[is-active] video");
      if (v) return v;
    }
    return document.querySelector("#movie_player video") || document.querySelector("video");
  }

  function stopAudioAll() {
    stopKaraokeLoop();
    audioQueue.clear();
    state.playingIndex = -1;
    state.activeAudio = null;
  }

  function syncPlayback() {
    if (!checkContextAlive()) return;
    if (!state.enabled || !state.video || !state.segments.length) return;

    if (isAdPlaying()) {
      stopAudioAll();
      state.enqueuedSet.clear();
      syncOriginalVideoVolume();
      setStatus(t("statusAdPaused"), "#fbbf24");
      return;
    }

    syncOriginalVideoVolume();

    if (state.video.seeking) {
      audioQueue.pause();
      return;
    }

    const curT = state.video.currentTime;
    audioQueue.updateVideoTime(curT);
    audioQueue.setVideoPlaybackRate(state.video.playbackRate || 1);
    pipelineAhead(curT, state.sessionToken);

    if (state.video.paused) {
      audioQueue.pause();
      return;
    }

    audioQueue.resume();

    for (let i = 0; i < state.segments.length; i++) {
      if (state.enqueuedSet.has(i)) continue;
      const seg = state.segments[i];

      if (seg.start > curT + PRE_ENQUEUE_AHEAD_SEC) break;
      if (audioQueue.getQueueLength() >= 3) break;

      if (curT > seg.end + 1.2 || curT > seg.start + 2.6) {
        state.enqueuedSet.add(i);
        continue;
      }

      const cached = state.audioCache.get(i);
      if (cached?.status === "ready" && cached.blobUrl) {
        state.enqueuedSet.add(i);
        const nextSeg = state.segments[i + 1];
        audioQueue.enqueue(
          {
            chunkId: `seg_${i}`,
            index: i,
            url: cached.blobUrl,
            startTime: seg.start,
            endTime: seg.end,
            nextStartTime: nextSeg ? nextSeg.start : null
          },
          { noRevoke: true }
        );
      } else if (cached?.status === "error" && cached.retried) {
        state.enqueuedSet.add(i);
      } else {
        if (!audioQueue.isCurrentlyPlaying() && curT >= seg.start - 0.3) {
          setStatus(t("statusPreparing", { index: i + 1 }), "#fbbf24");
        }
        break;
      }
    }
  }

  function startSyncLoop() {
    if (state.syncInterval || !state.enabled || state.contextDead) return;
    state.syncInterval = setInterval(syncPlayback, 100);
  }

  function stopSyncLoop() {
    if (state.syncInterval) {
      clearInterval(state.syncInterval);
      state.syncInterval = null;
    }
  }

  function onPlay() {
    if (!state.enabled || !checkContextAlive()) return;
    // Giữ video tạm dừng khi đang tải phụ đề & chuẩn bị câu đầu để tránh YouTube autoplay làm miss câu mở đầu
    if (state.preparingSession && !isAdPlaying()) {
      if (state.video && !state.video.paused) state.video.pause();
      return;
    }
    syncOriginalVideoVolume();
    audioQueue.resume();
    startKeepalive();
    startSyncLoop();
    syncPlayback();
  }

  function onPause() {
    stopSyncLoop();
    audioQueue.pause();
    stopKaraokeLoop();
  }

  function onSeeking() {
    if (state.preparingSession) return;
    stopAudioAll();
    state.enqueuedSet.clear();
  }

  function onSeeked() {
    if (state.preparingSession) return;
    if (!state.enabled || !state.video || !checkContextAlive()) return;
    const curT = state.video.currentTime;
    for (let i = 0; i < state.segments.length; i++) {
      if (state.segments[i].end < curT - 0.3) state.enqueuedSet.add(i);
    }
    pipelineAhead(curT, state.sessionToken);
    if (!state.video.paused) {
      startSyncLoop();
      syncPlayback();
    }
  }

  function onRateChange() {
    if (state.video) {
      audioQueue.setVideoPlaybackRate(state.video.playbackRate || 1);
    }
  }

  function bindVideoEvents(video) {
    if (state.video === video) return;
    if (state.video) {
      state.video.removeEventListener("timeupdate", syncPlayback);
      state.video.removeEventListener("play", onPlay);
      state.video.removeEventListener("pause", onPause);
      state.video.removeEventListener("ended", onPause);
      state.video.removeEventListener("seeking", onSeeking);
      state.video.removeEventListener("seeked", onSeeked);
      state.video.removeEventListener("ratechange", onRateChange);
      state.video.removeEventListener("volumechange", onVolumeChange);
    }
    state.video = video;
    if (!video) return;
    video.addEventListener("timeupdate", syncPlayback);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("volumechange", onVolumeChange);
  }

  async function waitForVideoElement(token, maxMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (token !== state.sessionToken || state.contextDead) return null;
      const v = findVideo();
      if (v) return v;
      await new Promise((r) => setTimeout(r, 80));
    }
    return findVideo();
  }

  async function prebufferInitialSegments(startTime, token) {
    const startIdx = state.segments.findIndex((s) => s.end >= startTime - 0.3);
    if (startIdx < 0) return;

    for (let i = 0; i < startIdx; i++) state.enqueuedSet.add(i);

    const initialCount = Math.min(4, state.segments.length - startIdx);
    const targetIndices = Array.from({ length: initialCount }, (_, k) => startIdx + k);

    setStatus(t("statusTranslatingInit"), "#fbbf24");
    if (!state.alreadyTranslated) {
      const missingIndices = targetIndices.filter((i) => !state.translatedMap.has(i));
      if (missingIndices.length > 0) {
        const texts = missingIndices.map((i) => state.segments[i].text);
        try {
          const res = await safeSendMessage(
            { action: "translateBatch", texts, targetLang: state.lang },
            14000
          );
          if (token !== state.sessionToken) return;
          if (res?.success && Array.isArray(res.data)) {
            missingIndices.forEach((segIdx, pos) => {
              const tr = res.data[pos] || state.segments[segIdx].text;
              state.translatedMap.set(segIdx, tr);
              updateScriptItemTranslation(segIdx, tr);
            });
          }
        } catch {}
      }
    } else {
      targetIndices.forEach((segIdx) => {
        const text = state.segments[segIdx].text;
        state.translatedMap.set(segIdx, text);
        updateScriptItemTranslation(segIdx, text);
      });
    }

    if (token !== state.sessionToken) return;
    setStatus(t("statusSynthesizingInit"), "#fbbf24");

    // Tạo song song 2 câu đầu, nhưng chỉ cần đợi câu đầu tiên sẵn sàng là phát ngay để khởi động siêu nhanh
    const firstPromise = prepareAudioForIndex(targetIndices[0], token);
    if (targetIndices.length > 1) {
      prepareAudioForIndex(targetIndices[1], token);
    }
    await Promise.race([firstPromise, new Promise((r) => setTimeout(r, 3500))]);
  }

  async function startSession({ fromNavigation = false } = {}) {
    if (!checkContextAlive()) return;
    const token = ++state.sessionToken;
    endPreparing();
    stopAudioAll();
    state.segments = [];
    state.translatedMap.clear();
    state.translatingMap.clear();
    state.translateCooldownUntil = 0;
    state.enqueuedSet.clear();
    clearAudioCache();

    const video = await waitForVideoElement(token, fromNavigation ? 3000 : 800);
    if (token !== state.sessionToken || state.contextDead) return;
    if (!video) {
      setStatus(t("statusNoVideo"), "#f87171");
      return;
    }
    bindVideoEvents(video);
    applyAudioSettings();
    startKeepalive();

    // Nếu đang chiếu quảng cáo khi vừa vào video -> đợi quảng cáo kết thúc rồi mới tải & thuyết minh video chính
    if (isAdPlaying()) {
      setStatus(t("statusAdPaused"), "#fbbf24");
      while (isAdPlaying()) {
        if (token !== state.sessionToken || state.contextDead || !state.enabled) return;
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const wasPlaying = fromNavigation ? true : !video.paused;
    // Nếu vừa vào video mới hoặc bấm Bật ngay trong 4.5s đầu -> neo về 0:00 để không bao giờ bị miss câu mở đầu
    const anchorTime = fromNavigation || (wasPlaying && video.currentTime < 4.5) ? 0 : video.currentTime;

    // Tạm dừng & tắt tiếng NGAY LẬP TỨC trước khi tải sub YouTube để video không chạy trôi qua mấy câu đầu
    state.preparingSession = true;
    if (state.savedPrevMuted === null) state.savedPrevMuted = video.muted;
    video.muted = true;
    if (!video.paused) video.pause();
    setStatus(t("statusFetchingSub"), "#fbbf24");

    try {
      const res = await requestSubtitlesFromPage();
      if (token !== state.sessionToken || state.contextDead) return;

      state.sourceLang = res.sourceLang || "en";
      state.availableTracks = Array.isArray(res.availableTracks) ? res.availableTracks : [];
      if (res.selectedVssId && !state.selectedSourceVssId) {
        state.selectedSourceVssId = res.selectedVssId;
      }
      populateSourceTracks();

      state.alreadyTranslated = Boolean(res.translatedByYouTube);
      state.segments = mergeShortSegments(res.segments);

      if (Array.isArray(res.nativeTargetSegments) && res.nativeTargetSegments.length > 0) {
        state.segments.forEach((seg, idx) => {
          const hits = res.nativeTargetSegments.filter(
            (sub) => sub.start < seg.end - 0.12 && sub.end > seg.start + 0.12
          );
          if (hits.length > 0) {
            const joined = hits.map((h) => h.text).join(" ").replace(/\s+/g, " ").trim();
            if (joined) state.translatedMap.set(idx, joined);
          }
        });
      }

      if (!state.segments.length) {
        endPreparing(video);
        if (wasPlaying) video.play().catch(() => {});
        setStatus(t("statusEmptySub"), "#f87171");
        return;
      }

      renderScriptList();

      await prebufferInitialSegments(anchorTime, token);
      if (token !== state.sessionToken || state.contextDead) return;

      // Tua gọn về đúng anchorTime (0:00 nếu vừa vào video) trước khi mở khóa phát
      if (Math.abs(video.currentTime - anchorTime) > 0.35) {
        try {
          video.currentTime = anchorTime;
        } catch {}
      }

      endPreparing(video);
      setStatus(t("statusReadyCount", { total: state.segments.length }), "#34d399");
      syncOriginalVideoVolume();
      if (wasPlaying) {
        await video.play().catch(() => {});
      }

      if (!video.paused) startSyncLoop();
      pipelineAhead(anchorTime, token);
      syncPlayback();
    } catch (err) {
      endPreparing(video);
      if (token !== state.sessionToken || state.contextDead) return;
      syncOriginalVideoVolume();
      if (wasPlaying && video.paused) video.play().catch(() => {});
      setStatus(mapSubError(err.message), "#f87171");
    } finally {
      if (token === state.sessionToken && state.preparingSession) {
        endPreparing(video);
      }
    }
  }

  function toggleDubbing(enable) {
    if (!checkContextAlive()) return;
    state.enabled = enable;
    syncUI();
    if (enable) {
      startSession();
    } else {
      state.sessionToken++;
      endPreparing();
      stopSyncLoop();
      stopKeepalive();
      stopAudioAll();
      syncOriginalVideoVolume();
      setStatus(t("statusStopped"));
    }
  }

  document.addEventListener("keydown", (e) => {
    if (state.contextDead) return;
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
    if (e.altKey && e.shiftKey && e.code === "KeyD") {
      e.preventDefault();
      togglePanel(true);
      toggleDubbing(!state.enabled);
    } else if (e.altKey && e.shiftKey && e.code === "KeyV") {
      e.preventDefault();
      toggleScriptPanel();
    }
  });

  window.addEventListener("YT_DUB_NAVIGATION", () => {
    if (!checkContextAlive()) return;
    endPreparing();
    state.selectedSourceVssId = "";
    state.availableTracks = [];
    populateSourceTracks();
    injectPlayerControls();

    if (state.enabled || state.autoStart) {
      state.enabled = true;
      syncUI();
      // Dừng video ngay lập tức khi chuyển trang để YouTube không chạy trôi qua câu mở đầu
      const v = findVideo();
      if (v && !isAdPlaying() && !v.paused) v.pause();
      setTimeout(() => startSession({ fromNavigation: true }), 120);
    } else {
      stopSyncLoop();
      stopKeepalive();
      stopAudioAll();
      syncOriginalVideoVolume();
      state.segments = [];
      state.enqueuedSet.clear();
      clearAudioCache();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSyncLoop();
    stopKeepalive();
    stopAudioAll();
    clearAudioCache();
  });

  try {
    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (!checkContextAlive()) return;
      if (area === "local" && changes.byokConfig) {
        state.hasOpenAiKey = Boolean(changes.byokConfig.newValue?.openaiApiKey?.trim());
        state.hasGoogleKey = Boolean(changes.byokConfig.newValue?.googleApiKey?.trim());
        populateVoices();
      }
    });
  } catch {}

  domObserver = new MutationObserver(() => {
    if (state.contextDead) return;
    if (injectTimer) return;
    injectTimer = setTimeout(() => {
      injectTimer = null;
      injectPlayerControls();
    }, 500);
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  loadStorage();
  createPanel();
  injectPlayerControls();
})();