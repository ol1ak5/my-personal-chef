"""Put a redrawn sprite into public/food/ and resize its box to match.

The redraws come back from an image model in two shapes: with a real alpha
channel, or as RGB with the transparency checkerboard painted into the picture.
This handles both, then sizes the sprite's box so the character itself renders
at the size it had before.

    python3 scripts/install-redraw.py <name> <file>

Why size by the character rather than the file: the old sprites were cut from
the reference with their yellow motion lines included, scattered well away from
the vegetable. A redraw that drops those lines, or places them differently,
fills its box differently -- so matching the files' outer dimensions silently
rescales the character. The body is found as the largest connected region and
kept at its previous height and centre.
"""
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

FOOD = Path(__file__).parent.parent / "public" / "food"
SPRITES = Path(__file__).parent.parent / "app" / "sprites.ts"


def strip_checkerboard(rgb: np.ndarray) -> np.ndarray:
    """Alpha for an image whose transparency was painted as a grey checkerboard.

    The checker is neutral and light, so it cannot be told from a pale highlight
    by colour alone. What separates them is reachability: real background touches
    the border. Regions that do not are kept unless they also show the checker's
    signature -- perfectly neutral, and split between two distinct grey levels,
    where paint is smooth and slightly tinted.
    """
    sat = rgb.max(-1) - rgb.min(-1)
    bright = rgb.mean(-1)
    checkerish = (sat < 18) & (bright > 215)

    labels, count = ndimage.label(checkerish)
    touching = {*labels[0], *labels[-1], *labels[:, 0], *labels[:, -1]} - {0}
    background = np.isin(labels, list(touching))

    for i in range(1, count + 1):
        if i in touching:
            continue
        region = labels == i
        if region.sum() < 200:
            continue
        two_tone = (bright[region] > 245).mean() > 0.25 and (bright[region] < 240).mean() > 0.25
        if sat[region].mean() < 8 and two_tone:
            background |= region

    alpha = (~ndimage.binary_closing(background, np.ones((3, 3)))).astype(float)

    # A checker cell can survive the two-tone test when the region it sits in is
    # small enough to hold only one shade. What gives it away afterwards is that
    # it is an island of pure grey: every real part of these drawings is
    # coloured, and the highlights that are nearly white stay attached to the
    # character rather than floating free.
    islands, count = ndimage.label(alpha > 0.5)
    total = (alpha > 0.5).sum()
    for i in range(1, count + 1):
        island = islands == i
        if island.sum() > total * 0.02:
            continue
        if sat[island].mean() < 15 and bright[island].mean() > 225:
            alpha[island] = 0

    return np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))) / 255.0


def unblend_edge(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Recover edge colour from pixels the checkerboard was blended into.

    Without this the antialiased rim keeps a grey cast and reads as a halo
    against the page's cream background.
    """
    out = rgb.copy()
    rim = (alpha > 0.02) & (alpha < 0.98)
    grey = np.where(rgb[rim].mean(-1, keepdims=True) > 242, 254, 232)
    out[rim] = np.clip((rgb[rim] - (1 - alpha[rim, None]) * grey) / np.maximum(alpha[rim, None], 1e-3), 0, 255)
    return out


def body_box(image: Image.Image) -> tuple[int, int, float, float]:
    """Size and centre of the character itself, ignoring detached motion lines."""
    mask = np.array(image)[..., 3] > 40
    labels, count = ndimage.label(mask)
    largest = int(np.argmax(ndimage.sum(mask, labels, range(1, count + 1)))) + 1
    ys, xs = np.where(labels == largest)
    w, h = image.size
    return (
        xs.max() - xs.min() + 1,
        ys.max() - ys.min() + 1,
        (xs.min() + xs.max()) / 2 / w,
        (ys.min() + ys.max()) / 2 / h,
    )


def main(name: str, source: str) -> None:
    src = Image.open(source)
    if (np.array(src.convert("RGBA"))[..., 3] < 10).mean() > 0.05:
        image = src.convert("RGBA")
        how = "real alpha channel"
    else:
        rgb = np.array(src.convert("RGB")).astype(float)
        alpha = strip_checkerboard(rgb)
        image = Image.fromarray(np.dstack([unblend_edge(rgb, alpha), alpha * 255]).astype(np.uint8), "RGBA")
        how = "checkerboard keyed out"

    ys, xs = np.where(np.array(image)[..., 3] > 10)
    pad = 10
    image = image.crop((
        max(xs.min() - pad, 0), max(ys.min() - pad, 0),
        min(xs.max() + pad, image.size[0]), min(ys.max() + pad, image.size[1]),
    ))

    target = FOOD / f"{name}.png"
    old_w, old_h, old_cx, old_cy = body_box(Image.open(target).convert("RGBA"))
    old_file = Image.open(target).size
    image.save(target, optimize=True)

    source_text = SPRITES.read_text()
    match = re.search(rf'name: "{name}", x: (\d+), y: (\d+), w: (\d+), h: (\d+)', source_text)
    x, y, w, h = map(int, match.groups())

    # what the old body rendered at, and where its centre sat, in reference units
    body_h = old_h / old_file[1] * h
    centre_x, centre_y = x + old_cx * w, y + old_cy * h

    new_w, new_h, new_cx, new_cy = body_box(image)
    scale = body_h / new_h                       # reference units per pixel of the redraw
    box_h = round(image.size[1] * scale)
    box_w = round(image.size[0] * scale)
    box_x = round(centre_x - new_cx * box_w)
    box_y = round(centre_y - new_cy * box_h)

    SPRITES.write_text(source_text.replace(
        match.group(0), f'name: "{name}", x: {box_x}, y: {box_y}, w: {box_w}, h: {box_h}'
    ))

    print(f"{name}: {how}, {image.size[0]}x{image.size[1]}")
    print(f"  box {w}x{h} @({x},{y}) -> {box_w}x{box_h} @({box_x},{box_y})")
    print(f"  body height held at {body_h:.0f} units")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
