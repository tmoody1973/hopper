# Hopper

> Every bill needs a home. A 3D browser game made of real bills from the 119th Congress.

**Play:** https://hopper-rouge.vercel.app · **Source:** https://github.com/tmoody1973/hopper · **License:** MIT

## Overview

Bills float out of a low-poly Capitol dome on balloons, one every 5 seconds. Each card shows the bill's title and one plain line about what it would do. You drag the crate into the bin for its policy area before it lands. There are 8 bins: Health, Taxation, Energy, Education, Armed Forces and National Security, Environmental Protection, Crime and Law Enforcement, and Government Operations and Politics.

- **Win:** 25 correct sorts. The dome gains one ring per correct answer, and the Statue of Freedom goes on top at 25.
- **Lose:** 3 wrong bills in any one bin ("gridlock").
- **Miss:** a bill that lands unsorted just disappears. No penalty, no point.

The policy areas are the ones the Congressional Research Service assigns on Congress.gov, exactly one per bill. Crates blush their bin's colour only near the ground, so reading the card is the faster way. After each round, Your Docket explains every bill you handled.

The same page is both the home page and the game. The first screen shows the live 3D scene behind a PLAY button. Below it are a "try one bill" quiz, how to play, the eight bins, and a build log.

## How to play

1. **Read the card.** Each bill's card shows its title and one plain line about what it would do. The same line sits in the bar at the bottom of the screen.
2. **Drag it to a bin.** Drop the crate on the bin for its policy area. Green means right. Red is a strike, and the right bin glows gold so you learn it.
3. **Beat the colour.** Near the ground the crate blushes its bin's colour. Reading is faster, and the end card counts how often you sorted before the hint.
4. **Open your docket.** 25 right finishes the dome; 3 strikes in one bin is gridlock. Then open every bill you handled to see what it would do, where it is in Congress, and who's behind it.

Controls: mouse or touch to drag · Esc or P to pause · M to mute.

## Tech Stack

| Layer | Technology |
|-------|------------|
| 3D | three.js r170, vendored in `lib/`, loaded through an importmap |
| UI | Plain HTML, CSS and ES modules. No framework and no build step |
| Art | Every model and texture drawn in code. No image files |
| Sound | Web Audio API synthesis. No audio files |
| Type | Baloo 2, Nunito and JetBrains Mono, self-hosted woff2 in `fonts/` |
| Data | Congress.gov API v3, saved into `bills.json` by a Node script |
| Hosting | Vercel (static) |

## Quick Start

### Prerequisites

- A current browser with WebGL (Chrome, Safari, Firefox or Edge)
- Python 3, or any static file server, to serve the folder locally
- Node.js 20+, only for refreshing bills
- A free Congress.gov API key from https://api.data.gov/signup/, only for refreshing bills

### Run locally

Browsers block ES modules on pages opened straight from disk (`file://`), so serve the folder:

```bash
git clone https://github.com/tmoody1973/hopper.git
cd hopper
python3 -m http.server 8000
# open http://localhost:8000
```

There's nothing to install. `package.json` exists only to name the bill-refresh script.

### Refresh the bills

`bills.json` holds a snapshot of real bills. To update it:

```bash
cp .env.example .env.local
# open .env.local and paste your key after CONGRESS_API_KEY=
npm run refresh-bills
```

The script works in three steps:
1. It reads the 119th-Congress bill list, and the 118th only for bins the 119th can't fill.
2. It looks up each bill's policy area and keeps up to 15 bills per bin (120 total), merged with the real bills already in `bills.json`.
3. For every kept bill, it saves the official CRS summary, sponsor, latest action and Congress.gov link. Bills with no summary get their official long title instead. Status is refreshed every run, because bills move.
4. It drops any bill whose card couldn't say what it does (no summary, no official title, and a short title).

The page then shows "real bills from congress.gov · updated <date>".

A run with a full deck costs about 250 requests (two or three per kept bill). Options: `--max 800` checks fewer new bills (default 2,000; one API request each), and `--out file.json` writes somewhere else. If fewer than 30 usable bills come back, it leaves `bills.json` untouched.

### Deploy

```bash
npm run refresh-bills   # optional: newer bills
vercel deploy --prod
curl -s -o /dev/null -w '%{http_code}\n' https://hopper-rouge.vercel.app/.env.local   # must print 404
```

`.vercelignore` keeps `.env*`, `scripts/`, `docs/`, all `*.md` files and `.remember/` off Vercel. Check the 404 after every deploy.

## Launch video

`video/` is a Remotion project that cuts a 30-second launch video from the real game, in 16:9 (YouTube) and 9:16 (Reels / Shorts).

```bash
cd video
npm install
npx playwright install chromium          # once
node scripts/record.mjs hero play dome docket audio   # records the game (~12 min)
npx remotion studio                       # preview
npx remotion render Launch16x9 out/hopper-launch-16x9.mp4
npx remotion render Launch9x16 out/hopper-launch-9x16.mp4
```

How the footage is made:
1. `/?capture=<scene>` puts the game in recording mode: a seeded RNG, no real-time loop, and a scripted cursor (`capture.js`).
2. The recorder steps it one frame at a time in headless Chrome and pipes the frames to FFmpeg.
3. Each scene also writes an event log (launch, grab, drop), which the edit uses to sync cuts and sound.

All audio comes from the game's own synthesizer recipes, rendered offline: no music or sound files to license. Re-record whenever the game changes. Remotion is free for individuals and teams of up to 3; larger organisations need a [company license](https://www.remotion.pro/license).

## Project Structure

