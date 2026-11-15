'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const KEY = 'korean-study-v1';
const DEFAULTS = { cards: {}, unlocked: [], log: {}, hangulBest: 0, workbook: {}, settings: { newPerDay: 25, rate: 0.9, autoplay: true } };

// ---------- storage ----------
let S = load();
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    const d = JSON.parse(raw) || {};
    return { ...structuredClone(DEFAULTS), ...d, settings: { ...DEFAULTS.settings, ...d.settings } };
  } catch {
    try { if (raw) localStorage.setItem(KEY + '-corrupt-' + Date.now(), raw); } catch {} // keep the bad copy, never silently drop progress
    return structuredClone(DEFAULTS);
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch { toast('⚠️ Could not save progress — export a backup from Progress.'); }
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3000);
}
const dateKey = d => d.toLocaleDateString('sv'); // YYYY-MM-DD, local time
const todayKey = () => dateKey(new Date());
const dayStartNow = () => new Date().setHours(0, 0, 0, 0);
function bump(kind) { (S.log[todayKey()] ||= { new: 0, rev: 0 })[kind]++; }
function streak() {
  const d = new Date(); let n = 0;
  if (!S.log[dateKey(d)]) d.setDate(d.getDate() - 1);
  while (S.log[dateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---------- speech (browser TTS) ----------
let KO_VOICE = null;
const loadVoice = () => { KO_VOICE = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith('ko')) || null; };
if (window.speechSynthesis) { loadVoice(); speechSynthesis.addEventListener('voiceschanged', loadVoice); }
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR'; u.rate = S.settings.rate; if (KO_VOICE) u.voice = KO_VOICE;
  speechSynthesis.speak(u);
}
const spk = t => `<button class="spk" data-act="speak" data-t="${esc(t)}" aria-label="Play audio">🔊</button>`;

// ---------- record & compare: your take plays back, then the model audio ----------
const CAN_REC = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const mic = t => CAN_REC ? `<button class="spk mic" data-act="rec" data-t="${esc(t)}" aria-label="Record yourself, then compare">🎙</button>` : '';
let rec = null;
function stopRec(play = true) { if (rec) { rec.play = play; rec.stop(); } }
async function record(el) {
  if (rec) return stopRec();
  window.speechSynthesis?.cancel();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast('🎙 Microphone blocked. Allow it for this site (needs HTTPS or localhost).'); }
  const r = rec = new MediaRecorder(stream), chunks = [];
  r.ondataavailable = e => chunks.push(e.data);
  r.onstop = () => {
    stream.getTracks().forEach(t => t.stop()); rec = null; el.classList.remove('on'); el.textContent = '🎙';
    if (r.play === false || !chunks.length) return;
    const url = URL.createObjectURL(new Blob(chunks, { type: chunks[0].type })), a = new Audio(url);
    a.onended = () => { URL.revokeObjectURL(url); speak(el.dataset.t); };
    a.play().catch(() => URL.revokeObjectURL(url));
  };
  r.start(); el.classList.add('on'); el.textContent = '⏹';
}

