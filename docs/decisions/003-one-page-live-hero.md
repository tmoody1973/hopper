# 003 — One page: the live game scene is the poster

**Decision** — index.html is both the home page and the game. The first screen shows the real 3D scene idling behind the title and PLAY; pressing PLAY turns that same scene into the full-screen game. The explainer sections sit below the fold.

**Why this came up** — Tarik asked for a page like skyhold.lol, which opens on a poster image and a gameplay video. This project makes nothing from image or video files, and the original brief requires index.html to be the game's entry point.

**Options**
- **One page, live scene as poster.** No image or video files needed, the poster is always current, and PLAY needs no page load. Cost: index.html carries two modes (page and game), which means more states to test.
- **Separate pages** (index.html as the page, play.html as the game). Simpler to reason about. Cost: breaks the "entry point index.html" rule and adds a page load between PLAY and playing.
- **Poster image + video, like Skyhold.** Prettiest first frame. Cost: needs a capture pipeline (a script that records the game) and media files to keep up to date.

**What we chose and why** — One page (Claude's call). It keeps every original rule and puts PLAY one tap away, which matters most for the first minute.

**What we gave up** — There's no share image (og:image) or demo video yet, because both need a recorded capture of the game. Link previews will show text only.

**How we'll know if this was right** — On a phone, PLAY is visible without scrolling and a round starts in one tap. Later, compare how many visitors press PLAY against how many scroll down first.

**What actually happened** —