```
hopper/
├── index.html          # Home page + game: poster, PLAY, how to play, HUD bars, overlays
├── styles.css          # Type scale, palette, page and HUD layout
├── main.js             # Game loop, crates, drag-and-drop, grading, pause, camera, HUD
├── rules.js            # Rule numbers and the 8 policy areas, shared by the game and the page
├── data.js             # Bill loading: optional live fetch, then bills.json
├── world.js            # Floating island, trees, clouds, confetti, balloons, the 8 bins
├── capitol.js          # Procedural Capitol: launcher, 25-ring dome, statue, gridlock cloud
├── textures.js         # Canvas-painted textures and the bill title cards
├── audio.js            # Synthesized sound effects and mute
├── page.js             # "Try one bill" quiz, bin cards, rule numbers on the page
├── capture.js          # ?capture recording mode for the launch video (loaded only then)
├── learn.js            # Bill cards for the Docket and quiz: plain line, journey, sponsor
├── bills.json          # Bill snapshot the game plays
├── scripts/
│   └── refresh-bills.mjs   # Downloads real bills into bills.json
├── video/              # Remotion launch video + gameplay recorder (not deployed)
├── lib/                # three.js r170 + its MIT licence (LICENSE-three.txt)
├── fonts/              # Self-hosted woff2 files + their OFL licences (OFL-*.txt)
├── LICENSE             # MIT
├── docs/decisions/     # Decision records (plain-English, why each call was made)
├── STYLE.md            # The look: palette, light, camera, type, "never" list
└── KEEP.md             # Behaviour that must keep working; paste into every change brief
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CONGRESS_API_KEY` | Congress.gov / api.data.gov key, read only by `scripts/refresh-bills.mjs` from `.env.local` | Only for refreshing bills |
| `VERCEL_OIDC_TOKEN` | Written to `.env.local` by `vercel link`. Not used by the game | No |

Never put the key in `main.js`. `CONFIG.API_KEY` there would fetch bills live in every visitor's browser, which makes the key public and shares one request limit across all players. It stays empty on purpose.

## Features

- **Real bills:** a snapshot of 120 bills, 15 per bin, from the 119th Congress (the 118th fills any bin the 119th can't). Each card names its bill number and Congress. A made-up sample set is labelled "sample" if no snapshot exists.
- **Capitol as game machine:** bills launch from the dome, the dome grows a ring per correct sort, fireworks play at 25, and a rain cloud arrives on gridlock.
- **Drag and drop:** mouse or touch, one crate at a time. The bin under the cursor highlights.
- **Every card says what the bill does:** the title plus one plain line from the official CRS summary (or the official long title). Bills that can't explain themselves are left out of the deck.
- **Late colour hint:** crates fall as plain wood and only blush their bin's colour near the ground, so reading is the faster way. The end card counts right answers made before the hint.
- **Your Docket:** after each round, open every bill you handled (mistakes first) to see what it would do, where it is in Congress (a journey from introduced to law), who sponsored it, and a link to Congress.gov.
- **Nothing covers the bills:** the HUD lives in a bar above and a bar below the 3D view (score, feedback and strikes on top; the bill's plain line, pause and sound below).
- **Feedback:** the right bin glows green, a wrong bin flashes red, and the top bar names the real policy area for 2 seconds while the right bin glows gold.
- **Sound:** gavel, launch, pick-up, a streak that climbs in pitch, a wrong "bonk", a plop, a fanfare and the sad trombone. Mute with M or the button; the setting is remembered.
- **Pause:** Esc, P or the button. Switching tabs or windows pauses too. The pause card hides the scene so titles can't be read ahead.
- **Readable and accessible:** 18px body text, nothing that carries information under 15px, rem sizing, and every text colour at least 4.5:1 contrast. It honours the reduced-motion setting, uses real headings, and has 44–48px touch targets.
- **Honest page:** every rule number on the page is imported from `rules.js`, and the quiz grades with the game's own function.

## Testing

There are no automated tests in the repo yet. During development, a headless Node harness ran the real modules against a fake page, fake audio and a stub renderer. It played full rounds: win, lose, restart, pause and mute. It also checked the data fallbacks against a mock API. That harness lived outside the project folder. Adding it under `tests/` with a CI workflow is the next step before more people depend on the site.

## Decisions

Plain-English records of the main calls, each with the options, the cost, and a blank "What actually happened" line:

1. [Call the game "Hopper"](docs/decisions/001-name-hopper.md)
2. [The Capitol launches bills and is the progress meter](docs/decisions/002-capitol-launcher-and-progress.md)
3. [One page: the live game scene is the poster](docs/decisions/003-one-page-live-hero.md)
4. [Every sound is synthesized in code](docs/decisions/004-synthesized-sound.md)
5. [Fetch real bills on my machine, ship them as a file](docs/decisions/005-fetch-bills-on-my-machine.md)
6. [Explain bills with official CRS summaries, not AI rewrites](docs/decisions/006-official-summaries-not-ai.md)
7. [The colour hint arrives late](docs/decisions/007-late-colour-hint.md)

## Contributing

Read `KEEP.md` and `STYLE.md` first and include both in any change request. Change one system at a time. After a change, play one full round (win or lose, then restart) before calling it done.

## License

[MIT](LICENSE) © 2026 Tarik Moody. Use it, change it, ship it; keep the copyright notice.

Third-party parts keep their own licences, and their full texts are included:

| Part | License | File |
|------|---------|------|
| three.js r170 | MIT | `lib/LICENSE-three.txt` |
| Baloo 2 | SIL Open Font License 1.1 | `fonts/OFL-Baloo2.txt` |
| Nunito | SIL Open Font License 1.1 | `fonts/OFL-Nunito.txt` |
| JetBrains Mono | SIL Open Font License 1.1 | `fonts/OFL-JetBrainsMono.txt` |

Bill titles and policy areas come from the Congress.gov API (Library of Congress). Policy areas are assigned by the Congressional Research Service.
