# 한국어 Daily

A personal Korean study PWA: Hangul trainer, HowToStudyKorean lesson notes, spaced-repetition word + sentence cards, a per-lesson workbook, and record-and-compare speaking practice. See [PLAN.md](PLAN.md).

## Run

```sh
python3 -m http.server 8765    # then open http://localhost:8765
```

Keyboard: `Space`/`Enter` reveals the answer, `1`–`4` grades (Again / Hard / Good / Easy).

## On your phone

Installing a PWA needs HTTPS. Every push to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`) at https://spyobird.github.io/korean-study/. Open it on your phone and use "Add to Home Screen".

Progress is stored in that browser's localStorage. Use **Progress → Export** to back up or move between devices.

## Update content

Edit or add `research/lessons-*.json` or `research/workbook-*.json`, then run `python3 build.py`.

## Tests

```sh
node srs.test.js
```

## Credits

The curriculum follows [HowToStudyKorean](https://www.howtostudykorean.com/) by Gregory Pelley. The lesson order, titles and vocabulary lists in `research/lessons-*.json` are taken from that site, and every lesson in the app links back to its original page. The grammar explanations, example sentences and workbooks are AI-written paraphrases, not copied text, and have not been checked by a native speaker.

This is a personal, non-commercial study tool. All HowToStudyKorean content belongs to its author. If you find it useful, read the full lessons on the site and support it there. If you are the rights holder and want anything removed, open an issue.
