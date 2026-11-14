// SM-2 variant with Anki-style learning steps. grade: 0 again, 1 hard, 2 good, 3 easy.
// shortcut: SM-2 not FSRS; FSRS needs ~15-20% fewer reviews at equal retention — swap in if review load gets heavy.
const MIN = 60e3, DAY = 864e5;
const dayStart = t => new Date(t).setHours(0, 0, 0, 0);

function schedule(card, g, now = Date.now()) {
  const c = card ? { ...card } : { ivl: 0, ease: 2.5, step: 0, reps: 0, lapses: 0, first: now };
  c.reps++; c.last = now;
  if (c.ivl === 0) { // learning / relearning: 1m -> 10m -> 1d
    if (g === 0) { c.step = 0; c.due = now + MIN; }
    else if (g === 1) c.due = now + 5 * MIN;
    else if (g === 2 && c.step === 0) { c.step = 1; c.due = now + 10 * MIN; }
    else { c.ivl = g === 3 ? 4 : 1; c.due = dayStart(now) + c.ivl * DAY; }
    return c;
  }
  if (g === 0) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 0; c.step = 1; c.due = now + 10 * MIN; return c; }
  if (g === 1) { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl *= 1.2; }
  else if (g === 2) c.ivl *= c.ease;
  else { c.ivl *= c.ease * 1.3; c.ease += 0.15; }
  c.ivl = Math.max(1, Math.round(c.ivl));
  c.due = dayStart(now) + c.ivl * DAY; // due at local midnight so a morning session catches it
  return c;
}

if (typeof module !== 'undefined') module.exports = { schedule, DAY, MIN };
