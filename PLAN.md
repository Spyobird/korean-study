# Korean in 6 months: plan

**Goal:** survival-to-conversational Korean (about CEFR A2) before arriving in Korea, around May 2027.
**Budget:** about 1 hour/day for 26 weeks, roughly 180 hours. For scale, the FSI estimates about 2,200 class hours for full professional fluency in Korean. So the target is to *get by and keep learning in-country*, not fluency.
**Spine:** the [HowToStudyKorean](https://www.howtostudykorean.com/) curriculum (Units 1–3), drilled with spaced repetition in this app.
Evidence and sources: [`research/learning-science.md`](research/learning-science.md).

## Method (what the research says, and how the app applies it)

| Principle | In the app |
|---|---|
| Retrieval practice (testing effect) is the strongest lever | Every card makes you recall before you reveal. Say it out loud. |
| Spaced repetition, about 90% target retention | SM-2 scheduler (`srs.js`), learning steps 1m → 10m → 1d |
| Recognition first, then production; each direction trains a different skill | Korean→English card first. The English→Korean card unlocks the next day. |
| Grammar sticks best in sentences | Sentence-builder cards from each lesson's grammar examples (tap the words in order) |
| Korean spelling ≠ pronunciation, so hear everything | Browser Korean TTS on every word and sentence, auto-played |
| About 12 new words/day reaches about 1,800 words in 6 months | 25 new cards/day by default (about 12 words, since each word has 2 cards). Adjustable. |
| Protect against review backlogs | New cards pause automatically when more than 150 reviews are due |
| Polite 해요체 first, recognise 합니다체 | Survival kit (Lesson 0) and HTSK order |

## 26-week schedule (about 1 h/day)

Daily hour: **20–25 min app** (reviews first, then new cards) + **15–20 min listening** (podcast or YouTube with transcript; shadow 5 min of it) + **10–15 min** reading the next HTSK lesson / speaking.

| Weeks | Focus | App |
|---|---|---|
| 1 | Hangul (days 1–2), final consonants, sound changes; Survival kit | Hangul tab until quiz ≥ 8/10, then Lesson 0 + Lesson 1 |
| 2–14 | **Unit 1** (lessons 1–25): particles, conjugation, tenses, numbers, questions | Read a new lesson about every 3–4 days. About 1,030 words. |
| 13 | Consolidation week | Set new cards to 0, clear backlog, re-read weak lessons |
| 15–24 | **Unit 2** (lessons 26–50): connectors, modifiers, ~고 싶다, ~아/어야 하다… | About 810 words. Raise new cards/day to 30 if reviews stay under 20 min. |
| 25–26 | Pre-departure | New cards 0; Survival kit + listening; recognise 반말 (casual speech) |
| In Korea | **Unit 3** (lessons 51–75) | Already in the app, about 600 words |

Check-ins: the Progress tab shows mature words (interval ≥ 21 days) and a projected finish date at your current pace. If the date drifts past departure, raise new cards/day. If daily reviews take over 30 min, lower it.

## App: what exists

Static PWA, no build step and no dependencies. Runs offline after the first load.

- `index.html`, `style.css`, `app.js`: Today / Lessons / Hangul / Progress screens
- `srs.js` + `srs.test.js`: scheduler and its self-check (`node srs.test.js`)
- `research/*.json`: curriculum extracted from HTSK by research agents. Vocab lists come from the site. Grammar explanations and example sentences are original paraphrases, each lesson links back to the full HTSK page.
- `build.py`: merges `research/*.json` into `data/curriculum.js`, validating workbook items (bad ones are dropped with a WARN)
- **Workbook** per lesson (`research/workbook-*.json`, linked from each lesson page): 8 fill-the-blank + 4 translate + a short reading with questions. AI-written like the example sentences, so unreviewed. Not scheduled by SRS; best score is kept.
- **Record & compare** (🎙 next to model answers, lesson examples and workbook answers): records you, plays your take back, then the model audio. Needs HTTPS or localhost for the mic.

Content: 76 lessons (Survival kit + HTSK 1–75), 2,476 unique words, 1,141 grammar example sentences, 912 workbook exercises + 75 readings.

## Roadmap (not built yet, in priority order)

1. **Native-speaker check of example sentences and workbooks.** They were written by AI agents and are unreviewed. Flag bad ones as you hit them.
2. **FSRS scheduler** (`ts-fsrs`): about the same retention with fewer reviews. Do this once you have a few hundred reviews of history.
3. **Listening / shadowing mode** (record & compare exists; still missing: a dedicated session that plays sentences, you repeat, then self-rate). Minimal pairs for ㄱ/ㅋ/ㄲ, ㄷ/ㅌ/ㄸ, ㅂ/ㅍ/ㅃ, ㅈ/ㅊ/ㅉ.
4. Better audio: pre-generated neural TTS for sentences, cached offline.
5. Sino-Korean (한자어) root tags, showing related words on reveal.
6. Cross-device sync. For now, use Progress → Export/Import.
