"""Cut the illustrated characters out of reference_design.png as alpha PNGs.

The reference is exactly 1586x992 — the same canvas the page is laid out on —
so each sprite is saved together with the position it occupies there, and the
page places it back at that exact spot. Run from the `frontend` directory:

    python3 scripts/extract-reference-assets.py
"""
import json
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

REF = "reference_design.png"
OUT = "public/food"

# Ink boxes located by connected-component analysis of the reference. `pad` is
# (left, top, right, bottom) and is what lets each sprite keep its own little
# yellow accent rays; `gap` is how far from the body a stray blob may sit and
# still be considered part of this character.
SUBJECTS = {
    "tomato":      ((129, 114, 191, 174), (46, 46, 46, 46), 34),
    "broccoli":    ((366, 179, 439, 250), (46, 46, 46, 46), 34),
    # note: the eggplant's accent strokes are purple, not yellow like the rest
    "eggplant":    ((137, 389, 196, 468), (46, 46, 46, 46), 34),
    "blueberries": ((150, 618, 197, 664), (46, 46, 46, 46), 34),
    "lemon":       ((202, 810, 270, 868), (46, 46, 46, 46), 34),
    "carrot":      ((1192, 97, 1259, 192), (46, 46, 46, 46), 34),
    "banana":      ((1402, 256, 1461, 321), (46, 46, 46, 46), 34),
    "apple":       ((1329, 407, 1392, 475), (46, 46, 46, 46), 34),
    "avocado":     ((1427, 630, 1483, 696), (46, 46, 46, 46), 34),
    "radish":      ((1227, 710, 1274, 785), (46, 46, 46, 46), 34),
    # the mascot needs a wider net for steam, spoon, glow and rays — but the
    # badge starts at y=260, so the bottom edge has to stop just short of it
    "pot":         ((697, 102, 888, 256), (60, 60, 60, 3), 40),
}

# Loose hand-drawn doodles scattered between the characters. Same pipeline,
# just a tighter pad so neighbours don't bleed into each other. The pale
# blob edges along the left margin are deliberately not in this list — they
# are background wash, and the page draws those with CSS.
DOODLES = {
    "leaf-a":     (1121, 22, 1154, 55),
    "squiggle":   (302, 45, 362, 78),
    "heart-a":    (572, 80, 595, 101),
    "leaf-b":     (1407, 161, 1422, 177),
    "heart-b":    (1054, 180, 1073, 201),
    "drop-a":     (216, 287, 235, 309),
    "leaf-c":     (1202, 308, 1235, 343),
    "heart-c":    (294, 439, 313, 456),
    "dot-a":      (1526, 528, 1544, 545),
    "heart-d":    (1178, 536, 1205, 562),
    "leaf-d":     (1048, 589, 1071, 620),
    "leaf-e":     (1332, 602, 1347, 616),
    "heart-e":    (353, 666, 377, 690),
    "leaf-f":     (150, 763, 164, 777),
    "drop-b":     (1447, 805, 1464, 826),
    "rays":       (1180, 835, 1210, 882),
    "swoosh":     (1361, 864, 1434, 901),
    # pale yellow ribbon running off the left edge
    "swoosh-left": (0, 488, 100, 581),
    "dot-b":      (339, 923, 357, 943),
    # the burst flanking the headline's second line; "today?" spans x 694-889,
    # so these boxes stay clear of the letterforms
    "burst-left":  (638, 395, 684, 470),
    "burst-right": (910, 395, 962, 470),
}

# The pot's glow is only a few levels away from the page cream, so it needs a
# gentler threshold than the saturated produce.
THRESH = {"pot": 9}
DEFAULT_THRESH = 14


