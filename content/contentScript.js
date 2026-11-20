(() => {
  "use strict";
  if (window.__YT_DUB_CONTENT_LOADED__) return;
  window.__YT_DUB_CONTENT_LOADED__ = true;

  const VOICES = {
    vi: [
      { id: "vi-VN-NamMinhNeural", label: "Edge - Nam Minh (Nam)" },
      { id: "vi-VN-HoaiMyNeural", label: "Edge - Hoài My (Nữ)" },
      { id: "google-free", label: "Google - Chuẩn (Nữ)" }
    ],
    en: [
      { id: "en-US-AndrewNeural", label: "Edge - Andrew (Male)" },
      { id: "en-US-AvaNeural", label: "Edge - Ava (Female)" },
      { id: "google-free", label: "Google - Standard" }
    ],
    ja: [
      { id: "ja-JP-KeitaNeural", label: "Edge - Keita (Male)" },
      { id: "ja-JP-NanamiNeural", label: "Edge - Nanami (Female)" },
      { id: "google-free", label: "Google - Standard" }
    ],
    ko: [
      { id: "ko-KR-InJoonNeural", label: "Edge - InJoon (Male)" },
      { id: "ko-KR-SunHiNeural", label: "Edge - SunHi (Female)" },
      { id: "google-free", label: "Google - Standard" }
    ],
    "zh-CN": [
      { id: "zh-CN-YunxiNeural", label: "Edge - Yunxi (Male)" },
      { id: "zh-CN-XiaoxiaoNeural", label: "Edge - Xiaoxiao (Female)" },
      { id: "google-free", label: "Google - Standard" }
    ]
  };

  const PRONOUN_OPTIONS = [
    ["auto", "Tự động theo video"],
    ["toi-ban", "Tôi - Bạn"],
    ["toi-cacban", "Tôi - Các bạn"],
    ["ong-chau", "Ông - Cháu"],
    ["anh-em", "Anh - Em"],
    ["thay-em", "Thầy - Em"],
    ["tao-may", "Tao - Mày"]
  ];

  const PRE_ENQUEUE_AHEAD_SEC = 5.0;
  const STALE_LOADING_MS = 14000;
  const audioQueue = new window.DubCore.DubAudioQueue();

  const state = {
    enabled: false,
    panelOpen: false,
    scriptOpen: false,
    contextDead: false,
    lang: "vi",
    sourceLang: "en",
    selectedSourceVssId: "", // "" = tự động chọn ngôn ngữ gốc của video
    availableTracks: [],
    videoTitle: "",
    pronounStyle: "auto",
    voice: "vi-VN-NamMinhNeural",
    speed: 1.35,
    origVolume: 0.25,
    hasOpenAiKey: false,
    hasGoogleKey: false,
    segments: [],
    rawTranslatedMap: new Map(), // Bản dịch thô trước khi áp dụng xưng hô
    translatedMap: new Map(), // Bản dịch đã chỉnh xưng hô
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
    audioQueue.setBaseSpeed(state.speed);
    audioQueue.setProviderSpeedMultiplier(getProviderSpeedFactor(state.voice));
    if (state.video) audioQueue.setVideoPlaybackRate(state.video.playbackRate || 1);
  }

  function formatTranslatedText(rawText) {
    if (!rawText) return "";
    if (!state.lang.startsWith("vi")) return rawText;
    return window.DubCore.applyVietnamesePronouns(
      rawText,
      state.pronounStyle,
      state.videoTitle,
      state.segments.slice(0, 12).map((s) => s.text)
    );
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
    setStatus(`Đang đọc ${item.index + 1}/${state.segments.length}`, "#34d399");
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

  function handleContextInvalidated() {
    if (state.contextDead) return;
    state.contextDead = true;
    state.enabled = false;
    state.sessionToken++;
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
    setStatus("Extension vừa cập nhật — Hãy F5 lại trang", "#fbbf24");
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

  function loadStorage() {
    if (!checkContextAlive()) return;
    try {
      chrome.storage?.local?.get(["ytDubSettings", "byokConfig"], (res) => {
        if (!checkContextAlive()) return;
        if (res?.ytDubSettings) {
          Object.assign(state, {
            lang: res.ytDubSettings.lang || "vi",
            voice: res.ytDubSettings.voice || "vi-VN-NamMinhNeural",
            speed: res.ytDubSettings.speed || 1.35,
            origVolume: res.ytDubSettings.origVolume ?? 0.25,
            pronounStyle: res.ytDubSettings.pronounStyle || "auto"
          });
        }
        state.hasOpenAiKey = Boolean(res?.byokConfig?.openaiApiKey?.trim());
        state.hasGoogleKey = Boolean(res?.byokConfig?.googleApiKey?.trim());
        applyAudioSettings();
        populateVoices();
        syncUI();
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
          speed: state.speed,
          origVolume: state.origVolume,
          pronounStyle: state.pronounStyle
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
    const opts = [el("option", { value: "", textContent: "Tự động (Gốc video)" })];
    for (const t of state.availableTracks) {
      const label = t.isAuto ? `${t.label} (Tự động)` : t.label;
      opts.push(el("option", { value: t.vssId, textContent: label }));
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
      title: "Đóng bảng",
      textContent: "×"
    });
    const header = el("div", { className: "yt-dub-header", id: "ytDubDragHeader" }, [title, closeBtn]);

    // Chọn ngôn ngữ nguồn của video (mặc định gốc video, có thể đổi sang sub khác video có)
    const sourceSelect = el("select", { id: "ytDubSourceLang", className: "yt-dub-select" }, [
      el("option", { value: "", textContent: "Tự động (Gốc video)" })
    ]);
    const sourceRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubSourceLang", textContent: "Sub gốc" }),
      sourceSelect
    ]);

    const langSelect = el(
      "select",
      { id: "ytDubLang", className: "yt-dub-select" },
      [
        ["vi", "Tiếng Việt"],
        ["en", "English"],
        ["ja", "日本語"],
        ["ko", "한국어"],
        ["zh-CN", "中文"]
      ].map(([val, label]) => el("option", { value: val, textContent: label }))
    );
    const langRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubLang", textContent: "Dịch sang" }),
      langSelect
    ]);

    const voiceSelect = el("select", { id: "ytDubVoice", className: "yt-dub-select" });
    const voiceRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubVoice", textContent: "Giọng đọc" }),
      voiceSelect
    ]);

    const pronounSelect = el(
      "select",
      { id: "ytDubPronoun", className: "yt-dub-select" },
      PRONOUN_OPTIONS.map(([val, label]) => el("option", { value: val, textContent: label }))
    );
    const pronounRow = el("div", { className: "yt-dub-row" }, [
      el("label", { for: "ytDubPronoun", textContent: "Xưng hô" }),
      pronounSelect
    ]);

    const speedVal = el("span", { id: "ytDubSpeedVal", textContent: "1.35x" });
    const speedSlider = el("input", {
      id: "ytDubSpeed",
      className: "yt-dub-slider",
      type: "range",
      min: "0.9",
      max: "1.8",
      step: "0.05",
      value: "1.35"
    });
    const speedGroup = el("div", { className: "yt-dub-slider-group" }, [
      el("div", { className: "yt-dub-slider-label" }, [el("span", { textContent: "Tốc độ tối đa" }), speedVal]),
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
      el("div", { className: "yt-dub-slider-label" }, [el("span", { textContent: "Âm lượng gốc" }), volVal]),
      volSlider
    ]);

    const mainBtn = el("button", {
      id: "ytDubMainBtn",
      className: "yt-dub-main-btn",
      textContent: "Bật thuyết minh (Alt+Shift+D)"
    });

    const scriptBtn = el("button", {
      id: "ytDubScriptBtn",
      className: "yt-dub-sub-btn",
      textContent: "Kịch bản song ngữ (Alt+Shift+V)"
    });

    const statusDiv = el("div", {
      id: "ytDubStatus",
      className: "yt-dub-status",
      textContent: "Sẵn sàng"
    });

    const panel = el("div", { id: "yt-dub-panel", className: "hidden" }, [
      header,
      sourceRow,
      langRow,
      voiceRow,
      pronounRow,
      speedGroup,
      volGroup,
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

    pronounSelect.onchange = (e) => {
      if (!checkContextAlive()) return;
      state.pronounStyle = e.target.value;
      saveSettings();
      if (state.segments.length) {
        // Cập nhật lại toàn bộ bản dịch đã có theo vai xưng hô mới
        for (const [idx, rawTr] of state.rawTranslatedMap.entries()) {
          const updated = formatTranslatedText(rawTr);
          state.translatedMap.set(idx, updated);
          updateScriptItemTranslation(idx, updated);
        }
        if (state.enabled) {
          stopAudioAll();
          clearAudioCache();
          state.enqueuedSet.clear();
          if (state.video) {
            const t = state.video.currentTime;
            for (let i = 0; i < state.segments.length; i++) {
              if (state.segments[i].end < t - 0.3) state.enqueuedSet.add(i);
            }
            pipelineAhead(t, state.sessionToken);
            syncPlayback();
          }
        }
      }
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
          const t = state.video.currentTime;
          for (let i = 0; i < state.segments.length; i++) {
            if (state.segments[i].end < t - 0.3) state.enqueuedSet.add(i);
          }
          pipelineAhead(t, state.sessionToken);
          syncPlayback();
        }
      }
    };

    speedSlider.oninput = (e) => {
      state.speed = parseFloat(e.target.value);
      speedVal.textContent = `${state.speed.toFixed(2)}x`;
      audioQueue.setBaseSpeed(state.speed);
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
    const list = [...(VOICES[state.lang] || VOICES.vi)];

    if (state.hasGoogleKey) {
      if (state.lang === "vi") {
        list.push(
          { id: "google-wavenet-b", label: "Google WaveNet - Nam 1" },
          { id: "google-wavenet-d", label: "Google WaveNet - Nam 2" },
          { id: "google-wavenet-a", label: "Google WaveNet - Nữ 1" },
          { id: "google-wavenet-c", label: "Google WaveNet - Nữ 2" }
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
      el("span", { id: "ytDubScriptTitle", textContent: "Kịch bản song ngữ" }),
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
      titleEl.textContent = `Song ngữ (${state.sourceLang.toUpperCase()} → ${state.lang.toUpperCase()})`;
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
      btn.textContent = state.enabled ? "Tắt thuyết minh (Alt+Shift+D)" : "Bật thuyết minh (Alt+Shift+D)";
      btn.classList.toggle("active", state.enabled);
    }

    const langSel = document.getElementById("ytDubLang");
    if (langSel) langSel.value = state.lang;

    const pSel = document.getElementById("ytDubPronoun");
    if (pSel) pSel.value = state.pronounStyle;

    const sIn = document.getElementById("ytDubSpeed");
    if (sIn) sIn.value = String(state.speed);
    const sVal = document.getElementById("ytDubSpeedVal");
    if (sVal) sVal.textContent = `${state.speed.toFixed(2)}x`;

    const vIn = document.getElementById("ytDubVol");
    if (vIn) vIn.value = String(Math.round(state.origVolume * 100));
    const vVal = document.getElementById("ytDubVolVal");
    if (vVal) vVal.textContent = `${Math.round(state.origVolume * 100)}%`;

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
        reject(new Error("Timeout lấy phụ đề"));
      }, 9000);

      const onMsg = (e) => {
        if (e.source !== window || e.data?.type !== "YT_DUB_SUBTITLES_RESULT" || e.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        if (e.data.success) resolve(e.data);
        else reject(new Error(e.data.error || "Không có phụ đề"));
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
          const raw = state.segments[i].text;
          state.rawTranslatedMap.set(i, raw);
          const formatted = formatTranslatedText(raw);
          state.translatedMap.set(i, formatted);
          updateScriptItemTranslation(i, formatted);
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
        if (indices.length >= 10) break; // Gửi 10 câu/lần để giữ mạch ngữ cảnh hội thoại tốt hơn
      }
    }

    if (!indices.length) return;
    indices.forEach((i) => state.translatingMap.set(i, now));

    try {
      const texts = indices.map((i) => state.segments[i].text);
      const res = await safeSendMessage(
        {
          action: "translateBatch",
          texts,
          targetLang: state.lang,
          sourceLang: state.sourceLang,
          videoTitle: state.videoTitle,
          pronounStyle: state.pronounStyle
        },
        14000
      );
      if (token !== state.sessionToken) return;

      if (res?.success && Array.isArray(res.data)) {
        indices.forEach((segIdx, pos) => {
          const rawTr = res.data[pos] || state.segments[segIdx].text;
          state.rawTranslatedMap.set(segIdx, rawTr);
          const formatted = res.llmHandled ? rawTr : formatTranslatedText(rawTr);
          state.translatedMap.set(segIdx, formatted);
          updateScriptItemTranslation(segIdx, formatted);
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
        { action: "tts", text: textOut, voice: state.voice, lang: state.lang },
        12000
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
    if (inflight >= 4) return;

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
        if (inflight >= 4) break;
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
      setStatus("Đang tạm dừng (Quảng cáo)", "#fbbf24");
      return;
    }

    syncOriginalVideoVolume();

    if (state.video.seeking) {
      audioQueue.pause();
      return;
    }

    const t = state.video.currentTime;
    audioQueue.updateVideoTime(t);
    audioQueue.setVideoPlaybackRate(state.video.playbackRate || 1);
    pipelineAhead(t, state.sessionToken);

    if (state.video.paused) {
      audioQueue.pause();
      return;
    }

    audioQueue.resume();

    for (let i = 0; i < state.segments.length; i++) {
      if (state.enqueuedSet.has(i)) continue;
      const seg = state.segments[i];

      if (seg.start > t + PRE_ENQUEUE_AHEAD_SEC) break;
      if (audioQueue.getQueueLength() >= 3) break;

      if (t > seg.end + 1.2 || t > seg.start + 2.6) {
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
        if (!audioQueue.isCurrentlyPlaying() && t >= seg.start - 0.3) {
          setStatus(`Đang chuẩn bị câu ${i + 1}...`, "#fbbf24");
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
    if (state.enabled && checkContextAlive()) {
      syncOriginalVideoVolume();
      audioQueue.resume();
      startKeepalive();
      startSyncLoop();
      syncPlayback();
    }
  }

  function onPause() {
    stopSyncLoop();
    audioQueue.pause();
    stopKaraokeLoop();
  }

  function onSeeking() {
    stopAudioAll();
    state.enqueuedSet.clear();
  }

  function onSeeked() {
    if (!state.enabled || !state.video || !checkContextAlive()) return;
    const t = state.video.currentTime;
    for (let i = 0; i < state.segments.length; i++) {
      if (state.segments[i].end < t - 0.3) state.enqueuedSet.add(i);
    }
    pipelineAhead(t, state.sessionToken);
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

  async function prebufferInitialSegments(startTime, token) {
    const startIdx = state.segments.findIndex((s) => s.end >= startTime - 0.3);
    if (startIdx < 0) return;

    for (let i = 0; i < startIdx; i++) state.enqueuedSet.add(i);

    const initialCount = Math.min(4, state.segments.length - startIdx);
    const targetIndices = Array.from({ length: initialCount }, (_, k) => startIdx + k);

    setStatus("Đang dịch các câu đầu...", "#fbbf24");
    if (!state.alreadyTranslated) {
      const texts = targetIndices.map((i) => state.segments[i].text);
      try {
        const res = await safeSendMessage(
          {
            action: "translateBatch",
            texts,
            targetLang: state.lang,
            sourceLang: state.sourceLang,
            videoTitle: state.videoTitle,
            pronounStyle: state.pronounStyle
          },
          14000
        );
        if (token !== state.sessionToken) return;
        if (res?.success && Array.isArray(res.data)) {
          targetIndices.forEach((segIdx, pos) => {
            const rawTr = res.data[pos] || state.segments[segIdx].text;
            state.rawTranslatedMap.set(segIdx, rawTr);
            const formatted = res.llmHandled ? rawTr : formatTranslatedText(rawTr);
            state.translatedMap.set(segIdx, formatted);
            updateScriptItemTranslation(segIdx, formatted);
          });
        }
      } catch {}
    } else {
      targetIndices.forEach((segIdx) => {
        const raw = state.segments[segIdx].text;
        state.rawTranslatedMap.set(segIdx, raw);
        const formatted = formatTranslatedText(raw);
        state.translatedMap.set(segIdx, formatted);
        updateScriptItemTranslation(segIdx, formatted);
      });
    }

    if (token !== state.sessionToken) return;
    setStatus("Đang tạo giọng đọc...", "#fbbf24");

    await Promise.race([
      Promise.all(targetIndices.slice(0, 2).map((i) => prepareAudioForIndex(i, token))),
      new Promise((r) => setTimeout(r, 2500))
    ]);
  }

  async function startSession() {
    if (!checkContextAlive()) return;
    const token = ++state.sessionToken;
    stopAudioAll();
    state.segments = [];
    state.rawTranslatedMap.clear();
    state.translatedMap.clear();
    state.translatingMap.clear();
    state.translateCooldownUntil = 0;
    state.enqueuedSet.clear();
    clearAudioCache();

    const video = findVideo();
    if (!video) {
      setStatus("Không tìm thấy video", "#f87171");
      return;
    }
    bindVideoEvents(video);
    applyAudioSettings();
    syncOriginalVideoVolume();
    startKeepalive();

    const wasPlaying = !video.paused;
    setStatus("Đang lấy phụ đề...", "#fbbf24");

try {
      const res = await requestSubtitlesFromPage();
      if (token !== state.sessionToken || state.contextDead) return;

      state.sourceLang = res.sourceLang || "en";
      state.videoTitle = res.videoTitle || "";
      state.availableTracks = Array.isArray(res.availableTracks) ? res.availableTracks : [];
      if (res.selectedVssId && !state.selectedSourceVssId) {
        state.selectedSourceVssId = res.selectedVssId;
      }
      populateSourceTracks();

      state.alreadyTranslated = Boolean(res.translatedByYouTube);
      state.segments = mergeShortSegments(res.segments);

      // Nếu video có sẵn track tiếng Việt do người dịch, ánh xạ trực tiếp theo mốc thời gian (giữ nguyên xưng hô ông - cháu)
      if (Array.isArray(res.nativeTargetSegments) && res.nativeTargetSegments.length > 0) {
        state.segments.forEach((seg, idx) => {
          const hits = res.nativeTargetSegments.filter(
            (t) => t.start < seg.end - 0.12 && t.end > seg.start + 0.12
          );
          if (hits.length > 0) {
            const joined = hits.map((h) => h.text).join(" ").replace(/\s+/g, " ").trim();
            if (joined) {
              state.rawTranslatedMap.set(idx, joined);
              state.translatedMap.set(idx, joined);
            }
          }
        });
      }

      if (!state.segments.length) {
        setStatus("Phụ đề trống", "#f87171");
        return;
      }

      renderScriptList();

      if (wasPlaying) video.pause();
      await prebufferInitialSegments(video.currentTime, token);
      if (token !== state.sessionToken || state.contextDead) return;

      setStatus(`Sẵn sàng (${state.segments.length} câu)`, "#34d399");
      syncOriginalVideoVolume();
      if (wasPlaying) {
        await video.play().catch(() => {});
      }

      if (!video.paused) startSyncLoop();
      pipelineAhead(video.currentTime, token);
      syncPlayback();
    } catch (err) {
      if (token !== state.sessionToken || state.contextDead) return;
      if (wasPlaying && video.paused) video.play().catch(() => {});
      setStatus(err.message, "#f87171");
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
      stopSyncLoop();
      stopKeepalive();
      stopAudioAll();
      syncOriginalVideoVolume();
      setStatus("Đã tắt");
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
    // Reset track nguồn về mặc định của video mới
    state.selectedSourceVssId = "";
    state.availableTracks = [];
    populateSourceTracks();
    injectPlayerControls();

    if (state.enabled) {
      setTimeout(startSession, 600);
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