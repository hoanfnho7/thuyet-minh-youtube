(() => {
  "use strict";

  const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}]";
  const WB_L = `(?<!${WORD_CHAR})`;
  const WB_R = `(?!${WORD_CHAR})`;

  const ACRONYMS_VI = {
    AI: "Ây ai", IT: "Ai ti", CEO: "Xi i ô", CTO: "Xi ti ô", CFO: "Xi ép ô",
    CMO: "Xi em ô", MC: "Em xi", PR: "Pi a", CV: "Xi vi", KPI: "Kây pi ai",
    ROI: "A ô ai", B2B: "Bi tu bi", B2C: "Bi tu xi", VIP: "Víp", KOL: "Kây âu eo",
    PC: "Pi xi", TV: "Ti vi", IQ: "Ai kiu", EQ: "I kiu", UI: "Diu ai", UX: "Diu ích",
    API: "Ây pi ai", NFT: "En ép ti", MVP: "Em vi pi", FAQ: "Ép ây kiu",
    SEO: "Ét i ô", USB: "U ét bê", QR: "Kiu a", ID: "Ai đi", IP: "Ai pi",
    OS: "Ô ét", RAM: "Ram", ROM: "Rom", CPU: "Xê pê u", GPU: "Gờ pê u",
    FPS: "Ép pi ét", HD: "Hát đê", "4K": "Bốn ca", "2K": "Hai ca",
    "3D": "Ba đê", "2D": "Hai đê", OTP: "Ô tê pê", SMS: "Ét em ét",
    HTML: "Hát tê em eo", CSS: "Xê ét ét", JS: "Giây ét"
  };

  const LOANWORDS_VI = {
    chatgpt: "chát gờ pi ti", gpt: "gờ pi ti", youtube: "diu túp",
    youtuber: "diu túp bơ", google: "gú gồ", facebook: "phây búc",
    tiktok: "tích tóc", instagram: "in sờ ta gram", marketing: "ma kết tinh",
    video: "vi đê ô", email: "i meo", website: "wép sai", online: "on lai",
    offline: "óp lai", internet: "in tơ nét", wifi: "wai phai", review: "rì viu",
    vlog: "vê lóc", laptop: "láp tóp", smartphone: "sờ mát phôn",
    iphone: "ai phôn", ipad: "ai pát", macbook: "mác búc", windows: "uyn đô",
    ok: "ô kê", startup: "sờ tát ấp", series: "xê ri", game: "gêm",
    gamer: "gêm mơ", comment: "còm men", share: "se", like: "lai",
    subscribe: "sấp rai", follower: "phô lâu", view: "viu", trend: "tren",
    podcast: "pót cát", content: "còn ten", livestream: "lai chim",
    streamer: "xtrim mơ", stream: "xtrim", update: "ấp đết", upload: "ấp lót",
    download: "đao lót", app: "áp", chip: "chíp", chips: "chíp",
    microchip: "mai-crô-chíp", channel: "chen nồ", clip: "clíp",
    trailer: "trây lơ", intro: "in trô", outro: "ao trô", drama: "đra ma",
    developer: "đe ve lốp pơ", coder: "cốt đơ", code: "cốt", link: "linh",
    team: "tim", pro: "prô", top: "tóp", level: "le vồ", skill: "xkill",
    bug: "bắc", fix: "phích", tool: "tun", server: "sơ vơ", client: "clai ừn",
    data: "đa ta", database: "đa ta bây", project: "prô dét", admin: "át min",
    demo: "đê mô", tutorial: "tu to ri ồ", test: "tét", setup: "xét ắp",
    backup: "bách ắp", password: "pát uốt", login: "lóc in", logout: "lóc ao",
    cloud: "clao", file: "phai", folder: "phâu đơ", feedback: "phít bách",
    report: "ri pót", support: "súp pót", ping: "pin", lag: "lác",
    hack: "hách", hacker: "hách cơ", audio: "o đi ô", camera: "ca me ra",
    free: "phờ ri", premium: "prê mi um", click: "clích", scroll: "sờ cron"
  };

  const ACRONYM_RULES = Object.entries(ACRONYMS_VI)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([k, v]) => [new RegExp(`${WB_L}${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${WB_R}`, "gu"), v]);

  const LOANWORD_RULES = Object.entries(LOANWORDS_VI)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([k, v]) => [new RegExp(`${WB_L}${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${WB_R}`, "giu"), v]);

  const FILLER_RE = new RegExp(
    `${WB_L}(?:um+|uh+|uhm+|hmm+|mm+|erm+|er+|ừm+|ừ+\\s*m+|ờ+|ơ+)${WB_R}(?:\\s*[,.;:!?…-]+\\s*|\\s+|$)`,
    "giu"
  );

  const SOUND_EFFECT_RE =
    /\b(?:music|soundtrack|applause|laughter|laughing|cheering|clapping|sighs?|gasps?|groans?|crying|sobbing|panting|breathing|whistling|humming|singing|instrumental|sound\s+effects?|footsteps?|beeping|buzzing|ringing|knocking|speaking\s+in|off[-\s]?screen|voice[-\s]?over|indistinct)\b|âm\s*nhạc|nhạc\s*nền|nhạc\s*dạo|tiếng\s*cười|cười|vỗ\s*tay|khán\s*giả|thở\s*dài|tiếng\s*thở|khóc|la\s*hét|tiếng\s*động|tiếng\s*súng|tiếng\s*chuông|gõ\s*cửa/iu;

  const SPEAKER_LABEL_RE =
    /^(?:>>+\s*)?(?:(?:Narrator|Speaker(?:\s*\d+)?|Host|Co-Host|Guest(?:\s*\d+)?|Reporter|Interviewer|Interviewee|Announcer|Voiceover|Man|Woman|Người\s*dẫn(?:\s*chuyện)?|Người\s*thuyết\s*minh|Phóng\s*viên|Khách\s*mời)|[A-Z0-9À-Ỹ]{2,}(?:\s+[A-Z0-9À-Ỹ]{2,}){0,3}):\s+(?=[\p{L}\p{N}"“'‘(])/u;

  function isSoundEffectParenthetical(content) {
    const t = (content || "").replace(/\s+/g, " ").trim();
    if (!t) return true;
    return SOUND_EFFECT_RE.test(t);
  }

  function fixBrokenVietnameseWords(s) {
    return s.replace(
      /([\p{L}\p{M}]*[^\x00-\x7F][\p{L}\p{M}]*)\s*(?:\.|…){2,}\s*([\p{L}\p{M}]{1,2})(?=$|[^\p{L}\p{M}])/gu,
      "$1$2"
    );
  }

  function stripTitleDots(s) {
    return s
      .replace(
        new RegExp(`${WB_L}(Mr|Mrs|Ms|Miss|Dr|Prof|Sr|Jr|St|Mt|Rev|Hon|Gov|Sen|Rep|Gen|Col|Capt|Lt|Sgt|Maj)\\.\\s*(?=[\\p{L}\\d])`, "giu"),
        "$1 "
      )
      .replace(
        new RegExp(`${WB_L}(GS|PGS|TS|ThS|BS|DS|KS|CN|KTS)\\.\\s*(?=[\\p{L}\\d])`, "giu"),
        "$1 "
      );
  }

  function cleanTextForTTS(rawText, lang = "vi") {
    if (!rawText) return "";
    const isVi = !lang || lang.toLowerCase().startsWith("vi");

    let s = String(rawText)
      .normalize("NFC")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\u00A0/g, " ");

    s = s
      .replace(/<[^>]+>/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/【[^】]*】/g, " ")
      .replace(/[♪♫♬♩🎵🎶]/gu, " ")
      .replace(SPEAKER_LABEL_RE, "")
      .replace(/\(([^)]*)\)/g, (_, inner) => (isSoundEffectParenthetical(inner) ? " " : ` ${inner.trim()} `))
      .replace(/[|\\^<>#*~`"]/g, " ")
      .replace(/\s*[\u2013\u2014\u2015]\s*/g, ", ");

    if (isVi) {
      s = s
        .replace(/(?<![\d/])24\s*\/\s*24\s*[hH]\b/gu, "hai bốn trên hai bốn giờ")
        .replace(/(?<![\d/])24\s*\/\s*24(?![\d/])/gu, "hai bốn trên hai bốn")
        .replace(/(?<=^|[\s,;:(\["'«“—–-])([vV])\s*\.\s*([vV])\.?(?=$|[\s,;:!?)\]"'»”])/gu, "vân vân");

      s = s
        .replace(new RegExp(`${WB_L}(những\\s+)?con\\s+khoai\\s+tây\\s+chiên${WB_R}`, "giu"), (_, p1) => (p1 || "") + "con chip")
        .replace(
          new RegExp(`(?<=(?:ngành|sản\\s*xuất|chế\\s*tạo|nhà\\s*máy|bán\\s*dẫn|vi\\s*mạch|điện\\s*tử|công\\s*nghệ|phần\\s*cứng|máy\\s*tính|bộ\\s*xử\\s*lý)\\s+)khoai\\s+tây\\s+chiên${WB_R}`, "giu"),
          "chip"
        );

      s = s
        .replace(/(?<!,\d)\b\d{1,3}(?:\s*,\s*\d{3})+(?!,\d)\b/g, (m) => m.replace(/\s*,\s*/g, ""))
        .replace(/(?<!\.\d)\b\d{1,3}(?:\s*\.\s*\d{3})+(?!\.\d)\b/g, (m) => m.replace(/\s*\.\s*/g, ""));

      s = s
        .replace(/(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])\s*(?:millions?|milion)(?!\p{L})/giu, "$1 triệu")
        .replace(/(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])\s*(?:billions?|bilion)(?!\p{L})/giu, "$1 tỷ")
        .replace(/(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])\s*(?:trillions?|trilion)(?!\p{L})/giu, "$1 nghìn tỷ")
        .replace(/(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])\s*(?:thousands?)(?!\p{L})/giu, "$1 nghìn")
        .replace(/(?<![\d.])(\d+(?:[.,]\d+)?)(?![\d.])\s*[kK](?!\p{L})/gu, "$1 nghìn")
        .replace(/(?<![\d.])(\d+\.\d+)(?![\d.])\s*[mM](?!\p{L})/gu, "$1 triệu")
        .replace(/(?<![\d.])(\d+\.\d+)(?![\d.])\s*[bB](?!\p{L})/gu, "$1 tỷ");

      s = s
        .replace(/(?<![\d.])(\d+)\s*\.\s*(?!000(?!\d))(\d{1,2})(?![\d.])/g, "$1 phẩy $2")
        .replace(/(?<![\d,])(\d+)\s*,\s*(\d{1,2})(?!\d)/g, "$1 phẩy $2");

      for (const [re, rep] of ACRONYM_RULES) s = s.replace(re, rep);
      for (const [re, rep] of LOANWORD_RULES) s = s.replace(re, rep);
    }

    s = s.replace(FILLER_RE, " ");
    s = stripTitleDots(s);
    if (isVi) s = fixBrokenVietnameseWords(s);

    s = s
      .replace(/\.{2,}/g, ",")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([,;:!?])(?=\S)/g, "$1 ")
      .replace(/(?<!\d)\.(?=[^\s.\d])/g, ". ")
      .replace(/([.!?])\s+([.!?])/g, "$1$2")
      .replace(/\s*[,;:—–-]+\s*([.?!]*)$/g, (_, p1) => p1 || "")
      .replace(/\s+/g, " ")
      .trim();

    return s;
  }

  // =========================================================================
  // 2. TÁCH & GỘP CÂU
  // =========================================================================
  const ABBREV_END_RE =
    /^(?:mr|mrs|ms|dr|prof|sr|jr|st|mt|vs|etc|e\.g|i\.e|a\.m|p\.m|no|vol|fig|gs|pgs|ts|ths|bs|ds|ks|cn|kts|tp|tt|tx|v\.v|đ\/c|\p{L}|\d+)$/iu;

  const TRAILING_CONJUNCTION_RE = new RegExp(
    `${WB_L}(?:a|an|the|and|or|but|because|so|that|which|who|when|while|if|to|of|for|with|without|in|on|at|by|from|as|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|should|would|will|may|might|must|not|just|still|very|really|more|most|this|these|those|your|our|their|his|her|its|và|hoặc|nhưng|vì|do|bởi|nếu|khi|mà|để|với|trong|ngoài|trên|dưới|trước|sau|từ|đến|tới|ở|tại|theo|là|có|gồm|thuộc|đang|đã|sẽ|vừa|mới|sắp|từng|vẫn|còn|luôn|không|chẳng|chưa|phải|cần|nên|muốn|rất|quá|những|các|một|mỗi|mọi|của)${WB_R}$`,
    "iu"
  );

  const LEADING_CLAUSE_RE =
    /^\s*(?:and|but|so|because|although|however|which|who|when|while|if|before|after|since|unless|whereas|where|why|how|then|or|và|nhưng|vì|cho nên|tuy nhiên|nếu|mà|khi|mặc dù|hoặc|rồi|bởi vì|nên)\b/iu;

  const VI_COMPOUNDS = new Set([
    "chủ đích","nguồn lực","kế hoạch","tập trung","chú ý","kết quả","thực tế","bắt đầu","xuất phát","phát triển",
    "thời gian","phương pháp","giải pháp","khả năng","cơ hội","thử thách","điều kiện","tác động","ảnh hưởng",
    "nhiệm vụ","mục tiêu","hiệu quả","chất lượng","kinh nghiệm","kiến thức","thông tin","quy trình","công nghệ",
    "hệ thống","cấu trúc","môi trường","xã hội","con người","tương lai","quá khứ","hiện tại","nội dung","hình thức",
    "khái niệm","định nghĩa","quan điểm","ý kiến","lý do","nguyên nhân","hậu quả","kết luận","tóm lại","ý tưởng",
    "nguyên tắc","tiêu chuẩn","phạm vi","tiềm năng","lợi ích","rủi ro","giá trị","bản chất","khía cạnh","vai trò",
    "lĩnh vực","đối tượng","phương tiện","thiết bị","thông điệp","góc nhìn","thói quen","thái độ","phản ứng",
    "hành vi","suy nghĩ","lựa chọn","quyết định","hành động","cơ sở","nền tảng","chiến lược","mô hình","động lực",
    "chúng tôi","chúng ta","bạn bè","gia đình","bản thân","mọi người","người dùng","người xem","người nghe",
    "quốc gia","chính phủ","thành phố","thế giới","vấn đề","câu hỏi","câu trả lời","giải thích","phân tích",
    "đánh giá","kiểm tra","so sánh","ý nghĩa","sự thật","cho biết","cho thấy","cho rằng","nhận thấy","xác định",
    "người khác","người ta","điều này","điều đó","cái này","cái đó","việc này","việc đó","cách này","cách đó",
    "lúc này","lúc đó","khi này","khi đó","bất cứ","bất kỳ","bất ngờ","bao nhiêu","bao lâu","bao giờ","như thế",
    "như vậy","thế nào","ngay cả","ngay khi","ngay lập tức","cho dù","cho nên","dựa trên","dựa vào","bởi vì",
    "do đó","vì thế","vì vậy","nói chung","nhìn chung","làm sao","làm việc","nhận ra","mang lại","đưa ra","tạo ra",
    "trở thành","sản phẩm","dịch vụ","thị trường","doanh nghiệp","khách hàng","thành công","thất bại","kỹ năng",
    "tư duy","tài chính","kinh tế","chi phí","lợi nhuận","doanh thu","đầu tư","cộng đồng","chính sách","dự án",
    "thương hiệu","công ty","ứng dụng","dữ liệu","tài liệu","công cụ","phần mềm","phần cứng","tự động","thông minh",
    "bảo mật","phụ đề","âm thanh","hình ảnh","mạng xã hội","tài khoản","mật khẩu","máy tính","lập trình","thuật toán",
    "trí tuệ","nhân tạo","văn hóa","giáo dục","nghiên cứu","học tập","khoa học","lịch sử","sức khỏe","năng lượng",
    "cảm xúc","tâm lý","thực hiện","hoàn thành","xây dựng","thay đổi","cải thiện","nâng cao","mở rộng","duy trì",
    "bảo vệ","hỗ trợ","tương tác","kết nối","chia sẻ","sáng tạo","thiết kế","quản lý","phát hiện","trải nghiệm",
    "quan trọng","cần thiết","thực sự","tự nhiên","đặc biệt","phổ biến","trực tiếp","tích cực","tiêu cực","rõ ràng",
    "cụ thể","chi tiết","linh hoạt","đa dạng","phức tạp","đơn giản","nhanh chóng","liên tục","ổn định","chính xác",
    "an toàn","nguy hiểm","phù hợp","tương tự","khác biệt","mạnh mẽ","cơ bản","đầy đủ","toàn diện","chắc chắn",
    "hiệu quả","hợp lý","tuyệt vời","khó khăn","nghiêm trọng","hầu hết","đa số","phần lớn","toàn bộ","một số",
    "hôm nay","ngày mai","hôm qua","bây giờ","tất cả","hoàn toàn","hơn nữa","ngoài ra","ngược lại","đồng thời",
    "mặt khác","bên cạnh","ví dụ","trước hết","tất nhiên","có thể","gần đây","hiện nay","trước đây"
  ]);

  function tokenizeLower(text) {
    return text
      .trim()
      .replace(/^[.,;:!?…"'`\u201c\u201d\u2018\u2019\(\[\{-]+/u, "")
      .replace(/[.,;:!?…"'`\u201c\u201d\u2018\u2019\)\]\}-]+$/u, "")
      .split(/\s+/)
      .map((w) => w.replace(/[.,;:!?…"'`\u201c\u201d\u2018\u2019\(\)\[\]\{\}-]+/gu, "").toLowerCase())
      .filter(Boolean);
  }

  function isAbbreviationEnd(text) {
    const tokens = tokenizeLower(text);
    const last = tokens[tokens.length - 1] || "";
    return Boolean(last) && ABBREV_END_RE.test(last);
  }

  function startsWithCapital(text) {
    const m = text.trim().match(/^[\s"'`\u201c\u201d\u2018\u2019\(\[\{]*([\p{L}])/u);
    if (!m) return false;
    const ch = m[1];
    return ch === ch.toLocaleUpperCase() && ch !== ch.toLocaleLowerCase();
  }

  function isForbiddenBoundary(prev, next) {
    const p = prev.trim();
    const n = next.trim();
    if (!p || !n) return false;

    const endsTerminal = /[.!?]$/.test(p);
    const isAbbr = isAbbreviationEnd(p.replace(/[.!?]+$/, ""));
    if (endsTerminal && !isAbbr && startsWithCapital(n)) return false;

    const pTokens = tokenizeLower(p);
    const nTokens = tokenizeLower(n);
    const last = pTokens[pTokens.length - 1] || "";
    const first = nTokens[0] || "";
    if (!last || !first) return false;

    if (/\b\d+\.?$/.test(p) && /^\d+/.test(n)) return true;
    if (/\b\d+(?:[.,]\d+)?\.?$/.test(p) && /^(?:triệu|tỷ|nghìn|ngàn|trăm|million|billion|thousand|k|m|b|%|phần\s*trăm)\b/iu.test(n)) return true;
    if (/^(?:mr|mrs|ms|dr|prof|sr|jr|st|gs|pgs|ts|ths|bs|ds|ks|cn|kts|tp|tt|tx)$/iu.test(last)) return true;
    if (VI_COMPOUNDS.has(`${last} ${first}`)) return true;
    if (/^(?:đang|đã|sẽ|vừa|mới|sắp|từng|vẫn|còn|luôn|không|chẳng|chưa|phải|cần|nên|muốn|rất|quá|trong|ngoài|trên|dưới|trước|sau|giữa|cùng|với|bằng|cho|về|từ|đến|tới|ở|tại|theo|là|có|của|một|hai|ba|bốn|năm|nhiều|ít|mỗi|mọi|các|những|con|cái|chiếc|người)$/iu.test(last)) {
      return true;
    }
    return false;
  }

  function countWords(text) {
    const t = text.trim();
    if (!t) return 0;
    const cjk = t.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu);
    if (cjk && cjk.length > 0) {
      const latin = t.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
        .split(/\s+/).filter(Boolean).length;
      return latin + cjk.length;
    }
    return t.split(/\s+/).filter(Boolean).length;
  }

  function splitByInternalPunctuation(segments) {
    const out = [];
    const splitRe =
      /(?<=[.!?;:\u2026\u061f\u06d4])\s+(?=[^\s])|(?<=[\u3002\uff01\uff1f]["'`\u201c\u201d\u300d\u300f\uff09\)]?)\s*(?=[^\s\u3002\uff01\uff1f\u2026])/gu;

    for (const seg of segments) {
      const text = (seg.text || "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      const matches = [...text.matchAll(splitRe)].filter((m) => {
        const left = text.slice(0, m.index).trim();
        const right = text.slice(m.index).trim();
        if (isForbiddenBoundary(left, right)) return false;
        if (text[m.index - 1] === ".") {
          if (/\b\d+\.$/.test(left) && /^\d+/.test(right)) return false;
          if (isAbbreviationEnd(left.replace(/[.!?]+$/, ""))) return false;
        }
        return true;
      });

      if (matches.length === 0) {
        out.push({ text, startTime: seg.startTime, endTime: seg.endTime });
        continue;
      }

      const parts = [];
      let cursor = 0;
      for (const m of matches) {
        const piece = text.slice(cursor, m.index).trim();
        if (piece) parts.push(piece);
        cursor = m.index + m[0].length;
      }
      const tail = text.slice(cursor).trim();
      if (tail) parts.push(tail);

      if (parts.length <= 1) {
        out.push({ text, startTime: seg.startTime, endTime: seg.endTime });
        continue;
      }

      const dur = Math.max(0.15, seg.endTime - seg.startTime);
      const totalLen = Math.max(1, text.length);
      let t = seg.startTime;
      for (let i = 0; i < parts.length; i++) {
        const share = dur * (parts[i].length / totalLen);
        const end = i === parts.length - 1 ? seg.endTime : Math.min(seg.endTime, t + share);
        out.push({ text: parts[i], startTime: t, endTime: Math.max(t + 0.1, end) });
        t = end;
      }
    }
    return out;
  }

  function mergeCaptionSegments(rawSegments, options = {}) {
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) return [];

    const preSplit = splitByInternalPunctuation(rawSegments);
    const isCJK = preSplit.some((s) => {
      const c = s.text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu);
      return c && c.length / Math.max(1, s.text.replace(/\s+/g, "").length) >= 0.35;
    });

    const {
      minChars = isCJK ? 8 : 22,
      maxDuration = 5.0,
      maxUnpunctuatedDuration = 6.8,
      maxGap = 0.38,
      hardGap = 0.95,
      maxChars = isCJK ? 45 : 115,
      maxWords = 19
    } = options;

    const terminalRe = /[.!?;:\u2026\u3002\uff01\uff1f][\s"'`\u201c\u201d\u2018\u2019\)\]\}]*$/u;
    const clauseRe = /[,;:\u2013\u2014-][\s"'`\u201c\u201d\u2018\u2019\)\]\}]*$/u;

    const merged = [];
    let cur = null;

    for (const seg of preSplit) {
      const text = seg.text;
      if (!cur) {
        cur = { text, startTime: seg.startTime, endTime: seg.endTime };
        continue;
      }

      const curText = cur.text.trim();
      const gap = Math.max(0, seg.startTime - cur.endTime);
      const combined = `${curText} ${text}`.replace(/\s+/g, " ").trim();
      const totalDur = seg.endTime - cur.startTime;

      const curWords = countWords(curText);
      const combinedWords = countWords(combined);
      const enoughMin = curText.length >= minChars || curWords >= 4;
      const enoughSoft = curText.length >= Math.max(16, minChars - 6) || curWords >= 3;

      const endsTerminal = terminalRe.test(curText);
      const endsClause = clauseRe.test(curText);
      const hasAnyPunct = /[.!?;:\u2026\u3002\uff01\uff1f]/u.test(curText);
      const nextCapital = startsWithCapital(text);
      const nextLeadingClause = LEADING_CLAUSE_RE.test(text);
      const forbidden = isForbiddenBoundary(curText, text);
      const trailingConj = TRAILING_CONJUNCTION_RE.test(curText);

      const durLimit = hasAnyPunct ? maxDuration : maxUnpunctuatedDuration;
      const overSoftLimit = combined.length > maxChars || combinedWords > maxWords;
      const overHardLimit = combined.length > maxChars + 55 || combinedWords > maxWords + 5;

      const shouldBreak =
        (gap >= hardGap && !forbidden) ||
        overHardLimit ||
        (!forbidden && (
          (endsTerminal && nextCapital && enoughSoft) ||
          (endsTerminal && enoughSoft && gap > Math.min(0.25, maxGap)) ||
          (endsClause && enoughMin && !trailingConj && (gap > maxGap || overSoftLimit || nextLeadingClause)) ||
          (totalDur > durLimit && (endsTerminal || endsClause || (nextCapital && !trailingConj)) && enoughMin) ||
          (overSoftLimit && !trailingConj && (endsTerminal || endsClause || nextCapital || gap > 0.18))
        ));

      if (shouldBreak) {
        merged.push(cur);
        cur = { text, startTime: seg.startTime, endTime: seg.endTime };
      } else {
        cur.text = combined;
        cur.endTime = seg.endTime;
      }
    }

    if (cur) merged.push(cur);
    return merged;
  }

  // =========================================================================
  // 3. TÁCH TỪ KARAOKE ĐA NGÔN NGỮ
  // =========================================================================
  function segmentWordsForKaraoke(text, lang) {
    const clean = String(text || "").trim();
    if (!clean) return [];

    const needsSegmenter =
      (lang && /^(?:zh|ja|th|yue)/i.test(lang)) ||
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(clean);

    if (needsSegmenter && typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      try {
        const segmenter = new Intl.Segmenter(lang || undefined, { granularity: "word" });
        const result = [];
        let buf = "";
        let trailingSpace = false;

        for (const part of segmenter.segment(clean)) {
          const s = part.segment;
          if (/^\s+$/.test(s)) {
            if (buf) trailingSpace = true;
            else if (result.length > 0) result[result.length - 1].trailingSpace = true;
          } else {
            if (buf && trailingSpace) {
              result.push({ text: buf, trailingSpace: true });
              buf = "";
              trailingSpace = false;
            }
            if (part.isWordLike) {
              if (buf) result.push({ text: buf, trailingSpace: false });
              buf = s;
            } else {
              buf += s;
            }
          }
        }
        if (buf) result.push({ text: buf, trailingSpace });
        if (result.length > 0) return result;
      } catch {}
    }

    const tokens = clean.split(/\s+/).filter(Boolean);
    return tokens.map((w, idx) => ({ text: w, trailingSpace: idx < tokens.length - 1 }));
  }

  // =========================================================================
  // 4. HÀNG ĐỢI AUDIO (2 chế độ: Mặc định tự khớp nhịp video / Tùy chỉnh tốc độ cố định)
  // =========================================================================
  const PRE_ROLL_SEC = 0.12;

  class DubAudioQueue {
    constructor() {
      this.queue = [];
      this.currentAudio = null;
      this.currentItem = null;
      this.nextAudioPreload = null;
      this.isPlaying = false;
      this.isPausedByVideo = false;
      this.volume = 1.0;
      this.autoPacing = true; // true = Mặc định (tự co giãn khớp nhịp video), false = Tùy chỉnh tốc độ thủ công
      this.baseSpeed = 1.25;
      this.providerSpeedMultiplier = 0.92;
      this.videoPlaybackRate = 1.0;
      this.lastVideoTime = 0;
      this.generation = 0;
      this.playNextTimer = null;

      this.lastAudioTime = -1;
      this.lastAudioProgressAt = 0;

      this.onChunkStart = null;
      this.onChunkEnd = null;
      this.onStateChange = null;
    }

    isQueued(chunkId) {
      return (
        this.currentItem?.chunkId === chunkId ||
        this.queue.some((q) => q.chunkId === chunkId)
      );
    }

    enqueue(item, options = {}) {
      if (this.isQueued(item.chunkId)) return;

      if (this.queue.length >= 50) {
        const dropped = this.queue.shift();
        this._revoke(dropped?.url, dropped?.noRevoke);
      }

      this.queue.push({
        ...item,
        gen: this.generation,
        noRevoke: Boolean(options.noRevoke)
      });

      this._emitState();

      if (this.isPausedByVideo) {
        this._preloadNext();
        return;
      }

      if (!this.isPlaying && this.currentAudio && this.currentItem) {
        this.resume();
        this._preloadNext();
      } else if (!this.isPlaying && this.queue.length > 0) {
        this._preloadNext();
        if (!this.playNextTimer) {
          const first = this.queue[0];
          const targetStart = Math.max(0, first.startTime - PRE_ROLL_SEC);
          const delta = this.lastVideoTime > 0 ? this.lastVideoTime - targetStart : 0;
          if (delta < -0.04) {
            const waitMs = Math.min(2500, (Math.abs(delta) / this.videoPlaybackRate) * 1000);
            this.playNextTimer = setTimeout(() => {
              this.playNextTimer = null;
              if (!this.isPausedByVideo) this.playNext();
            }, waitMs);
          } else {
            this.playNext();
          }
        }
      } else {
        this._preloadNext();
      }
    }

    _finishCurrentChunk(audio) {
      if (this.currentAudio !== audio) return;
      const endedItem = this.currentItem;
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      } catch {}
      if (endedItem) this._revoke(endedItem.url, endedItem.noRevoke);
      this.currentAudio = null;
      this.currentItem = null;
      this.isPlaying = false;
      this.lastAudioTime = -1;
      this.lastAudioProgressAt = 0;
      this.onChunkEnd?.(endedItem);
      if (!this.isPausedByVideo) this._scheduleNext(endedItem?.endTime);
    }

    playNext() {
      this._clearTimer();
      if (this.isPausedByVideo) return;

      while (this.queue.length > 0 && this.queue[0].gen !== this.generation) {
        const stale = this.queue.shift();
        this._revoke(stale?.url, stale?.noRevoke);
      }

      if (this.queue.length === 0) {
        this.isPlaying = false;
        this._releaseCurrent(false);
        this._releasePreload();
        this._emitState();
        return;
      }

      const item = this.queue.shift();
      this._releaseCurrent(false);

      this.isPlaying = true;
      this.currentItem = item;
      this.lastAudioTime = -1;
      this.lastAudioProgressAt = Date.now();

      let audio;
      if (this.nextAudioPreload && this.nextAudioPreload.src === item.url) {
        audio = this.nextAudioPreload;
        this.nextAudioPreload = null;
      } else {
        audio = new Audio(item.url);
      }

      audio.volume = this.volume;
      audio.preservesPitch = true;
      audio.playbackRate = this._calcRate(item, audio);
      this.currentAudio = audio;

      const syncOnMeta = () => {
        if (this.currentAudio === audio) {
          audio.playbackRate = this._calcRate(item, audio);
        }
      };
      if (audio.readyState >= 1) syncOnMeta();
      else audio.addEventListener("loadedmetadata", syncOnMeta, { once: true });

      this._preloadNext();

      audio.onended = () => this._finishCurrentChunk(audio);
      audio.onerror = () => this._finishCurrentChunk(audio);

      audio
        .play()
        .then(() => {
          if (this.currentAudio !== audio) return;
          this.isPlaying = true;
          this.lastAudioProgressAt = Date.now();
          this.onChunkStart?.(item, audio);
          this._emitState();
        })
        .catch(() => {
          if (this.currentAudio === audio) {
            this._finishCurrentChunk(audio);
          }
        });
    }

    _scheduleNext(prevEndTime) {
      this._clearTimer();
      if (this.isPausedByVideo || this.queue.length === 0) {
        this._emitState();
        return;
      }

      const next = this.queue[0];
      const targetStart = Math.max(0, next.startTime - PRE_ROLL_SEC);
      const lag = this.lastVideoTime - targetStart;

      this._preloadNext();

      if (lag < -0.04) {
        const waitMs = Math.min(3000, (Math.abs(lag) / this.videoPlaybackRate) * 1000);
        this.playNextTimer = setTimeout(() => {
          this.playNextTimer = null;
          if (!this.isPausedByVideo) this.playNext();
        }, waitMs);
      } else if (lag > 0.35) {
        const breathMs = Math.max(140, Math.round(170 / this.videoPlaybackRate));
        this.playNextTimer = setTimeout(() => {
          this.playNextTimer = null;
          if (!this.isPausedByVideo) this.playNext();
        }, breathMs);
      } else {
        const naturalGap = prevEndTime !== undefined ? Math.max(0, next.startTime - prevEndTime) : 0;
        const pauseSec = naturalGap > 0.12 ? Math.min(Math.max(naturalGap, 0.18), 2.2) : 0.18;
        let waitMs = Math.round((pauseSec * 1000) / this.videoPlaybackRate);
        if (lag > 0.04) {
          waitMs = Math.max(150, waitMs - Math.round(((lag - 0.04) * 1000) / this.videoPlaybackRate));
        }
        this.playNextTimer = setTimeout(() => {
          this.playNextTimer = null;
          if (!this.isPausedByVideo) this.playNext();
        }, waitMs);
      }
    }

    _preloadNext() {
      const next = this.queue.find((q) => q.gen === this.generation);
      if (!next) return;
      if (this.nextAudioPreload && this.nextAudioPreload.src === next.url) return;
      this._releasePreload();
      this.nextAudioPreload = new Audio();
      this.nextAudioPreload.preload = "auto";
      this.nextAudioPreload.src = next.url;
      this.nextAudioPreload.load();
    }

    _calcRate(item = null, audio = null) {
      const vRate = this.videoPlaybackRate;

      // Chế độ 1: Mặc định (Tự động co giãn tốc độ khớp nhịp người nói trong video)
      if (this.autoPacing) {
        const minNaturalRate = 0.96 * vRate;
        const maxAutoRate = 1.65 * vRate;
        if (item && audio && Number.isFinite(audio.duration) && audio.duration > 0.3) {
          const deadline = item.nextStartTime
            ? Math.min(item.endTime + 0.35, item.nextStartTime - 0.16)
            : item.endTime + 0.25;
          const now = this.lastVideoTime > 0 ? Math.max(this.lastVideoTime, item.startTime) : item.startTime;
          const availableSec = Math.max(0.7, (deadline - now) / vRate);
          const remainingAudio = Math.max(0.2, audio.duration - (audio.currentTime || 0));
          const fitRate = (remainingAudio / availableSec) * vRate;
          return Math.max(minNaturalRate, Math.min(maxAutoRate, fitRate * 1.04));
        }
        return Math.max(minNaturalRate, 1.15 * vRate * this.providerSpeedMultiplier);
      }

      // Chế độ 2: Tùy chỉnh thủ công (Đọc đúng tốc độ người dùng kéo trên thanh trượt)
      const manualRate = this.baseSpeed * this.providerSpeedMultiplier * vRate;
      return Math.max(0.75, Math.min(2.2, manualRate));
    }

    _syncRate() {
      if (!this.currentAudio) return;
      const target = this._calcRate(this.currentItem, this.currentAudio);
      if (Math.abs(this.currentAudio.playbackRate - target) >= 0.03) {
        this.currentAudio.playbackRate = target;
      }
    }

    updateVideoTime(currentTime) {
      this.lastVideoTime = currentTime;
      this._syncRate();

      if (!this.isPausedByVideo && this.currentAudio) {
        const a = this.currentAudio;
        if (a.ended) {
          this._finishCurrentChunk(a);
          return;
        }
        const curT = a.currentTime || 0;
        if (Math.abs(curT - this.lastAudioTime) > 0.01) {
          this.lastAudioTime = curT;
          this.lastAudioProgressAt = Date.now();
        } else if (this.lastAudioProgressAt > 0 && Date.now() - this.lastAudioProgressAt > 4000) {
          this._finishCurrentChunk(a);
          return;
        }
      }

      if (!this.isPausedByVideo && this.playNextTimer && !this.isPlaying && this.queue.length > 0) {
        const targetStart = Math.max(0, this.queue[0].startTime - PRE_ROLL_SEC);
        if (currentTime >= targetStart) {
          this._clearTimer();
          this.playNext();
        }
      }
    }

    pause() {
      this.isPausedByVideo = true;
      this._clearTimer();
      if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause();
      }
      this.isPlaying = false;
      this._emitState();
    }

    resume() {
      this.isPausedByVideo = false;
      if (this.currentAudio && this.currentAudio.paused) {
        this.lastAudioProgressAt = Date.now();
        this.currentAudio
          .play()
          .then(() => {
            this.isPlaying = true;
            if (this.currentItem) this.onChunkStart?.(this.currentItem, this.currentAudio);
            this._emitState();
          })
          .catch(() => {
            if (this.currentAudio) this._finishCurrentChunk(this.currentAudio);
          });
      } else if (!this.isPlaying && this.queue.length > 0 && !this.playNextTimer) {
        this._scheduleNext();
      }
    }

    clear() {
      this._clearTimer();
      this._releaseCurrent(true);
      this._releasePreload();
      this.queue.forEach((q) => this._revoke(q.url, q.noRevoke));
      this.queue = [];
      this.isPlaying = false;
      this.isPausedByVideo = false;
      this.currentItem = null;
      this.lastAudioTime = -1;
      this.lastAudioProgressAt = 0;
      this.generation++;
      this._emitState();
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.currentAudio) this.currentAudio.volume = this.volume;
    }

    setAutoPacing(flag) {
      this.autoPacing = Boolean(flag);
      this._syncRate();
    }

    setBaseSpeed(s) {
      this.baseSpeed = Math.max(0.8, Math.min(2.0, s));
      this._syncRate();
    }

    setProviderSpeedMultiplier(m) {
      this.providerSpeedMultiplier = m;
      this._syncRate();
    }

    setVideoPlaybackRate(r) {
      this.videoPlaybackRate = Math.max(0.1, r);
      this._syncRate();
    }

    getQueueLength() {
      return this.queue.length;
    }

    isCurrentlyPlaying() {
      return Boolean(this.isPlaying && this.currentAudio && !this.currentAudio.paused);
    }

    _clearTimer() {
      if (this.playNextTimer) {
        clearTimeout(this.playNextTimer);
        this.playNextTimer = null;
      }
    }

    _releaseCurrent(revoke) {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.src = "";
      }
      if (revoke && this.currentItem) {
        this._revoke(this.currentItem.url, this.currentItem.noRevoke);
      }
      this.currentAudio = null;
      this.currentItem = null;
    }

    _releasePreload() {
      if (this.nextAudioPreload) {
        this.nextAudioPreload.pause();
        this.nextAudioPreload.src = "";
        this.nextAudioPreload = null;
      }
    }

    _revoke(url, noRevoke) {
      if (url && !noRevoke && url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    }

    _emitState() {
      if (!this.onStateChange) return;
      this.onStateChange({
        isPlaying: this.isPlaying,
        currentItem: this.currentItem,
        queueLen: this.queue.length
      });
    }
  }

  window.DubCore = {
    cleanTextForTTS,
    cleanTextForViTTS: cleanTextForTTS,
    mergeCaptionSegments,
    segmentWordsForKaraoke,
    DubAudioQueue
  };
})();