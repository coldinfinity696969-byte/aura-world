/* ============================================================
   AURA WORLD — UI, check-in, мок-AI, история, активности
   ============================================================ */

"use strict";

/* ---------- данные check-in ---------- */

const MOODS = [
  "устал", "пусто", "злой", "тревожно", "спокойно", "влюблён",
  "хочу исчезнуть", "хочу движ", "хаос", "красиво, но больно", "норм, но странно"
];

const DRAINS = [
  "люди", "работа / учёба", "тревога", "телефон", "быт",
  "недосып", "всё сразу", "ничего — день норм"
];

const WANTS = [
  "тишины", "тепла", "движа", "ясности", "чтобы отстали", "обнять кого-то"
];

const ENERGY_LABELS = [
  [20, "почти нет сил"], [40, "энергосбережение"], [60, "средне"],
  [80, "живой"], [100, "много энергии"]
];
const SOCIAL_LABELS = [
  [20, "не трогать"], [40, "могу ответить мемом"], [60, "можно общаться, но без давления"],
  [80, "готов на встречу"], [100, "хочу людей / движ"]
];
const NOISE_LABELS = [
  [20, "внутри тихо"], [40, "лёгкий фон"], [60, "заметный шум"],
  [80, "громко"], [100, "всё орёт одновременно"]
];

const ENERGY_STATUS = [
  [20, "На нуле. Береги себя."], [40, "Мало. Сначала отдых."],
  [60, "Ровно. Без разгона."], [80, "Живой. Трать с умом."],
  [100, "Перегрев. Направь его."]
];
const SOCIAL_STATUS = [
  [20, "На нуле. Громко вокруг."], [40, "Тихо. Нужен свой угол."],
  [60, "Открыт, без давления."], [80, "Готов к людям."],
  [100, "Хочется людей и движа."]
];

const answers = { mood: null, energy: 50, social: 50, drain: null, want: null, noise: 40, note: "" };

/* ---------- мок-AI: пресеты миров ---------- */

const MOOD_PRESETS = {
  "устал": {
    world_type: "ocean", kicker: "МИР ОКЕАНА", rail: "ОКЕАН",
    world_name: "Океан синей статики", mood_label: "устал, но недосягаем", mood_tag: "МЕЛАНХОЛИЯ",
    main: "#5C8DFF", dark: "#070A18", accent: "#D9F1FF",
    phrase: "Ты не исчез. Ты просто ушёл туда, где тебя нельзя трогать руками."
  },
  "пусто": {
    world_type: "space", kicker: "КОСМОС", rail: "КОСМОС",
    world_name: "Пустая орбита", mood_label: "тихая пустая гравитация", mood_tag: "ПУСТОТА",
    main: "#8FA3BF", dark: "#070910", accent: "#E6EDF7",
    phrase: "Пустота — это не дыра. Иногда это орбита, на которой ты просто отдыхаешь."
  },
  "злой": {
    world_type: "desert", kicker: "МИР ПЕПЛА", rail: "ПЕПЕЛ",
    world_name: "Сгоревший мираж", mood_label: "сплошной огонь, воды не осталось", mood_tag: "ПЕРЕГРЕВ",
    main: "#C9502E", dark: "#140503", accent: "#FFB36B",
    phrase: "Внутри сегодня жарко. Этому огню нужно направление, а не зрители."
  },
  "тревожно": {
    world_type: "neon", kicker: "НЕОНОВАЯ КОМНАТА", rail: "НЕОН",
    world_name: "Беспокойная комната", mood_label: "сигналы, которые не замолкают", mood_tag: "НА ВЗВОДЕ",
    main: "#B58CFF", dark: "#0B0614", accent: "#E3D2FF",
    phrase: "Похоже, сигналы сегодня идут без пауз. Это шум, а не правда о тебе."
  },
  "спокойно": {
    world_type: "forest", kicker: "ЛЕС СНОВ", rail: "ЛЕС",
    world_name: "Тихая роща", mood_label: "медленная зелёная тишина", mood_tag: "ШТИЛЬ",
    main: "#5FBFA0", dark: "#04100C", accent: "#CFFFE9",
    phrase: "Сегодня внутри тихо и зелено. Редкое место — побудь в нём подольше."
  },
  "влюблён": {
    world_type: "forest", kicker: "ЛЕС СНОВ", rail: "ЛЕС",
    world_name: "Цветущая тишина", mood_label: "мягко, скрыто, тихо светится", mood_tag: "НЕЖНОСТЬ",
    main: "#9B6BD4", dark: "#0A0614", accent: "#F2B8E8",
    phrase: "В твоём лесу сегодня что-то цветёт. Это заметно даже в темноте."
  },
  "хочу исчезнуть": {
    world_type: "ocean", kicker: "МИР ОКЕАНА", rail: "ОКЕАН",
    world_name: "Глубокая тишина", mood_label: "ниже уровня шума", mood_tag: "ГЛУБИНА",
    main: "#3D5A9E", dark: "#04060E", accent: "#B8CDFF",
    phrase: "Иногда хочется на глубину, где тихо. Это нормально — главное, оставь себе путь назад, к людям."
  },
  "хочу движ": {
    world_type: "neon", kicker: "НЕОНОВАЯ КОМНАТА", rail: "НЕОН",
    world_name: "Кислотное сердце", mood_label: "слишком много электричества", mood_tag: "ЭЛЕКТРИЧЕСТВО",
    main: "#C44FE0", dark: "#0A0512", accent: "#6BE0FF",
    phrase: "Твоя комната сегодня искрит. Дай этому току направление, пока он не выбрал его сам."
  },
  "хаос": {
    world_type: "neon", kicker: "МИР ШТОРМА", rail: "ШТОРМ",
    world_name: "Статический шторм", mood_label: "все сигналы одновременно", mood_tag: "ПОМЕХИ",
    main: "#E04848", dark: "#160505", accent: "#FF9D9D",
    phrase: "Сегодня все каналы включены сразу. Не разруливай всё — выбери один."
  },
  "красиво, но больно": {
    world_type: "glass", kicker: "НЕБЕСНЫЙ МИР", rail: "ОБЛАКА",
    world_name: "Дворец на облаках", mood_label: "красиво, но ноет", mood_tag: "КРАСИВО-БОЛЬНО",
    main: "#D98CC4", dark: "#180A14", accent: "#FFE0F2",
    phrase: "Бывает красота, которая немного режет. Сегодня твой мир именно такой — и он настоящий."
  },
  "норм, но странно": {
    world_type: "glass", kicker: "СТЕКЛЯННЫЙ ГОРОД", rail: "ГОРОД",
    world_name: "Город холодного пульса", mood_label: "среди людей, но не достать", mood_tag: "ОТСТРАНЁННОСТЬ",
    main: "#5C8DFF", dark: "#070C1A", accent: "#C9E4FF",
    phrase: "Снаружи всё ровно, внутри лёгкое статическое электричество. Так тоже бывает."
  }
};

