# Learning science for a 6-month Korean flashcard PWA

Goal: adult English speaker, about 1 h/day for 26 weeks (about 180 h), "functional" survival-plus Korean for life in Korea.
Researched 2026-11-13. Figures marked *(est.)* are my estimates, not findings from a source.

## 0. Reality check

- The FSI puts Korean in **Category IV**: about **88 weeks / 2,200 class hours** to reach professional working proficiency ([FSI](https://www.state.gov/foreign-language-training/); 2023 report via [Korea Times](https://www.koreatimes.co.kr/www/nation/2023/11/113_240261.html)).
- 180 h is about 8% of that. A realistic goal is **survival + basic conversation** (roughly TOPIK I level 1–2 / CEFR A2), not fluency. Design for transactions, not for literature.

## 1. Spaced repetition: SM-2 vs FSRS

- **Spacing works.** In a meta-analysis of 254 studies (Cepeda et al. 2006), spaced practice beat massed practice. Optimal gaps grow with the retention interval ([Cepeda 2006](https://doi.org/10.1037/0033-2909.132.3.354), [Cepeda 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x)). L2-specific meta-analysis: [Kim & Webb 2022](https://doi.org/10.1111/lang.12479). Flashcards specifically: one big spaced deck beat several small massed decks ([Kornell 2009](https://doi.org/10.1002/acp.1537)).
- **FSRS predicts recall better than SM-2 for almost every user.** On about 10k Anki collections (about 350–520M reviews), FSRS-6 has lower log loss than SM-2 for **99.6%** of users ([Expertium benchmark](https://expertium.github.io/Benchmark.html), [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark); FSRS-6 log loss 0.346, RMSE 0.065). Caveat: SM-2 never predicted probabilities, so the comparison needs an add-on converter.
- **Does that matter for one learner?** Yes, modestly. Better predictions put reviews closer to the target retention, so fewer reviews are wasted and fewer cards are forgotten. Workload-saving figures (about 20–30%) circulate in community posts, but I could not find them in a primary source, so **treat them as unverified**.
  - The practical wins are a single, understandable knob (**desired retention**) and sane handling of overdue cards, which matter most after missed days.
  - FSRS defaults already beat SM-2 on most collections. Per-user optimisation improves things further: FSRS-7 log loss drops from 0.362 to 0.340 ([srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)). It needs at least "a few hundred" reviews and is worth re-running about monthly ([Anki manual](https://docs.ankiweb.net/deck-options.html)).
- **Implementation:** [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) is a TypeScript scheduler (ESM/UMD, FSRS-6/7) that fits a PWA directly. Its optimizer (`@open-spaced-repetition/binding`) is a separate Node/WASM package, so ship defaults and optimise later or offline.
- **Anki guidance carried over to FSRS** ([Anki manual](https://docs.ankiweb.net/deck-options.html)):
  - Default desired retention is **0.90**. Do not exceed 0.97, because workload explodes.
  - Keep (re)learning steps **under 1 day** (e.g. 10m), and keep few of them.
  - "20 new/day ≈ 200 reviews/day" at steady state.
  - Stop new cards when there is a review backlog.
- **Numbers for 1,800 words in 26 weeks:**
  - 1,800 words over about 150 study days is about **12 new words/day**. The plan reserves weeks 1, 13, 25 and 26 for other work (Hangul, consolidation, final review).
  - With about 10× reviews, steady state is about 120–150 reviews/day. At about 8 s/card *(est.)* that is **about 15–20 min**, which fits.
  - Desired retention: **0.90** (allow 0.85–0.92). With a 6-month horizon, the long-term workload gains from lower retention matter less than recall during real use.
  - Cap reviews per day (e.g. 200) and auto-pause new cards when overdue reviews exceed about one day's worth.

## 2. Retrieval practice; recognition vs production

- **Testing effect:** retrieving beats restudying for delayed retention ([Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x)). In L2 vocabulary, repeated retrieval, not repeated study, drove a large gain at 1 week ([Karpicke & Roediger 2008, *Science*](https://doi.org/10.1126/science.1152408)). Cards must force an attempt **before** revealing the answer, with no "peek" path.
- **Direction is learned separately.** Receptive practice (KR→EN) mainly builds receptive knowledge, and productive practice (EN→KR) mainly builds productive knowledge ([Webb 2009](https://doi.org/10.1177/0033688209343854)). Recognition is easier during learning, but the test direction matters ([Schneider, Healy & Bourne 2002](https://doi.org/10.1006/jmla.2001.2813)). Taxonomy and critique of flashcard software: [Nakata 2011](https://doi.org/10.1080/09588221.2010.520675).
- **Design:** use **both directions, recognition first.**
  - Create the KR→EN card on introduction. Unlock its EN→KR sibling once the recognition card has graduated, e.g. after FSRS stability reaches 3 days or more *(est. threshold)*.
  - Production can be self-graded and spoken aloud; typing is optional. Korean IME friction on mobile is real.
  - Flashcards are effective for intentional vocabulary learning overall ([Webb, Yanagisawa & Uchihara 2020 meta-analysis](https://doi.org/10.1111/modl.12671)).

## 3. Comprehensible input vs explicit grammar; sentences vs words

- **Krashen's input hypothesis** holds that acquisition comes from comprehensible input, with explicit grammar only as a "monitor" ([Krashen 1982](http://www.sdkrashen.com/content/books/principles_and_practice.pdf)). It is influential but largely untestable as stated.
- **Explicit instruction works.** It produced large effects and beat implicit instruction in a meta-analysis of 49 studies ([Norris & Ortega 2000](https://doi.org/10.1111/0023-8333.00136)). The benefits held for both simple and complex structures ([Spada & Tomita 2010](https://doi.org/10.1111/j.1467-9922.2010.00562.x)).
- **Synthesis:** use Nation's **four strands**: about equal time for meaning-focused input, meaning-focused output, language-focused study (cards and grammar), and fluency practice ([Nation 2007](https://doi.org/10.2167/illt039.0)). A flashcard-only app covers one strand, so the app should schedule the other three.
- **Coverage:** comfortable comprehension needs about 95–98% known tokens ([Nation 2006](https://doi.org/10.3138/cmlr.63.1.59)), so beginners need **graded** input. At 1,800 words, native media remains hard; slow, learner-directed audio is the target.
- **Sentences vs isolated words:**
  - For initial form–meaning learning, word pairs are efficient. A single sentence context added little ([Webb 2007](https://doi.org/10.1177/1362168806072463)).
  - Korean grammar, however, lives in particles and verb endings, which only appear in sentences.
  - **Design:** use word cards (word → meaning) with **one short example sentence and its audio on the back**, plus separate **sentence/cloze cards for grammar patterns** (e.g. `커피 ___ 주세요` → `한 잔`).

## 4. Audio, listening, shadowing, TTS

- Korean spelling ≠ pronunciation, because sound-change rules reshape words (감사합니다 → [감사함니다], 같이 → [가치], 국물 → [궁물]). Learners must hear every item, so **every card gets audio**, auto-played on reveal.
- The three-way stop contrast (ㄱ/ㅋ/ㄲ, ㄷ/ㅌ/ㄸ, ㅂ/ㅍ/ㅃ, ㅈ/ㅊ/ㅉ) is hard for English speakers. **Minimal-pair listening drills** are cheap to build.
- **Shadowing** (repeating audio with a lag of under a second) improved L2 listening comprehension in controlled studies ([Hamada 2016](https://doi.org/10.1177/1362168815597504)). Add a "listen → shadow → self-rate" mode for sentence cards.
- **Browser TTS:** the Web Speech API (`speechSynthesis`, [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)) has **OS-dependent voices**.
  - A ko-KR voice exists on iOS/macOS (Yuna), Android (Google), and Windows with a language pack. Some desktop setups have none; check `getVoices()` and fall back.
  - It handles sound-change rules acceptably for single words; sentence prosody is weaker.
  - Classroom evaluations found TTS adequate for vocabulary/pronunciation input ([Bione, Grimshaw & Cardoso 2016](https://doi.org/10.14705/rpnet.2016.eurocall2016.537)).
  - Verdict: **acceptable for word cards for a beginner.** For sentence cards, pre-generate neural TTS (or native) audio files and cache them offline. Daily listening input should be human speech.

## 5. Korean-specific

- **Hangul:** the 1446 *Hunminjeongeum Haerye* claims "a wise man can learn them in a morning" ([Hunminjeongeum](https://en.wikipedia.org/wiki/Hunminjeongeum)). Plan **days 1–2** for letters and syllable blocks, then the rest of week 1 for 받침 and core sound-change rules. Drill with romanisation-free reading cards and audio, and do not show romanisation after week 1.
- **Speech levels:** Korean has distinct speech levels marked by verb endings ([Sohn, *The Korean Language*, CUP 1999](https://doi.org/10.1017/CBO9781139165143)). For an adult newcomer:
  - **해요체 (polite informal)** is the default for production with strangers, shop staff and colleagues. **Produce only 해요체 for months 1–4.**
  - **합니다체 (formal)** needs recognition early, because announcements, signage, news and service staff use it. Produce a few set phrases (감사합니다, 처음 뵙겠습니다).
  - **반말 (casual)** is for recognition only, in months 5–6. Misusing it is the costly error.
  - Honorific **-(으)시-** and humble vocabulary (드시다, 계시다, 드리다): learn them as recognition, plus a few production phrases.
- **High-frequency vocab:** use the NIKL learner word list *한국어 학습용 어휘 목록* (2003): 5,965 words graded A/B/C, with about 980 at level A ([NIKL, korean.go.kr](https://www.korean.go.kr)). **A plus core B gives roughly 1,800.** Re-order by survival domain rather than raw frequency.
- **Sino-Korean:** about half or more of the dictionary is Sino-Korean, roughly **57%** per the NIKL *Standard Korean Language Dictionary*, and more among nouns ([overview with refs](https://en.wikipedia.org/wiki/Sino-Korean_vocabulary)).
  - Tag words with their hanja morpheme (e.g. 학 學: 학교, 학생, 대학, 학원) and show "family" links on reveal. This is cheap and aids inference.
  - Sino-Korean numbers (일, 이, 삼) are used for prices, dates, phone numbers and minutes. Native numbers (하나, 둘) are used for counting items, ages and hours. **Both are needed in week 1–2.**
- **Survival domains for living in Korea:** greetings and politeness; numbers, money, time and dates; ordering food and cafés (주세요, -(으)로 할게요, 포장/매장); transport (T-money, 지하철, 버스, 택시 address phrases, 갈아타다); shopping and convenience stores (봉투, 영수증, 카드); directions; pharmacy and hospital (아파요, symptoms, 약국); phone, address and delivery apps (배달, 주소); housing (월세, 보증금, 관리비); bank and immigration (외국인등록증/ARC, 계좌); emergencies (112, 119, 도와주세요).

## 6. 26-week schedule (about 1 h/day)

Daily template *(est., from Nation's four strands)*:
- **20–25 min SRS:** reviews first, then new cards.
- **15–20 min listening:** graded audio with transcript, then 5 min shadowing.
- **10–15 min grammar and speaking:** read 1 pattern, then say or record 5 sentences.

The time can be split across the day.

| Weeks | Focus | New cards/day | Grammar / skills |
|---|---|---|---|
| 1 | Hangul (d1–2), 받침 + sound changes, 40 survival phrases, both number systems | phrases only | Reading drills; audio minimal pairs |
| 2–4 | Core A-level verbs/nouns; food, café, transport | 10 | 이에요/예요, 은/는, 이/가, 을/를, 에/에서, 있어요/없어요, 해요 present/past, 주세요, -고 싶어요, negation 안/못 |
| 5–8 | Shopping, directions, time, phone/address | 12–15 | Future -(으)ㄹ 거예요, -(으)ㄹ게요, -(으)세요, -아/어야 돼요, -(으)ㄹ 수 있어요, -고 있어요, counters |
| 9–12 | Health, housing, bank/ARC, work small talk | 12–15 | -고, -지만, -아/어서, -(으)니까, -(으)면, -는데, -아/어 주세요, past -았/었; start 1–2 weekly tutor or exchange sessions (30 min) |
| 13 | **Consolidation**: clear backlog, no new cards | 0 | Re-read all grammar; mock role-plays per domain |
| 14–20 | B-level vocab by domain; sentence/cloze cards | 12 | Modifiers -(으)ㄴ/-는/-(으)ㄹ, -기 전에/-(으)ㄴ 후에, -(으)려고, -아/어 봤어요; 합니다체 recognition |
| 21–24 | Fill gaps from real use; listening to unscripted speech | 10 | -거든요, -네요, -지요/죠, -(으)ㄹ까요; 반말 recognition; honorific -시- |
| 25–26 | **Reviews only**; TOPIK I practice test as a benchmark | 0 | Full-domain role-plays; record yourself and compare |

Cumulative: about 1,800–1,900 words, about 40 grammar patterns, and about 180 h in total (about 70 h of it SRS).