// ---------- card catalog ----------
const LESSONS = CURRICULUM.lessons.sort((a, b) => a.n - b.n);
const CARDS = {}, BY_LESSON = {};
for (const L of LESSONS) {
  const lc = BY_LESSON[L.n] = { rec: [], prod: [], sent: [] };
  for (const v of L.vocab) {
    const id = `v:${v.ko}|${v.en}:`;
    if (CARDS[id + 'r']) continue; // same word repeated in a later lesson
    CARDS[id + 'r'] = { kind: 'rec', v, n: L.n }; CARDS[id + 'p'] = { kind: 'prod', v, n: L.n };
    lc.rec.push(id + 'r'); lc.prod.push(id + 'p');
  }
  for (const g of L.grammar) for (const ex of g.examples) {
    const id = 's:' + ex.ko;
    if (!CARDS[id]) { CARDS[id] = { kind: 'sent', ex, g, n: L.n }; lc.sent.push(id); }
  }
}
// Words sharing a Korean form (저 = I / that) or an English gloss (to be cold = 춥다 / 차갑다): cards name the ones you already know
const gloss = en => en.toLowerCase().replace(/\s*\(.*?\)/g, '').trim(), SIB = {};
for (const id in CARDS) if (CARDS[id].kind === 'rec') for (const k of ['ko:' + CARDS[id].v.ko, 'en:' + gloss(CARDS[id].v.en)]) (SIB[k] ??= []).push(id);
// Hint with the part of speech when that alone tells them apart (저: noun vs not), else name the known look-alikes
const notHint = (rid, k, show) => {
  const sib = SIB[k].filter(s => s !== rid && S.cards[s]).map(s => CARDS[s].v), pos = CARDS[rid].v.pos;
  if (!sib.length) return '';
  const label = pos !== 'other' ? pos : 'not a ' + [...new Set(sib.map(v => v.pos))].join('/');
  return `<p class="muted">${sib.every(v => v.pos !== pos) ? label : 'Not: ' + sib.map(v => esc(show(v))).join(' · ')}</p>`;
};
// Gloss edits change card ids: move progress from an orphaned id to its one unstarted look-alike (same Korean, then same gloss)
for (const id of Object.keys(S.cards)) if (id.startsWith('v:') && !CARDS[id]) {
  const [ko, en] = id.slice(2, -2).split('|');
  let to = (SIB['ko:' + ko] || []).map(r => r.slice(0, -1) + id.slice(-1)).filter(c => !S.cards[c]);
  if (to.length > 1) to = to.filter(c => gloss(CARDS[c].v.en) === gloss(en));
  if (to.length === 1) { S.cards[to[0]] = S.cards[id]; delete S.cards[id]; save(); }
}
const dueIds = () => Object.keys(S.cards).filter(id => CARDS[id] && S.cards[id].due <= Date.now())
  .sort((a, b) => S.cards[a].due - S.cards[b].due);

// New cards: production only after the word was first seen on an earlier day; sentences once a lesson's words are all seen.
const allowance = () => S.settings.newPerDay + (S.log[todayKey()]?.extra || 0); // extra: today-only top-ups from the "more" button
function newIds(cap = allowance()) {
  if (dueIds().length > 150) return []; // backlog guard: clear reviews before adding more
  const left = Math.max(0, cap - (S.log[todayKey()]?.new || 0));
  const t0 = dayStartNow(), lists = [[], [], []];
  for (const n of [...S.unlocked].sort((a, b) => a - b)) {
    const lc = BY_LESSON[n]; if (!lc) continue;
    lists[0].push(...lc.prod.filter(id => !S.cards[id] && S.cards[id.slice(0, -1) + 'r']?.first < t0));
    lists[1].push(...lc.rec.filter(id => !S.cards[id]));
    if (lc.rec.every(id => S.cards[id])) lists[2].push(...lc.sent.filter(id => !S.cards[id]));
  }
  const out = [];
  for (let i = 0; out.length < left && lists.some(l => i < l.length); i++)
    for (const l of lists) if (i < l.length && out.length < left) out.push(l[i]);
  return out;
}
const nextLesson = () => LESSONS.find(L => !S.unlocked.includes(L.n));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtIvl = ms => ms < 36e5 ? Math.max(1, Math.round(ms / 6e4)) + 'm' : ms < 864e5 ? Math.round(ms / 36e5) + 'h' : Math.round(ms / 864e5) + 'd';
const render = html => { $('#view').innerHTML = html; };