/* действия дня подбираются по «чего хочется» */
const MICRO_BY_WANT = {
  "тишины": "Выключи уведомления на час и побудь там, где никто не дёргает.",
  "тепла": "Горячий душ или чай, плед, тёплый свет — собери себе маленькое тепло руками.",
  "движа": "Выйди на 20 минут: шаг, музыка в ушах, любое движение тела.",
  "ясности": "Выпиши три мысли, которые крутятся. На бумаге они меньше.",
  "чтобы отстали": "Разреши себе сегодня не отвечать сразу. Мир подождёт до завтра.",
  "обнять кого-то": "Напиши тому, кого хочется обнять. Хотя бы два слова."
};

/* чего избегать — по тому, что забрало силы */
const AVOID_BY_DRAIN = {
  "люди": "Не добирай сегодня лишних разговоров — лимит исчерпан.",
  "работа / учёба": "Не открывай рабочие чаты после ужина.",
  "тревога": "Не корми тревогу новостями и чужими сторис.",
  "телефон": "Не листай ленту перед сном — дай голове доехать до тишины.",
  "быт": "Не затевай большую уборку — сегодня хватит одного маленького дела.",
  "недосып": "Не сиди до трёх. Сегодня сон — главная задача.",
  "всё сразу": "Не пытайся починить всё за один вечер.",
  "ничего — день норм": "Не выискивай проблему там, где её нет."
};

/* редкие события: ~12% миров */
const RARE_BY_TYPE = {
  ocean: ["кит", "Кит прошёл через твой океан"],
  space: ["двойная комета", "Две кометы за одну ночь"],
  forest: ["северное сияние", "Сияние над лесом"],
  desert: ["метеорный дождь", "Метеоры над пустыней"],
  glass: ["гроза", "Гроза над городом"],
  neon: ["разлом", "Разлом в комнате"]
};

