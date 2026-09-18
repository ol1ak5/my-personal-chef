# Personal Chef — project status (read this first)

A personal cooking-assistant chat app. User describes leftover ingredients (text or a photo), a LangChain/Gemini agent searches the web and suggests recipes. Olya is building this herself and using Claude as a guide/pair — she prefers to drive, and to be told what to do rather than have it done silently, **except for the frontend design work**, where she's asked me to edit the files directly.

## Architecture
- `backend/` — Python, FastAPI (`api.py`) wrapping a LangChain `create_agent` (`agent.py`) using Google Gemini (`google_genai:gemini-3.6-flash`) + a Tavily web-search tool. Run with `cd backend && uv run uvicorn api:app --reload --port 8000`.
- `frontend/` — Next.js (App Router) + Tailwind v4. `frontend/app/page.tsx` is the whole UI, `frontend/app/globals.css` holds the design tokens, `frontend/app/sprites.ts` is generated (see below). Run with `cd frontend && npm run dev` (port 3000).
- No persistent memory yet — `InMemorySaver` in `agent.py`, lost on backend restart. Not deployed yet (still localhost only).

## The design is built from the reference image, measured — not eyeballed

`frontend/reference_design.png` is the target, made for Olya by ChatGPT. It is exactly **1586×992**, which is also the canvas the page's layout is written against: open the app at that viewport and the two line up. Read the image with the Read tool before touching anything visual.

**Do not re-tune the design by eye.** Everything below was derived by measuring the reference with PIL (connected-component analysis for ink boxes, colour sampling, canvas text metrics) and comparing against `getBoundingClientRect` in the live page. If something looks off, measure both sides again rather than nudging values.

Two techniques worth reusing:
- **Diff overlay.** Copy the reference into `public/`, then inject it over the running page as a fixed 1586×992 `<img>` with `mix-blend-mode: difference`. Black means a match; anything glowing is misaligned. This is what caught the 3px burst offset and the swapped corner blobs. Delete the copy from `public/` afterwards.
- **Measure ink, not containers.** An early wrong conclusion ("the food is 30–50% too big") came from comparing the reference's ink bounding box against our padded `<svg>` box. Use `getBBox` on the drawn children.

### Illustrations are sprites cut from the reference — not hand-coded SVG

A long earlier attempt to hand-code the food characters as inline SVG never got past "flat vector" and was abandoned. They are now **cut directly out of `reference_design.png`** with alpha, by `frontend/scripts/extract-reference-assets.py`:

```bash
cd frontend && python3 scripts/extract-reference-assets.py
```

It writes 32 sprites plus `background.png` into `frontend/public/food/`, `manifest.json` next to them, and generates `frontend/app/sprites.ts` with each sprite's position on the reference canvas. The page puts every sprite back at exactly that spot. **The script re-cuts from the reference and overwrites everything in `public/food/`** — so if the PNGs have been replaced with higher-resolution redraws, do not run it.

The soft corner wash is also sampled from the reference (every drawn element masked out, averaged into a 64×40 image the browser stretches back up) rather than drawn with CSS blobs, which never matched.

Known limitation: the sprites are cut at 1× and upscaled 3× with Lanczos, so they carry no real detail beyond their display size and look soft on a retina screen. Fixing that means handing the cut-outs to an image model for a high-resolution redraw (image-to-image, so the style carries over) and dropping the results in under the same filenames and aspect ratios. Olya is doing this.

### Typography and scaling
- One family everywhere: **Fredoka**. Chosen by measurement, not taste — at cap-height 42px it renders "What can we make" at 513px against the reference's 516px; Quicksand, Baloo 2 and Nunito were all 6–12% too wide.
- `--u` and `--uc` in `globals.css` are "reference pixels": they resolve to exactly 1px at 1586×992 and shrink below that, so the hero scales as one piece instead of overflowing. Hero sizes are written `calc(N * var(--u))` where N is the number measured off the reference; the composer uses `--uc`, which has a higher floor because it is the part people type into. **Do not reintroduce raw px into the hero** — that is exactly what made the composer collide with the greeting on a 1457×827 screen.

### Still rough by design
- **The conversation screen** was never in the reference and is my own extension: the header is invented, and chat bubbles use a fixed 16.8px instead of scaling with `--u`, so text visibly shrinks after the first message.
- **Narrow viewports** (below ~900px) and mobile are not designed — the column just shrinks and the sprites crowd the centre.

## Known operational gotchas
- **Gemini free tier is a daily token budget, and heavy iteration exhausts it.** Symptom: the chat UI shows "Couldn't reach the chef. Is the backend running?" while the backend log has `RESOURCE_EXHAUSTED` / `GoogleRateLimitError` and HTTP 500. Not a code bug — check the backend log before assuming the app is broken. Resets ~24h later.
- **Gemini image generation is not on the free tier at all.** `gemini-3.1-flash-image` returns 429 with `generate_content_free_tier_requests, limit: 0` — that is "not included", not "used up". It needs billing enabled on the Google Cloud project.
- Google renames/retires Gemini model IDs periodically — on a 404 "model not found", check AI Studio for the current name and update `model=` in `backend/agent.py`.
- CORS: `backend/api.py` allows `http://localhost:3000` — required for the frontend fetch to work at all; don't remove it.

## Roadmap still open
- **Step 11a: persistent memory** — done. `SqliteSaver` in `agent.py`, thread id kept in `localStorage` on the frontend.
- **Step 11b: show the history** — the transcript still lives only in React state, so a reload shows an empty screen even though the backend remembers. Needs a `GET /history/{thread_id}` endpoint and a load on mount. Next up.
- **Step 11c: let the user start over** — a "new conversation" control. `SqliteSaver.delete_thread(thread_id)` exists if the old thread should actually be erased rather than abandoned.
- **Step 12: deployment** — deliberately deferred until the design is finished.
- Push the project to GitHub. `backend/.env` holds `GOOGLE_API_KEY` and `TAVILY_API_KEY` and is covered by `backend/.gitignore`; verify that still holds before any push.
