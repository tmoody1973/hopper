# 006 — Explain bills with official CRS summaries, not AI rewrites

**Decision** — The "what it would do" line on every card, and in the Docket, is the first sentence of the bill's official summary from the Congressional Research Service (CRS, Congress's in-house research office). It's lightly reworded ("This bill expands…" becomes "Expands…"). There's no AI-generated text. Bills without a summary use their official long title, and bills with neither are dropped from the deck.

**Why this came up** — Players needed to learn what the bills they sorted actually do, in plain English. Some titles ("GEO Act", "FairTax Act") say nothing about the content. The tempting move was to have an AI write a friendly summary of every bill.

**Options**
- **Official CRS text, trimmed.** Accurate, free, and written by experts whose job is neutral description. In a sample of the real deck, 103 of 120 bills (85%) had one, including all 28 with short or acronym titles. Cost: some summaries are long or dry, and new bills may not have one yet.
- **AI rewrite of the CRS text.** Shorter and friendlier. Cost: an API key, a review step, and a real risk of an AI misstating what a law does. That's a serious failure for a civic product.
- **AI written from the title alone,** for bills without a summary. Cost: the AI would be guessing what a law does. Ruled out.

**What we chose and why** — Official CRS text (Tarik's call, from options Claude drafted). The non-AI version already covered 85% of bills in plain enough language. The 15% gap is exactly where AI would have nothing true to work from.

**What we gave up** — Some summaries read more formally than a game would like, and the long ones get cut off with "…" on the falling card.

**How we'll know if this was right** — Playtesters can say what a bill they sorted would do, after reading its card. If they consistently skip the line because it's too dense, that's the evidence to try an AI rewrite of the CRS text, labelled as AI and checked against the original.

**What actually happened** —