function generateWorld(a) {
  const p = MOOD_PRESETS[a.mood] || MOOD_PRESETS["норм, но странно"];
  const weather = p.world_type === "glass" ? "rain" : (a.social < 40 || a.noise > 70 ? "mist" : "clear");
  const golden = Math.random() < 0.04; // секретный золотой мир
  const rareRoll = !golden && Math.random() < 0.12 ? RARE_BY_TYPE[p.world_type] : null;
  const analysis =
    `Энергия ${a.energy} — ${labelFor(ENERGY_LABELS, a.energy)}. ` +
    `Социальная батарейка ${a.social} — ${labelFor(SOCIAL_LABELS, a.social)}. ` +
    `Внутренний шум ${a.noise} — ${labelFor(NOISE_LABELS, a.noise)}.` +
    (a.drain ? ` Больше всего сегодня забрало: ${a.drain}.` : "") +
    (a.want ? ` Сейчас хочется ${a.want}.` : "");
  const out = {
    world_type: p.world_type,
    kicker: p.kicker,
    rail: p.rail,
    world_name: p.world_name,
    main_color: p.main,
    secondary_color: p.dark,
    accent_color: p.accent,
    mood_label: p.mood_label,
    mood_tag: p.mood_tag,
    aura_phrase: p.phrase,
    energy_level: a.energy,
    social_battery: a.social,
    noise_level: a.noise,
    drain: a.drain,
    want: a.want,
    analysis,
    weather,
    animation_intensity: 0.2 + (a.energy / 100) * 0.5 + (a.noise / 100) * 0.15,
    micro_action: MICRO_BY_WANT[a.want] || "Сделай одну маленькую вещь: душ, прогулку или порядок на столе.",
    avoid_today: AVOID_BY_DRAIN[a.drain] || "Не требуй от себя сегодня больше, чем есть.",
    rare: rareRoll ? rareRoll[0] : null,
    rare_text: rareRoll ? rareRoll[1] : null,
    mood: a.mood,
    note_flagged: checkNoteSafety(a.note),
    created_at: new Date().toISOString(),
    likes: 0
  };
  if (golden) {
    Object.assign(out, {
      golden: true,
      world_name: "Золотой час",
      kicker: "СЕКРЕТНЫЙ МИР",
      rail: "ЗОЛОТО",
      mood_label: "редкое золотое состояние",
      mood_tag: "ЗОЛОТОЙ ЧАС",
      main_color: "#E8B84B",
      secondary_color: "#171004",
      accent_color: "#FFF3D6",
      aura_phrase: "Твой мир сегодня выпал золотым. Это случается очень редко — запомни этот день."
    });
  }
  return out;
}

const DANGER_WORDS = ["не хочу жить", "умереть", "покончить", "навредить себе", "самоуби", "сдохнуть", "порезать себя"];
function checkNoteSafety(note) {
  const n = (note || "").toLowerCase();
  return DANGER_WORDS.some(w => n.includes(w));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- хранилища ---------- */

const HISTORY_KEY = "aura_history_v1";
const CAPSULE_KEY = "aura_capsules_v1";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-60)));
}
function loadCapsules() {
  try { return JSON.parse(localStorage.getItem(CAPSULE_KEY)) || []; } catch { return []; }
}
function saveCapsules(c) { localStorage.setItem(CAPSULE_KEY, JSON.stringify(c)); }

/* ---------- состояние ---------- */