// ---------- Today ----------
function today() {
  const due = dueIds().length, nw = newIds().length, d = S.log[todayKey()] || { new: 0, rev: 0 }, next = nextLesson();
  const more = nw ? 0 : Math.min(10, newIds(Infinity).length);
  render(`
    <header><p class="eyebrow">오늘 · Today</p><h1>${due + nw ? 'Ready when you are' : 'All caught up 🎉'}</h1></header>
    <div class="tiles">
      <div class="tile"><b>${due}</b><span>reviews due</span></div>
      <div class="tile"><b>${nw}</b><span>new cards</span></div>
      <div class="tile"><b>${streak()}🔥</b><span>day streak</span></div>
    </div>
    ${due + nw ? `<button class="primary big" data-act="start">Start session · ${due + nw} cards</button>` : ''}
    ${more ? `<button class="ghost big" data-act="more" data-k="${more}">+${more} more new cards today</button>` : ''}
    <p class="muted center">Done today: ${d.rev} reviews · ${d.new} new</p>
    ${S.hangulBest < 8 && !S.unlocked.length ? `<a class="panel" href="#hangul"><b>Start here: learn Hangul</b><span>The alphabet takes 1–2 days. Pass the quiz (8/10), then start with the Survival kit and Lesson 1.</span></a>` : ''}
    ${next && nw < allowance() - d.new ? `<a class="panel" href="#lesson/${next.n}"><b>Next: Lesson ${next.n} — ${esc(next.title)}</b>
      <span>Read the grammar, then add its ${BY_LESSON[next.n].rec.length} words to your reviews.</span></a>` : ''}
    <p class="tip">Say every answer out loud before revealing it. Speaking beats silent reading for recall.</p>`);
}