def components(mask):
    """Connected components (8-neighbour) as (size, [pixels]) — no scipy here."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for sy, sx in zip(*np.nonzero(mask)):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)])
        seen[sy, sx] = True
        px = []
        while q:
            y, x = q.popleft()
            px.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        out.append((len(px), px))
    return out


def fill_holes(mask):
    """Flood the outside, then treat everything unreached as interior."""
    h, w = mask.shape
    outside = np.zeros_like(mask)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    return ~outside


def extract(img, box, pad, gap_limit, thresh, name):
    x0, y0, x1, y1 = box
    pl, pt, pr, pb = pad
    X0, Y0 = max(0, x0 - pl), max(0, y0 - pt)
    X1, Y1 = min(img.shape[1], x1 + pr), min(img.shape[0], y1 + pb)
    crop = img[Y0:Y1, X0:X1].astype(int)

    ring = np.concatenate([crop[:2].reshape(-1, 3), crop[-2:].reshape(-1, 3),
                           crop[:, :2].reshape(-1, 3), crop[:, -2:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    dist = np.abs(crop - bg).max(axis=2)

    mask = dist > thresh
    comps = components(mask)
    if not comps:
        raise SystemExit(f"{name}: nothing found above threshold")
    comps.sort(key=lambda c: -c[0])
    main = comps[0][1]
    ys = [p[0] for p in main]; xs = [p[1] for p in main]
    my0, my1, mx0, mx1 = min(ys), max(ys), min(xs), max(xs)

    keep = np.zeros_like(mask)
    for size, px in comps:
        if size < 25:
            continue          # speckle
        cy = [p[0] for p in px]; cx = [p[1] for p in px]
        # keep the body plus anything hugging it (the accent rays); drop the
        # unrelated doodles that wandered into the padded box
        gap = max(my0 - max(cy), min(cy) - my1, mx0 - max(cx), min(cx) - mx1, 0)
        if size == comps[0][0] or gap <= gap_limit:
            for y, x in px:
                keep[y, x] = True

    keep = fill_holes(keep)
    ys, xs = np.nonzero(keep)
    ty0, ty1, tx0, tx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1

    rgb = crop[ty0:ty1, tx0:tx1].astype(np.uint8)
    alpha = Image.fromarray((keep[ty0:ty1, tx0:tx1] * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))   # antialias the cut

    out = Image.fromarray(rgb).convert("RGBA")
    out.putalpha(alpha)
    # 3x for retina; the page renders it back at the reference's own size
    out = out.resize((out.width * 3, out.height * 3), Image.LANCZOS)
    out.save(f"{OUT}/{name}.png")
    return {"x": int(X0 + tx0), "y": int(Y0 + ty0),
            "w": int(tx1 - tx0), "h": int(ty1 - ty0)}


# Boxes of everything drawn *on top of* the background wash, so the wash can be
# sampled from what is left.
# Generous on purpose: soft shadows and antialiased edges reach well past the
# elements themselves, and a leaked card shadow shows up as a grey rectangle.
UI_BOXES = [
    (620, 40, 970, 290),    # mascot + glow
    (650, 245, 940, 330),   # badge
    (500, 320, 1090, 490),  # headline + bursts
    (395, 490, 935, 640),   # greeting row
    (380, 700, 1200, 960),  # composer card + its shadow
]


def background_wash(img, manifest, cell=25, out_w=64, out_h=40):
    """Sample the page's soft corner wash, ignoring every drawn element.

    The wash is very low frequency, so a ~64x40 sample reproduces it exactly
    once the browser scales it back up — and costs a couple of kilobytes.
    """
    h, w, _ = img.shape
    blocked = np.zeros((h, w), bool)
    for box in UI_BOXES:
        x0, y0, x1, y1 = box
        blocked[max(0, y0):y1, max(0, x0):x1] = True
    for v in manifest.values():
        blocked[max(0, v["y"] - 6):v["y"] + v["h"] + 6,
                max(0, v["x"] - 6):v["x"] + v["w"] + 6] = True

    acc = np.zeros((out_h, out_w, 3))
    cnt = np.zeros((out_h, out_w))
    ys = np.linspace(0, h, out_h + 1).astype(int)
    xs = np.linspace(0, w, out_w + 1).astype(int)
    for j in range(out_h):
        for i in range(out_w):
            sub = img[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
            ok = ~blocked[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
            if ok.sum() > 12:
                acc[j, i] = sub[ok].mean(axis=0)
                cnt[j, i] = 1

    # diffuse into the cells that were entirely covered
    for _ in range(400):
        holes = cnt == 0
        if not holes.any():
            break
        pad_a = np.pad(acc, ((1, 1), (1, 1), (0, 0)), mode="edge")
        pad_c = np.pad(cnt, ((1, 1), (1, 1)), mode="edge")
        num = sum(pad_a[1 + dy:1 + dy + out_h, 1 + dx:1 + dx + out_w] *
                  pad_c[1 + dy:1 + dy + out_h, 1 + dx:1 + dx + out_w][..., None]
                  for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        den = sum(pad_c[1 + dy:1 + dy + out_h, 1 + dx:1 + dx + out_w]
                  for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        fill = holes & (den > 0)
        acc[fill] = (num[fill] / den[fill][..., None])
        cnt[fill] = 1

    Image.fromarray(acc.round().astype(np.uint8)).save(f"{OUT}/background.png")


CHAR_ORDER = ["tomato", "broccoli", "eggplant", "blueberries", "lemon",
              "carrot", "banana", "apple", "avocado", "radish"]
DELAYS = {"tomato": 0, "broccoli": 0.5, "eggplant": 1.1, "blueberries": 1.6,
          "lemon": 0.3, "carrot": 0.8, "banana": 1.4, "apple": 0.2,
          "avocado": 1.9, "radish": 1.0}


def write_sprites_ts(manifest):
    doodles = sorted(k for k in manifest
                     if k not in CHAR_ORDER and k not in ("pot", "burst-left", "burst-right"))
    out = [
        "// GENERATED by scripts/extract-reference-assets.py — do not edit by hand.",
        "// Every sprite is cut straight out of reference_design.png, and `x`/`y` are",
        "// its position on that 1586x992 canvas, so the page can put it back exactly.",
        "",
        "export type Sprite = { name: string; x: number; y: number; w: number; h: number; delay: number };",
        "",
        "export const SCATTERED: Sprite[] = [",
    ]
    for i, k in enumerate(CHAR_ORDER + doodles):
        v = manifest[k]
        delay = DELAYS.get(k, round((i * 0.37) % 2.2, 2))
        out.append(f'  {{ name: "{k}", x: {v["x"]}, y: {v["y"]}, '
                   f'w: {v["w"]}, h: {v["h"]}, delay: {delay} }},')
    out += ["];", ""]
    for key, var in (("pot", "POT"), ("burst-left", "BURST_LEFT"), ("burst-right", "BURST_RIGHT")):
        v = manifest[key]
        out.append(f'export const {var} = {{ name: "{key}", x: {v["x"]}, y: {v["y"]}, '
                   f'w: {v["w"]}, h: {v["h"]} }};')
    with open("app/sprites.ts", "w") as f:
        f.write("\n".join(out) + "\n")


def main():
    img = np.array(Image.open(REF).convert("RGB"))
    manifest = {}
    for name, (box, pad, gap_limit) in SUBJECTS.items():
        manifest[name] = extract(img, box, pad, gap_limit,
                                 THRESH.get(name, DEFAULT_THRESH), name)
        print(f"{name:<12} {manifest[name]}")
    for name, box in DOODLES.items():
        # the bursts are three separate strokes with real air between them
        gap = 45 if name.startswith("burst") else 22
        manifest[name] = extract(img, box, (8, 8, 8, 8), gap, DEFAULT_THRESH, name)
        print(f"{name:<12} {manifest[name]}")
    background_wash(img, manifest)
    print("background     public/food/background.png")
    with open(f"{OUT}/manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    write_sprites_ts(manifest)
    print("sprites       app/sprites.ts")


if __name__ == "__main__":
    main()