const $ = id => document.getElementById(id);
let currentStep = 0;
let totalSteps = 7;
let scene = null;
let worldParams = null;
let historyIndex = -1;
let breathState = null;
let creatureSprite = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}
function showStep(i) {
  currentStep = i;
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", +s.dataset.step === i));
  $("progress-fill").style.width = ((i + 1) / totalSteps * 100) + "%";
}
function labelFor(table, v) {
  for (const [max, label] of table) if (v <= max) return label;
  return table[table.length - 1][1];
}
function mixHex(h1, h2, t) {
  const c = mix(hexToRgb(h1), hexToRgb(h2), t);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* ---------- спарклайны ---------- */

function drawSpark(canvas, values, colorHex) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 110, h = canvas.clientHeight || 34;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const col = hexToRgb(colorHex.startsWith("#") ? colorHex : "#5C8DFF");
  const n = values.length;
  const pt = i => [4 + (i / (n - 1)) * (w - 8), h - 5 - (values[i] / 100) * (h - 10)];
  ctx.fillStyle = rgba(col, 0.55);
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = pt(i), [x2, y2] = pt(i + 1);
    for (let s = 1; s < 6; s++) {
      ctx.beginPath();
      ctx.arc(x1 + (x2 - x1) * s / 6, y1 + (y2 - y1) * s / 6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  values.forEach((_, i) => {
    const [x, y] = pt(i);
    ctx.fillStyle = rgba(col, i === n - 1 ? 1 : 0.8);
    ctx.beginPath();
    ctx.arc(x, y, i === n - 1 ? 3 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function sparkValues(key, current) {
  const h = loadHistory();
  const vals = h.slice(-7).map(e => e[key]);
  if (vals.length < 2) {
    const out = [];
    for (let i = 0; i < 6; i++) out.push(Math.max(4, Math.min(96, current + Math.sin(i * 1.7) * 14 + (Math.random() - 0.5) * 10)));
    out.push(current);
    return out;
  }
  if (vals[vals.length - 1] !== current) vals.push(current);
  return vals.slice(-7);
}

/* ---------- картинки миров (AI-арт пользователя) ---------- */

const IMG_DIR = "assets/worlds/";
const MOOD_TRANSLIT = {
  "устал": "ustal", "пусто": "pusto", "злой": "zloy", "тревожно": "trevozhno",
  "спокойно": "spokoino", "влюблён": "vlyublyon", "хочу исчезнуть": "ischeznut",
  "хочу движ": "dvizh", "хаос": "haos", "красиво, но больно": "krasivo-bolno",
  "норм, но странно": "norm-stranno"
};
const imgCache = {};

function tryLoad(url) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });
}

/* ищем картинку: золотой мир → по настроению → по типу мира; webp/jpg/png */
async function findWorldImage(mood, type, golden) {
  const names = [golden ? "gold" : null, MOOD_TRANSLIT[mood], type].filter(Boolean);
  for (const n of names) {
    if (n in imgCache) { if (imgCache[n]) return imgCache[n]; continue; }
    for (const ext of ["webp", "jpg", "png", "jpeg"]) {
      const img = await tryLoad(IMG_DIR + n + "." + ext);
      if (img) { imgCache[n] = img; return img; }
    }
    imgCache[n] = null;
  }
  return null;
}

/* ---------- мир ---------- */

const RAIL_ICONS = {
  ocean: '<path d="M3 9c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 14c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  space: '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 16C2.5 15 2 14 2.4 13c.8-1.8 5.6-2 10.8-.4 5.2 1.6 8.8 4 8 5.8-.4 1-1.8 1.2-3.6.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  neon: '<path d="M13 2L5 13h5l-1 9 8-11h-5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  forest: '<path d="M12 21V9M12 9c-4 0-6.5-2.6-6.5-6 4 0 6.5 2.6 6.5 6zm0 4c4 0 6.5-2.6 6.5-6-4 0-6.5 2.6-6.5 6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  desert: '<circle cx="12" cy="10" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 18h18M6 21h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  glass: '<path d="M5 21V8l4-3v16M9 21V5l6 2v14M15 21V7l4 3v11M3 21h18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
};

async function openWorld(params, opts = {}) {
  worldParams = params;
  stopBreath();
  if (scene) scene.stop();

  /* если пользователь положил арт в assets/worlds — мир строится из него */
  const img = await findWorldImage(params.mood, params.world_type, params.golden);
  params._img = img;
  scene = img
    ? new ImageWorld($("world-canvas"), params)
    : new SCENES[params.world_type]($("world-canvas"), params);

  document.documentElement.style.setProperty("--accent", params.main_color);
  document.documentElement.style.setProperty("--accent-soft", params.accent_color);

  $("world-kicker").textContent = params.kicker;
  $("rail-scene-label").textContent = params.rail;
  $("rail-scene-icon").innerHTML = RAIL_ICONS[params.world_type] || RAIL_ICONS.ocean;
  $("world-name").textContent = params.world_name;
  $("world-sub").textContent = params.mood_label;
  $("mood-tag").textContent = params.mood_tag;
  $("world-date").textContent = new Date(params.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }).toUpperCase();

  const rb = $("rare-badge");
  rb.hidden = !params.rare && !params.golden;
  if (params.golden) rb.textContent = "✦ СЕКРЕТНЫЙ МИР — выпадает очень редко";
  else if (params.rare) rb.textContent = "✦ РЕДКОЕ СОБЫТИЕ — " + params.rare_text;

  $("energy-num").firstChild.textContent = params.energy_level;
  $("social-num").firstChild.textContent = params.social_battery;
  $("energy-status").textContent = labelFor(ENERGY_STATUS, params.energy_level);
  $("social-status").textContent = labelFor(SOCIAL_STATUS, params.social_battery);

  const social = params.social_battery;
  $("social-state-label").textContent = social < 40 ? "ОДИН" : social < 70 ? "ОТКРЫТ" : "К ЛЮДЯМ";

  document.querySelectorAll(".rail-toggle").forEach(b => {
    const w = b.dataset.weather;
    scene.weather[w] = w === "rain" ? params.weather === "rain" : false;
    b.classList.toggle("on", scene.weather[w]);
  });
  SoundEngine.setRain(scene.weather.rain);

  if (opts.saveNew) {
    const h = loadHistory();
    h.push(params);
    saveHistory(h);
    historyIndex = h.length - 1;
  } else {
    historyIndex = opts.historyIndex ?? -1;
  }
  $("like-count").textContent = params.likes || 0;

  drawSpark($("spark-energy"), sparkValues("energy_level", params.energy_level), params.main_color);
  drawSpark($("spark-social"), sparkValues("social_battery", params.social_battery), mixHex(params.main_color, "#9B7CFF", 0.45));

  showScreen("screen-world");
  scene.start();
  scene.resize();

  /* звук мира — сразу */
  SoundEngine.play(params.world_type);
  $("dock-sound").classList.toggle("on", SoundEngine.enabled);

  const toast = $("phrase-toast");
  toast.textContent = params.aura_phrase;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 6000);

  if (params.note_flagged) setTimeout(openSparkSheet, 1200);
  else checkCapsules();
}

/* ---------- шиты ---------- */

function showSheet(html) {
  $("sheet-content").innerHTML = html;
  $("sheet").classList.add("open");
}
function hideSheet() {
  $("sheet").classList.remove("open");
  if (creatureSprite) { creatureSprite.stop(); creatureSprite = null; }
}

function openSparkSheet() {
  const p = worldParams;
  let support = "";
  if (p.note_flagged) {
    support = `<div class="sheet-support">Похоже, сегодня очень тяжёлый день. Если тебе небезопасно оставаться одному или есть мысли навредить себе — лучше прямо сейчас написать близкому человеку или обратиться в экстренную помощь. Ты не обязан справляться в одиночку.</div>`;
  }
  showSheet(`
    <div class="sheet-kicker">✦ ПОСЛАНИЕ ДНЯ</div>
    <p class="sheet-phrase">${esc(p.aura_phrase)}</p>
    ${support}
    <div class="sheet-row"><span class="sheet-label">РАЗБОР</span><p>${esc(p.analysis)}</p></div>
    <div class="sheet-row"><span class="sheet-label">СДЕЛАЙ</span><p>${esc(p.micro_action)}</p></div>
    <div class="sheet-row"><span class="sheet-label">ИЗБЕГАЙ</span><p>${esc(p.avoid_today)}</p></div>
    ${p.rare ? `<div class="sheet-row"><span class="sheet-label">СОБЫТИЕ</span><p>✦ ${esc(p.rare_text)}. Такое выпадает редко — посмотри на мир внимательнее.</p></div>` : ""}
  `);
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function openGalaxySheet() {
  const h = loadHistory();
  if (!h.length) {
    showSheet(`<div class="sheet-kicker">ГАЛАКТИКА</div><p class="sheet-phrase">Пока пусто. Каждый созданный мир станет планетой здесь.</p>`);
    return;
  }
  const orbs = h.map((e, i) => {
    const size = 30 + e.energy_level * 0.34;
    const glow = 8 + (e.likes || 0) * 3;
    const d = new Date(e.created_at);
    return `<button class="galaxy-orb${e.rare ? " rare" : ""}" data-idx="${i}" style="width:${size}px;height:${size}px;background:radial-gradient(circle at 32% 30%, ${e.accent_color}, ${e.main_color} 55%, ${e.secondary_color});box-shadow:0 0 ${glow}px ${e.main_color}"
      title="${esc(e.world_name)}"><span>${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}</span></button>`;
  }).reverse().join("");
  showSheet(`
    <div class="sheet-kicker">ГАЛАКТИКА · ${h.length} ${plural(h.length, "мир", "мира", "миров")}</div>
    <div class="galaxy-grid">${orbs}</div>
    <p class="sheet-note">✦ — миры, в которых случилось редкое событие.</p>
  `);
  document.querySelectorAll(".galaxy-orb").forEach(b => {
    b.onclick = () => {
      SoundEngine.unlock();
      hideSheet();
      const idx = +b.dataset.idx;
      openWorld(loadHistory()[idx], { historyIndex: idx });
    };
  });
}

function openStatsSheet() {
  const h = loadHistory();
  if (!h.length) {
    showSheet(`<div class="sheet-kicker">СТАТИСТИКА</div><p class="sheet-phrase">Создай несколько миров — и здесь появится твоя картина недели.</p>`);
    return;
  }
  const last = h.slice(-7);
  const avgE = Math.round(last.reduce((s, e) => s + e.energy_level, 0) / last.length);
  const avgS = Math.round(last.reduce((s, e) => s + e.social_battery, 0) / last.length);
  const counts = {};
  last.forEach(e => counts[e.world_type] = (counts[e.world_type] || 0) + 1);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const names = { ocean: "Океан", space: "Космос", neon: "Неон", forest: "Лес", desert: "Пустыня", glass: "Город" };
  showSheet(`
    <div class="sheet-kicker">ПОСЛЕДНИЕ ${last.length} ${plural(last.length, "ДЕНЬ", "ДНЯ", "ДНЕЙ")}</div>
    <div class="stats-grid">
      <div><b>${avgE}%</b><span>средняя энергия</span></div>
      <div><b>${avgS}%</b><span>социальная батарейка</span></div>
      <div><b>${names[top[0]]}</b><span>главный мир</span></div>
      <div><b>${h.length}</b><span>${plural(h.length, "мир создан", "мира создано", "миров создано")}</span></div>
    </div>
  `);
}

/* ---------- существо ---------- */

function creatureFor(h) {
  if (h.length < 3) return null;
  const last = h.slice(-14);
  const moods = {};
  last.forEach(e => moods[e.mood] = (moods[e.mood] || 0) + 1);
  const avgE = last.reduce((s, e) => s + e.energy_level, 0) / last.length;
  const avgS = last.reduce((s, e) => s + e.social_battery, 0) / last.length;
  const has = m => (moods[m] || 0) >= 2;
  if (has("злой")) return ["Чёрная птица", "огонь, который держат при себе"];
  if ((has("хаос") || has("хочу движ")) && avgE > 60) return ["Электрический кот", "слишком много заряда для одной розетки"];
  if (has("влюблён") || (has("спокойно") && has("красиво, но больно"))) return ["Светящийся олень", "нежность, которая светится в темноте"];
  if (has("пусто") || has("хочу исчезнуть")) return ["Стеклянная рыба", "прозрачность как способ отдыха"];
  if (has("тревожно") && has("влюблён")) return ["Розовая моль", "летит на тёплый свет, даже когда страшно"];
  if (avgS < 35 && avgE < 45) return ["Ночной лис", "тихий, осторожный, гуляет сам по себе"];
  return ["Туманный кит", "медленный, глубокий, почти неслышный"];
}

function streakDays(h) {
  const days = new Set(h.map(e => e.created_at.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  for (;;) {
    if (!days.has(d.toISOString().slice(0, 10))) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function openProfileSheet() {
  const h = loadHistory();
  const streak = streakDays(h);
  const cr = creatureFor(h);
  const pendingCaps = loadCapsules().length;
  const creatureHtml = cr
    ? `<div class="creature"><canvas id="creature-canvas"></canvas><b>${cr[0]}</b><span>${cr[1]}</span><span class="creature-hint">коснись — оно отреагирует</span></div>`
    : `<div class="creature"><div class="creature-egg"></div><b>Существо формируется</b><span>создай ещё ${Math.max(1, 3 - h.length)} ${plural(Math.max(1, 3 - h.length), "мир", "мира", "миров")} — и оно вылупится</span></div>`;
  showSheet(`
    <div class="sheet-kicker">ТВОЯ АУРА</div>
    ${creatureHtml}
    <div class="stats-grid">
      <div><b>${streak}</b><span>${plural(streak, "день подряд", "дня подряд", "дней подряд")}</span></div>
      <div><b>${h.length}</b><span>${plural(h.length, "мир", "мира", "миров")} всего</span></div>
      ${pendingCaps ? `<div><b>${pendingCaps}</b><span>${plural(pendingCaps, "капсула ждёт", "капсулы ждут", "капсул ждут")} своего дня</span></div>` : ""}
    </div>
    <p class="sheet-note">AURA WORLD — не медицинское приложение и не заменяет психолога или врача.</p>
  `);
  if (cr) creatureSprite = new CreatureSprite($("creature-canvas"), cr[0]);
}

function openMenuSheet() {
  showSheet(`
    <div class="sheet-kicker">МИР</div>
    <button class="sheet-btn" id="sheet-export">⬇ Сохранить карточку PNG</button>
    <button class="sheet-btn" id="sheet-new">✦ Новый мир</button>
    <button class="sheet-btn danger" id="sheet-clear">Очистить историю</button>
  `);
  $("sheet-export").onclick = () => { hideSheet(); exportPNG(); };
  $("sheet-new").onclick = () => { hideSheet(); startCheckin(); };
  $("sheet-clear").onclick = () => { localStorage.removeItem(HISTORY_KEY); hideSheet(); };
}

/* ---------- капсула времени ---------- */

function openCapsuleSheet() {
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  showSheet(`
    <div class="sheet-kicker">КАПСУЛА ВРЕМЕНИ</div>
    <p class="sheet-phrase">Напиши пару слов себе будущему. Капсула закроется — и однажды откроется сама.</p>
    <textarea id="capsule-text" rows="3" maxlength="300" placeholder="Привет. Сегодня ${today}, и я хочу сказать тебе…"></textarea>
    <div class="capsule-btns">
      <button class="sheet-btn" data-days="7">Открыть через неделю</button>
      <button class="sheet-btn" data-days="30">Открыть через месяц</button>
    </div>
  `);
  document.querySelectorAll("[data-days]").forEach(b => {
    b.onclick = () => {
      const text = $("capsule-text").value.trim();
      if (!text) return;
      const c = loadCapsules();
      c.push({ text, created: Date.now(), openAt: Date.now() + (+b.dataset.days) * 864e5 });
      saveCapsules(c);
      hideSheet();
      const toast = $("phrase-toast");
      toast.textContent = "Капсула закопана в этом мире. Она вернётся к тебе сама. ✦";
      toast.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(() => toast.classList.remove("show"), 4000);
    };
  });
}

function checkCapsules() {
  const c = loadCapsules();
  const i = c.findIndex(x => x.openAt <= Date.now());
  if (i < 0) return;
  const cap = c.splice(i, 1)[0];
  saveCapsules(c);
  setTimeout(() => showSheet(`
    <div class="sheet-kicker">✦ КАПСУЛА ВРЕМЕНИ ОТКРЫЛАСЬ</div>
    <p class="sheet-phrase">${esc(cap.text)}</p>
    <p class="sheet-note">Ты написал это себе ${new Date(cap.created).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}.</p>
  `), 1800);
}

/* ---------- дыхание с миром ---------- */

const BREATH_PHASES = [["вдох", 4, 1.45], ["держи", 4, 1.45], ["выдох", 6, 0.75], ["пауза", 2, 0.75]];

function startBreath() {
  if (!scene || breathState) return;
  scene.calm = true;
  $("breath").classList.add("show");
  let remain = 60;
  $("breath-count").textContent = remain;
  let pi = 0;
  const core = $("breath-core");
  const next = () => {
    if (!breathState) return;
    const [name, dur, scale] = BREATH_PHASES[pi % BREATH_PHASES.length];
    pi++;
    $("breath-phase").textContent = name;
    core.style.transitionDuration = dur + "s";
    core.style.transform = `scale(${scale})`;
    breathState.phaseT = setTimeout(next, dur * 1000);
  };
  breathState = {
    phaseT: null,
    tick: setInterval(() => {
      remain--;
      $("breath-count").textContent = Math.max(0, remain);
      if (remain <= 0) stopBreath();
    }, 1000)
  };
  next();
}

function stopBreath() {
  if (!breathState) return;
  clearTimeout(breathState.phaseT);
  clearInterval(breathState.tick);
  breathState = null;
  $("breath").classList.remove("show");
  $("breath-core").style.transform = "scale(1)";
  if (scene) scene.calm = false;
}

/* ---------- PNG экспорт 1080×1920 ---------- */

async function exportPNG() {
  if (!scene || !worldParams) return;
  try { await document.fonts.ready; } catch {}
  const p = worldParams;
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const ctx = c.getContext("2d");

  scene.draw(ctx, 1080, 1920, scene.t);

  const g = ctx.createLinearGradient(0, 1050, 0, 1920);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 1050, 1080, 870);

  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 28px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("✦ " + p.kicker + " · " + new Date(p.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }).toUpperCase(), 80, 1230);

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 76px 'Playfair Display', Georgia, serif";
  ctx.fillText(p.world_name, 80, 1280);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "300 40px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(p.mood_label, 80, 1390);

  ctx.fillStyle = p.accent_color;
  ctx.font = "600 30px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("НАСТРОЕНИЕ  ✦ " + p.mood_tag, 80, 1465);

  const bar = (label, val, status, bx, by) => {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 26px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(label, bx, by);
    ctx.fillStyle = "#fff";
    ctx.font = "700 64px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(val + "%", bx, by + 38);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.roundRect(bx, by + 120, 380, 9, 5); ctx.fill();
    ctx.fillStyle = p.main_color;
    ctx.beginPath(); ctx.roundRect(bx, by + 120, 380 * val / 100, 9, 5); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "400 26px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(status, bx, by + 148);
  };
  bar("ЭНЕРГИЯ", p.energy_level, labelFor(ENERGY_STATUS, p.energy_level), 80, 1555);
  bar("СОЦ. БАТАРЕЙКА", p.social_battery, labelFor(SOCIAL_STATUS, p.social_battery), 560, 1555);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 26px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("A U R A   W O R L D", 80, 1810);

  const a = document.createElement("a");
  a.download = `aura-world-${Date.now()}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

/* ---------- интро-частицы ---------- */

function startIntroParticles() {
  const c = $("intro-canvas");
  const ctx = c.getContext("2d");
  const dots = Array.from({ length: 40 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.5 + Math.random() * 1.8, sp: 0.0002 + Math.random() * 0.0006,
    tw: Math.random() * Math.PI * 2
  }));
  let t = 0;
  function resize() {
    c.width = c.clientWidth * devicePixelRatio;
    c.height = c.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);
  (function loop() {
    if (!$("screen-intro").classList.contains("active")) return;
    t += 0.016;
    const W = c.clientWidth, H = c.clientHeight;
    const bg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, H * 0.8);
    bg.addColorStop(0, "#121a36");
    bg.addColorStop(1, "#070a18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const d of dots) {
      d.y -= d.sp;
      if (d.y < -0.02) d.y = 1.02;
      ctx.fillStyle = `rgba(150,175,255,${0.2 + 0.5 * Math.abs(Math.sin(t + d.tw))})`;
      ctx.beginPath();
      ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
}

/* ---------- check-in ---------- */

function startCheckin() {
  stopBreath();
  if (scene) { scene.stop(); scene = null; }
  SoundEngine.stop();
  answers.mood = null;
  answers.drain = null;
  answers.want = null;
  $("note-input").value = "";
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
  showScreen("screen-checkin");
  showStep(0);
}

/* чипы с одиночным выбором и автопереходом */
function buildChips(gridId, items, onPick) {
  for (const item of items) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = item;
    b.onclick = () => {
      document.querySelectorAll(`#${gridId} .chip`).forEach(c => c.classList.remove("selected"));
      b.classList.add("selected");
      onPick(item);
    };
    $(gridId).appendChild(b);
  }
}

function init() {
  totalSteps = document.querySelectorAll(".step").length;

  buildChips("mood-grid", MOODS, m => { answers.mood = m; setTimeout(() => showStep(1), 250); });
  buildChips("drain-grid", DRAINS, d => { answers.drain = d; setTimeout(() => showStep(4), 250); });
  buildChips("want-grid", WANTS, w => { answers.want = w; setTimeout(() => showStep(5), 250); });

  $("slider-energy").oninput = e => {
    answers.energy = +e.target.value;
    $("energy-value").textContent = answers.energy;
    $("energy-label").textContent = labelFor(ENERGY_LABELS, answers.energy);
  };
  $("slider-social").oninput = e => {
    answers.social = +e.target.value;
    $("social-value").textContent = answers.social;
    $("social-label").textContent = labelFor(SOCIAL_LABELS, answers.social);
  };
  $("slider-noise").oninput = e => {
    answers.noise = +e.target.value;
    $("noise-value").textContent = answers.noise;
    $("noise-label").textContent = labelFor(NOISE_LABELS, answers.noise);
  };

  document.querySelectorAll("[data-next]").forEach(b => b.onclick = () => showStep(currentStep + 1));
  $("btn-start").onclick = () => { SoundEngine.unlock(); startCheckin(); };
  $("btn-back").onclick = () => {
    if (currentStep === 0) showScreen(loadHistory().length ? "screen-world" : "screen-intro");
    else showStep(currentStep - 1);
  };

  $("btn-create").onclick = () => {
    SoundEngine.unlock();
    answers.note = $("note-input").value.trim();
    showScreen("screen-loading");
    const texts = [
      "Читаю энергию…", "Взвешиваю социальную батарейку…",
      "Измеряю внутренний шум…", "Смотрю, куда утекли силы…",
      "Подбираю цвет состояния…", "Собираю твой мир…"
    ];
    let i = 0;
    $("loading-text").textContent = texts[0];
    const ticker = setInterval(() => {
      i = (i + 1) % texts.length;
      $("loading-text").textContent = texts[i];
    }, 650);
    setTimeout(() => {
      clearInterval(ticker);
      openWorld(generateWorld(answers), { saveNew: true }); // здесь позже будет реальный AI-запрос
    }, 3400);
  };

  /* HUD мира */
  $("btn-spark").onclick = openSparkSheet;
  $("btn-menu").onclick = openMenuSheet;
  $("act-breath").onclick = startBreath;
  $("breath-exit").onclick = stopBreath;
  $("act-capsule").onclick = openCapsuleSheet;

  document.querySelectorAll(".rail-toggle").forEach(b => {
    b.onclick = () => {
      if (!scene) return;
      SoundEngine.unlock();
      const w = b.dataset.weather;
      scene.weather[w] = !scene.weather[w];
      b.classList.toggle("on", scene.weather[w]);
      if (w === "rain") SoundEngine.setRain(scene.weather.rain);
    };
  });

  $("btn-like").onclick = () => {
    if (!worldParams) return;
    worldParams.likes = (worldParams.likes || 0) + 1;
    $("like-count").textContent = worldParams.likes;
    $("btn-like").classList.remove("pop");
    void $("btn-like").offsetWidth;
    $("btn-like").classList.add("pop");
    if (scene) scene.touch(scene.W * (0.3 + Math.random() * 0.4), scene.H * (0.3 + Math.random() * 0.3));
    if (historyIndex >= 0) {
      const h = loadHistory();
      if (h[historyIndex]) { h[historyIndex].likes = worldParams.likes; saveHistory(h); }
    }
  };

  /* док */
  $("dock-galaxy").onclick = openGalaxySheet;
  $("dock-stats").onclick = openStatsSheet;
  $("dock-orb").onclick = startCheckin;
  $("dock-sound").onclick = () => {
    SoundEngine.unlock();
    $("dock-sound").classList.toggle("on", SoundEngine.toggle());
  };
  $("dock-profile").onclick = openProfileSheet;

  $("sheet-backdrop").onclick = hideSheet;
  $("sheet-close").onclick = hideSheet;

  startIntroParticles();

  const h = loadHistory();
  if (h.length) {
    const resume = document.createElement("button");
    resume.className = "btn-ghost intro-resume";
    resume.textContent = "Открыть прошлый мир →";
    resume.onclick = () => {
      SoundEngine.unlock();
      openWorld(h[h.length - 1], { historyIndex: h.length - 1 });
    };
    $("btn-start").after(resume);
  }
}

init();