// ---------- Study session ----------
let sess = null;
function startSession() { sess = { queue: [...dueIds(), ...newIds()], done: 0 }; location.hash = '#study'; }
function study() {
  if (!sess) return today();
  if (!sess.queue.length) return render(`<div class="done"><p class="hanja">수고했어요!</p><h1>Session complete</h1>
    <p class="muted">${sess.done} cards finished. See you tomorrow.</p><a class="primary big" href="#today">Back to Today</a></div>`);
  const id = sess.queue[0], C = CARDS[id], st = S.cards[id];
  sess.revealed = false; sess.picked = [];
  const pct = Math.round(100 * sess.done / (sess.done + sess.queue.length));
  const grades = `<div class="grades">${['Again', 'Hard', 'Good', 'Easy'].map((l, g) =>
    `<button class="g g${g}" data-act="grade" data-g="${g}">${l}<small>${(n => n.ivl ? n.ivl + 'd' : fmtIvl(n.due - Date.now()))(schedule(st, g))}</small></button>`).join('')}</div>`;
  let body;
  if (C.kind === 'rec') body = `
    <p class="label">What does this mean?</p>
    <div class="prompt ko">${esc(C.v.ko)} ${spk(C.v.ko)}</div>${notHint(id, 'ko:' + C.v.ko, v => v.en)}
    <div class="back"><div class="answer">${esc(C.v.en)}</div><p class="muted">${esc(C.v.pos)} · Lesson ${C.n}</p>${grades}</div>
    <button class="primary reveal" data-act="reveal">Show answer</button>`;
  else if (C.kind === 'prod') body = `
    <p class="label">Say it in Korean</p>
    <div class="prompt">${esc(C.v.en)}</div>${notHint(id.slice(0, -1) + 'r', 'en:' + gloss(C.v.en), v => v.ko)}
    <input id="typed" lang="ko" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type it (optional) — or just say it">
    <div class="back"><div class="answer ko">${esc(C.v.ko)} ${spk(C.v.ko)}${mic(C.v.ko)}</div><p id="verdict" class="muted"></p>${grades}</div>
    <button class="primary reveal" data-act="reveal">Show answer</button>`;
  else {
    const words = C.ex.ko.replace(/[.,!?~…"'“”‘’]/g, '').split(/\s+/).filter(Boolean); // punctuation would give away word order
    let chips = shuffle(words.map((w, i) => ({ w, i })));
    if (words.length > 1 && chips.every((c, i) => c.i === i)) chips.reverse();
    sess.words = words;
    body = `
      <p class="label">Build the sentence</p>
      <div class="prompt small">${esc(C.ex.en)}</div>
      <div id="built" class="built"></div>
      <div class="pool">${chips.map(c => `<button class="chip ko" data-act="chip" data-i="${c.i}">${esc(c.w)}</button>`).join('')}</div>
      <div class="back"><div class="answer ko small">${esc(C.ex.ko)} ${spk(C.ex.ko)}${mic(C.ex.ko)}</div><p id="verdict"></p>
        <p class="muted">Grammar: ${esc(C.g.point)} · Lesson ${C.n}</p>
        <button class="primary" data-act="continue">Continue</button></div>`;
  }
  render(`<div class="bar"><a href="#today" aria-label="End session">✕</a><div class="progress"><i style="width:${pct}%"></i></div><span>${sess.queue.length}</span></div>
    <section class="card ${C.kind}">${body}</section>`);
  if (C.kind === 'rec' && S.settings.autoplay) speak(C.v.ko);
}
function reveal() {
  const C = CARDS[sess.queue[0]];
  sess.revealed = true; $('.card').classList.add('revealed');
  if (C.kind === 'prod') {
    const typed = $('#typed').value, norm = s => s.replace(/[\s.,!?~]/g, '');
    if (typed.trim()) $('#verdict').textContent = norm(typed) === norm(C.v.ko) ? '✓ Exact match' : `✗ You typed: ${typed}`;
    speak(C.v.ko);
  }
}
function pickChip(el) {
  sess.picked.push(+el.dataset.i); el.disabled = true;
  $('#built').insertAdjacentHTML('beforeend', `<span class="chip ko">${esc(el.textContent)}</span>`);
  if (sess.picked.length < sess.words.length) return;
  const ok = sess.picked.map(i => sess.words[i]).join(' ') === sess.words.join(' '); // duplicate words in either slot are fine
  sess.sentOk = ok; sess.revealed = true;
  $('.card').classList.add('revealed', ok ? 'right' : 'wrong');
  $('#verdict').textContent = ok ? '✓ Correct!' : '✗ Not quite — here is the right order:';
  speak(CARDS[sess.queue[0]].ex.ko);
}
function grade(g) {
  const id = sess.queue.shift(), prev = S.cards[id];
  S.cards[id] = schedule(prev, g); bump(prev ? 'rev' : 'new'); save();
  if (S.cards[id].ivl === 0) sess.queue.splice(Math.min(sess.queue.length, 4), 0, id); // still learning: see it again soon
  else sess.done++;
  study();
}

// ---------- Lessons ----------
function lessons() {
  const units = {};
  for (const L of LESSONS) (units[Math.ceil(L.n / 25)] ||= []).push(L); // lesson 0 lands in unit 0
  render(`<header><p class="eyebrow">과 · Lessons</p><h1>Curriculum</h1>
    <p class="muted">Follows HowToStudyKorean Units 1–${Math.max(...Object.keys(units))}. Read a lesson, then add its words.</p></header>
    ${Object.entries(units).map(([u, ls]) => `<h2 class="unit">${+u ? 'Unit ' + u : 'Start here'}</h2><div class="list">${ls.map(L => {
      const lc = BY_LESSON[L.n], seen = lc.rec.filter(id => S.cards[id]).length;
      const st = !S.unlocked.includes(L.n) ? '' : seen === lc.rec.length ? '✓' : `${seen}/${lc.rec.length}`;
      return `<a class="row ${S.unlocked.includes(L.n) ? 'on' : ''}" href="#lesson/${L.n}"><span class="num">${L.n}</span><span class="t">${esc(L.title)}</span><span class="st">${st}</span></a>`;
    }).join('')}</div>`).join('')}`);
}
function lesson(n) {
  const L = LESSONS.find(l => l.n === +n); if (!L) return lessons();
  const on = S.unlocked.includes(L.n), url = /^https:\/\/(www\.)?howtostudykorean\.com\//.test(L.url) ? L.url : '';
  render(`<a class="back-link" href="#lessons">← Lessons</a>
    <header><p class="eyebrow">${L.n ? 'Lesson ' + L.n : 'Survival kit'}</p><h1>${esc(L.title)}</h1>
    ${url ? `<a class="ext" href="${esc(url)}" target="_blank" rel="noopener">Read the full lesson on HowToStudyKorean ↗</a>` : ''}
    ${L.workbook?.exercises.length ? `<a class="panel" href="#workbook/${L.n}"><b>Workbook · ${L.workbook.exercises.length} exercises${L.workbook.reading ? ' + reading' : ''}</b>
      <span>Practise this lesson's grammar.${S.workbook[L.n] != null ? ` Best: ${S.workbook[L.n]}%` : ''}</span></a>` : ''}</header>
    ${L.grammar.map(g => `<section class="grammar"><h2>${esc(g.point)}</h2>${g.explanation.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('')}
      <ul class="examples">${g.examples.map(e => `<li><span class="ko">${esc(e.ko)}</span> ${spk(e.ko)}${mic(e.ko)}<br><span class="muted">${esc(e.en)}</span>${e.note ? `<br><small class="muted">${esc(e.note)}</small>` : ''}</li>`).join('')}</ul></section>`).join('')}
    <h2>Vocabulary · ${L.vocab.length} words</h2>
    <div class="vocab">${L.vocab.map(v => `<div><span class="ko">${esc(v.ko)}</span>${spk(v.ko)}<span>${esc(v.en)}</span><small>${esc(v.pos)}</small></div>`).join('')}</div>
    <button class="primary big sticky" data-act="unlock" data-n="${L.n}" ${on ? 'disabled' : ''}>${on ? '✓ In your reviews' : `Add ${BY_LESSON[L.n].rec.length} words to my reviews`}</button>`);
}

// ---------- Hangul ----------
const INI = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'], INI_R = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const MED = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'], MED_R = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const FIN = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'], FIN_R = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
const CONS = [['ㄱ', 'g/k'], ['ㄴ', 'n'], ['ㄷ', 'd/t'], ['ㄹ', 'r/l'], ['ㅁ', 'm'], ['ㅂ', 'b/p'], ['ㅅ', 's'], ['ㅇ', 'silent / ng'], ['ㅈ', 'j'], ['ㅊ', 'ch'], ['ㅋ', 'k'], ['ㅌ', 't'], ['ㅍ', 'p'], ['ㅎ', 'h'], ['ㄲ', 'kk'], ['ㄸ', 'tt'], ['ㅃ', 'pp'], ['ㅆ', 'ss'], ['ㅉ', 'jj']];
const VOWS = MED.map((m, i) => [m, MED_R[i]]);
const syl = (l, v, t = 0) => String.fromCharCode(0xAC00 + (l * 21 + v) * 28 + t);
const sayLetter = j => INI.includes(j) ? syl(INI.indexOf(j), 0) : syl(11, MED.indexOf(j)); // ㄱ -> 가, ㅓ -> 어
const rand = n => Math.random() * n | 0;
let quiz = null;

function hangul() {
  quiz = null;
  const grid = (list, cls) => `<div class="jamo ${cls}">${list.map(([j, r]) =>
    `<button data-act="speak" data-t="${sayLetter(j)}"><b class="ko">${j}</b><small>${r}</small></button>`).join('')}</div>`;
  render(`<header><p class="eyebrow">한글 · Hangul</p><h1>The alphabet</h1>
    <p class="muted">Each block is one syllable: <b>consonant + vowel (+ final consonant)</b>. 한 = ㅎ h + ㅏ a + ㄴ n. Tap a letter to hear it.</p></header>
    <h2>Consonants</h2>${grid(CONS, 'c')}<h2>Vowels</h2>${grid(VOWS, 'v')}
    <button class="primary big sticky" data-act="hstart">Take the 10-question quiz${S.hangulBest ? ` · best ${S.hangulBest}/10` : ''}</button>`);
}
function makeQ() {
  if (Math.random() < 0.5) { // single letter -> sound
    const pool = Math.random() < 0.5 ? CONS : VOWS, [j, r] = pool[rand(pool.length)];
    const opts = new Set([r]); while (opts.size < 4) opts.add(pool[rand(pool.length)][1]);
    return { prompt: j, answer: r, opts: shuffle([...opts]), say: sayLetter(j), explain: `${j} = ${r}` };
  }
  const mk = () => { const l = rand(19), v = rand(21), t = Math.random() < 0.5 ? 0 : [1, 4, 8, 16, 17, 21][rand(6)];
    return { s: syl(l, v, t), r: INI_R[l] + MED_R[v] + FIN_R[t], parts: [INI[l], MED[v], FIN[t]].filter(Boolean).join(' + ') }; };
  const q = mk(), opts = new Set([q.r]); while (opts.size < 4) opts.add(mk().r);
  return { prompt: q.s, answer: q.r, opts: shuffle([...opts]), say: q.s, explain: `${q.s} = ${q.parts} → ${q.r}` };
}
function hangulQ() {
  if (quiz.i === 10) {
    S.hangulBest = Math.max(S.hangulBest, quiz.score); save();
    return render(`<div class="done"><p class="hanja">${quiz.score}/10</p><h1>${quiz.score >= 8 ? 'Ready for Lesson 1!' : 'Keep practising'}</h1>
      <button class="primary big" data-act="hstart">Try again</button>${quiz.score >= 8 ? '<a class="ghost big" href="#lesson/0">Start the Survival kit</a>' : '<a class="ghost big" href="#hangul">Back to chart</a>'}</div>`);
  }
  quiz.q = makeQ();
  render(`<div class="bar"><a href="#hangul" aria-label="Quit quiz">✕</a><div class="progress"><i style="width:${quiz.i * 10}%"></i></div><span>${quiz.score}</span></div>
    <section class="card"><p class="label">How is this read?</p><div class="prompt ko huge">${quiz.q.prompt}</div>
    <div class="opts">${quiz.q.opts.map(o => `<button class="opt" data-act="hq" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    <div class="back"><p class="answer small">${esc(quiz.q.explain)}</p><button class="primary" data-act="hnext">Next</button></div></section>`);
}
function markOpts(el, answer) { // null if already answered, else whether el was right
  if ($('.card').classList.contains('revealed')) return null;
  document.querySelectorAll('.opt').forEach(b => b.classList.add(b.dataset.o === answer ? 'right' : b === el ? 'wrong' : 'dim'));
  $('.card').classList.add('revealed'); return el.dataset.o === answer;
}
function hangulAnswer(el) {
  const ok = markOpts(el, quiz.q.answer); if (ok === null) return;
  quiz.score += ok; speak(quiz.q.say);
}

// ---------- Workbook (per lesson, not scheduled) ----------
let wb = null;
function workbook(n) {
  const L = LESSONS.find(l => l.n === +n); if (!L?.workbook) return lessons();
  wb = { L, i: 0, score: 0, fills: L.workbook.exercises.filter(e => e.type === 'fill').length,
    list: [...L.workbook.exercises, ...(L.workbook.reading ? [{ type: 'reading', ...L.workbook.reading }] : [])] };
  workbookQ();
}
function workbookQ() {
  const { L, list, i } = wb, bar = `<div class="bar"><a href="#lesson/${L.n}" aria-label="Quit workbook">✕</a><div class="progress"><i style="width:${100 * i / list.length}%"></i></div><span>${i}/${list.length}</span></div>`;
  if (i === list.length) {
    const pct = wb.fills ? Math.round(100 * wb.score / wb.fills) : 100;
    S.workbook[L.n] = Math.max(S.workbook[L.n] ?? 0, pct); save();
    return render(`<div class="done"><p class="hanja">${wb.score}/${wb.fills}</p><h1>Workbook done</h1>
      <p class="muted">Blanks right: ${pct}%.</p><button class="primary big" data-act="wbagain">Again</button><a class="ghost big" href="#lesson/${L.n}">Back to lesson</a></div>`);
  }
  const e = list[i], next = `<button class="primary" data-act="wbnext">${i + 1 === list.length ? 'Finish' : 'Next'}</button>`;
  let body;
  if (e.type === 'fill') {
    const full = e.ko.replace('___', e.answer);
    body = `<p class="label">Fill the blank</p><div class="prompt ko small">${esc(e.ko).replace('___', '<u class="blank"></u>')}</div><p class="muted">${esc(e.en)}</p>
      <div class="opts">${shuffle([...e.options]).map(o => `<button class="opt ko" data-act="wbpick" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="back"><p class="answer ko small">${esc(full)} ${spk(full)}${mic(full)}</p><p class="muted">${esc(e.why)}</p>${next}</div>`;
  } else if (e.type === 'translate') body = `<p class="label">Say it in Korean</p><div class="prompt small">${esc(e.en)}</div>
      <div class="back"><p class="answer ko small">${esc(e.ko)} ${spk(e.ko)}${mic(e.ko)}</p>${next}</div>
      <button class="primary reveal" data-act="wbreveal">Show answer</button>`;
  else body = `<p class="label">Read, listen, answer ${spk(e.ko)}</p><p class="reading ko">${esc(e.ko)}</p>
      <details><summary>English</summary><p class="muted">${esc(e.en)}</p></details>
      ${(e.questions || []).map(q => `<details><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join('')}
      <div class="next">${next}</div>`;
  render(`${bar}<section class="card">${body}</section>`);
}

// ---------- Progress ----------
function stats() {
  const all = Object.keys(CARDS), seen = all.filter(id => S.cards[id]);
  const words = all.filter(id => CARDS[id].kind === 'rec'), known = words.filter(id => S.cards[id]?.ivl >= 21).length;
  const tomorrow = seen.filter(id => S.cards[id].due < dayStartNow() + 2 * DAY).length;
  const daysLeft = Math.ceil((all.length - seen.length) / Math.max(1, S.settings.newPerDay));
  const finish = new Date(Date.now() + daysLeft * DAY).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const l = S.log[dateKey(d)]; return { d, n: l ? l.new + l.rev : 0 }; });
  const max = Math.max(1, ...days.map(x => x.n));
  render(`<header><p class="eyebrow">진도 · Progress</p><h1>${words.filter(id => S.cards[id]).length} words started</h1></header>
    <div class="tiles">
      <div class="tile"><b>${known}</b><span>mature (21d+)</span></div>
      <div class="tile"><b>${S.unlocked.length}/${LESSONS.length}</b><span>lessons</span></div>
      <div class="tile"><b>${tomorrow}</b><span>due by tomorrow</span></div>
    </div>
    <div class="chart" role="img" aria-label="Cards studied per day, last 14 days">${days.map(x =>
      `<div title="${dateKey(x.d)}: ${x.n}"><i style="height:${100 * x.n / max}%"></i><small>${x.d.getDate()}</small></div>`).join('')}</div>
    <p class="muted center">At ${S.settings.newPerDay} new cards/day you'll have seen every card by <b>${finish}</b>.</p>
    <h2>Settings</h2>
    <label class="set">New cards per day <input type="number" min="0" max="100" data-set="newPerDay" value="${S.settings.newPerDay}"></label>
    <label class="set">Speech speed <input type="range" min="0.5" max="1.2" step="0.1" data-set="rate" value="${S.settings.rate}"></label>
    <label class="set">Auto-play audio <input type="checkbox" data-set="autoplay" ${S.settings.autoplay ? 'checked' : ''}></label>
    <p class="muted">Voice: ${KO_VOICE ? esc(KO_VOICE.name) : 'no Korean voice found — add one in your OS speech settings (macOS: Accessibility → Spoken Content → System Voice → Manage Voices → Korean).'}
      <button class="ghost" data-act="speak" data-t="안녕하세요">Test</button></p>
    <h2>Backup</h2>
    <p class="muted">Progress lives only in this browser. Export regularly, especially before clearing site data or switching devices.</p>
    <div class="row-btns"><button class="ghost" data-act="export">Export</button><label class="ghost">Import<input type="file" accept="application/json" id="import" hidden></label></div>`);
}
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
  a.download = `korean-progress-${todayKey()}.json`; a.click(); URL.revokeObjectURL(a.href);
}
async function importData(file) {
  try {
    const d = JSON.parse(await file.text());
    if (typeof d.cards !== 'object' || !Array.isArray(d.unlocked)) throw new Error('not a progress file');
    if (!confirm(`Replace current progress with ${Object.keys(d.cards).length} cards from this file?`)) return;
    localStorage.setItem(KEY + '-before-import', JSON.stringify(S));
    S = { ...structuredClone(DEFAULTS), ...d, settings: { ...DEFAULTS.settings, ...d.settings } }; save(); toast('Progress imported'); stats();
  } catch (e) { toast('Import failed: ' + e.message); }
}

// ---------- wiring ----------
const ACT = {
  speak: el => speak(el.dataset.t), start: startSession, reveal, grade: el => grade(+el.dataset.g), chip: pickChip,
  continue: () => grade(sess.sentOk ? 2 : 0),
  unlock: el => { S.unlocked.push(+el.dataset.n); save(); toast('Added — start a session from Today'); lesson(el.dataset.n); },
  hstart: () => { quiz = { i: 0, score: 0 }; hangulQ(); }, hq: hangulAnswer, hnext: () => { quiz.i++; hangulQ(); },
  more: el => { const d = (S.log[todayKey()] ||= { new: 0, rev: 0 }); d.extra = (d.extra || 0) + +el.dataset.k; save(); today(); },
  export: exportData,
  rec: record,
  wbpick: el => { const ok = markOpts(el, wb.list[wb.i].answer); if (ok === null) return; wb.score += ok; speak(wb.list[wb.i].ko.replace('___', wb.list[wb.i].answer)); },
  wbreveal: () => { $('.card').classList.add('revealed'); speak(wb.list[wb.i].ko); },
  wbnext: () => { wb.i++; workbookQ(); }, wbagain: () => workbook(wb.L.n),
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.disabled) ACT[el.dataset.act](el); });
document.addEventListener('change', e => {
  if (e.target.id === 'import' && e.target.files[0]) return importData(e.target.files[0]);
  const k = e.target.dataset.set; if (!k) return;
  S.settings[k] = e.target.type === 'checkbox' ? e.target.checked : Math.max(0, +e.target.value || 0); save(); if (k === 'newPerDay') stats();
});
document.addEventListener('keydown', e => {
  if (location.hash !== '#study' || !sess?.queue.length) return;
  const kind = CARDS[sess.queue[0]].kind;
  if (e.key === 'Enter' || (e.key === ' ' && e.target.tagName !== 'INPUT')) {
    e.preventDefault();
    if (!sess.revealed && kind !== 'sent') reveal(); else if (sess.revealed && kind === 'sent') ACT.continue();
  } else if (sess.revealed && kind !== 'sent' && '1234'.includes(e.key) && e.key) grade(+e.key - 1);
});
const ROUTES = { today, study, lessons, lesson, workbook, hangul, stats };
function route() {
  const [name, arg] = location.hash.slice(1).split('/');
  if (name !== 'study') sess = null;
  stopRec(false);
  (ROUTES[name] || today)(arg);
  const tab = name === 'lesson' || name === 'workbook' ? 'lessons' : ROUTES[name] ? name : 'today';
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.hash === '#' + tab));
  document.body.classList.toggle('focus', name === 'study');
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
