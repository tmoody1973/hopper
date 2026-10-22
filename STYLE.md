# STYLE.md — Hopper

Look: low-poly flat pastel, after skyhold.lol, because a toy-diorama Capitol makes a dry subject friendly
and clear silhouettes keep the one thing that matters readable: the bill title, then the bin.

Palette: sky #8fc3ec → #ffe0b8 · ink #2b2540 · ink-soft #5d5675 · paper #fffaf3 · grass #79c27c ·
coin #f2bd4f · alarm #ef6a6a. Bin colours live in rules.js (one per policy area).

Materials: MeshLambertMaterial with flatShading for everything solid; MeshBasicMaterial for signs and glows.
Light & fog: HemisphereLight (warm sky, green ground) + one DirectionalLight with soft PCF shadows;
Fog #f4dfca fading into the sky gradient.
Camera: perspective, ~50° vertical FOV widened on narrow screens so all 8 bins stay in view.
Game view (0, 11.5, 19) → (0, 3.6, 0). Landing view (0, 13, 31) → (0, 4.5, −5) with a slow sway.
Post-processing: none. Tone mapping: Neutral.

Type: display Baloo 2 (titles, buttons, signs) · UI Nunito (body, bill titles) ·
numbers and small labels JetBrains Mono. Self-hosted woff2 in fonts/, SIL OFL.
Sizes in rem (follow the reader's browser setting): body 18px, card text 17px, labels 15px minimum.
Contrast: every text colour ≥ 4.5:1 (WCAG AA); secondary ink #4a4362 is 7.3:1 on the peach page.
Canvas text waits for document.fonts.load before painting.

Copy: headings are claims, not labels. Small labels lowercase and dot-separated.
Specific numbers, pulled from rules.js. No marketing adjectives.

Never: pure black · image or audio files · Google Fonts CDN · a title card covering the dome's centre ·
a page number typed by hand when rules.js has it · text under 15 px that carries information · white text on the 3D scene without a dark plate.
