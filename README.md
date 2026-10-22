# Hopper

> Every bill needs a home. A 3D browser game made of real bills from the 119th Congress.

**Play:** https://hopper-rouge.vercel.app · **Source:** https://github.com/tmoody1973/hopper · **License:** MIT

## Overview

Bills float out of a low-poly Capitol dome on balloons, one every 5 seconds. You read each title and drag the crate into the bin for its policy area before it lands. There are 8 bins: Health, Taxation, Energy, Education, Armed Forces and National Security, Environmental Protection, Crime and Law Enforcement, and Government Operations and Politics.

- **Win:** 25 correct sorts. The dome gains one ring per correct answer, and the Statue of Freedom goes on top at 25.
- **Lose:** 3 wrong bills in any one bin ("gridlock").
- **Miss:** a bill that lands unsorted just disappears. No penalty, no point.

The policy areas are the ones the Congressional Research Service assigns on Congress.gov, exactly one per bill. Crate colour leans toward the right bin's colour, but only as a hint.

The same page is both the home page and the game. The first screen shows the live 3D scene behind a PLAY button. Below it are a "try one bill" quiz, how a round works, the eight bins, and a build log.

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
2. It looks up each bill's policy area.
3. It keeps up to 15 bills per bin (120 total), merged with the real bills already in `bills.json`.

The page then shows "real bills from congress.gov · updated <date>".

Options: `--max 800` checks fewer bills (default 2,000; one API request each), and `--out file.json` writes somewhere else. If fewer than 30 usable bills come back, it leaves `bills.json` untouched.

### Deploy

```bash
npm run refresh-bills   # optional: newer bills
vercel deploy --prod
curl -s -o /dev/null -w '%{http_code}\n' https://hopper-rouge.vercel.app/.env.local   # must print 404
```

`.vercelignore` keeps `.env*`, `scripts/`, `docs/`, all `*.md` files and `.remember/` off Vercel. Check the 404 after every deploy.

## Project Structure

```
hopper/
├── index.html          # Home page + game: poster, PLAY, #more sections, HUD, overlays
├── styles.css          # Type scale, palette, page and HUD layout
├── main.js             # Game loop, crates, drag-and-drop, grading, pause, camera, HUD
├── rules.js            # Rule numbers and the 8 policy areas, shared by the game and the page
├── data.js             # Bill loading: optional live fetch, then bills.json
├── world.js            # Floating island, trees, clouds, confetti, balloons, the 8 bins
├── capitol.js          # Procedural Capitol: launcher, 25-ring dome, statue, gridlock cloud
├── textures.js         # Canvas-painted textures and the bill title cards
├── audio.js            # Synthesized sound effects and mute
├── page.js             # "Try one bill" quiz, bin cards, rule numbers on the page
├── bills.json          # Bill snapshot the game plays
├── scripts/
│   └── refresh-bills.mjs   # Downloads real bills into bills.json
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
- **Feedback:** the right bin glows green, a wrong bin flashes red, and a toast names the real policy area for 2 seconds while the right bin glows gold.
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
