from pathlib import Path
import sys

sys.path.insert(0, "/private/tmp/cr8-pillow")

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path("/Users/stephenbauer/Desktop")
OUT = ROOT / "assets" / "empire-rides"
FRAMES = OUT / "360"
CUTOUTS = OUT / "cutouts"

SOURCES = [
    "Screenshot 2026-06-04 at 10.09.57 PM.png",
    "Screenshot 2026-06-04 at 10.09.58 PM.png",
    "Screenshot 2026-06-04 at 10.10.00 PM.png",
    "Screenshot 2026-06-04 at 10.10.01 PM.png",
    "Screenshot 2026-06-04 at 10.10.02 PM.png",
    "Screenshot 2026-06-04 at 10.10.03 PM.png",
    "Screenshot 2026-06-04 at 10.10.04 PM.png",
]

# Crops the clean vehicle viewer panel out of the full browser screenshots.
VIEWER_CROP = (595, 383, 2350, 1550)


def largest_component_bbox(mask):
    width, height = mask.size
    pix = mask.load()
    seen = bytearray(width * height)
    best = None
    best_count = 0

    for y in range(0, height, 2):
        row = y * width
        for x in range(0, width, 2):
            idx = row + x
            if seen[idx] or pix[x, y] == 0:
                continue

            stack = [(x, y)]
            seen[idx] = 1
            count = 0
            min_x = max_x = x
            min_y = max_y = y

            while stack:
                cx, cy = stack.pop()
                count += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 2, cy), (cx - 2, cy), (cx, cy + 2), (cx, cy - 2)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if not seen[nidx] and pix[nx, ny]:
                        seen[nidx] = 1
                        stack.append((nx, ny))

            if count > best_count:
                best_count = count
                best = (min_x, min_y, max_x, max_y)

    return best


def make_mask(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    mask = Image.new("L", rgb.size, 0)
    src = rgb.load()
    dst = mask.load()

    # Ignore the high white wall and low studio floor edges; the car lives in this band.
    for y in range(250, min(height, 800)):
        for x in range(240, width - 220):
            r, g, b = src[x, y]
            brightness = (r + g + b) / 3
            spread = max(r, g, b) - min(r, g, b)
            if brightness < 150 or (brightness < 215 and spread > 36):
                dst[x, y] = 255

    mask = mask.filter(ImageFilter.MaxFilter(27))
    mask = mask.filter(ImageFilter.MinFilter(15))
    mask = mask.filter(ImageFilter.GaussianBlur(0.9))
    return mask


def save_assets():
    FRAMES.mkdir(parents=True, exist_ok=True)
    CUTOUTS.mkdir(parents=True, exist_ok=True)

    for index, filename in enumerate(SOURCES, start=1):
        source = DESKTOP / filename
        image = Image.open(source).convert("RGB")
        frame = image.crop(VIEWER_CROP)

        frame_path = FRAMES / f"expedition-{index:02d}.jpg"
        frame.save(frame_path, quality=88, optimize=True)

        mask = make_mask(frame)
        bbox = largest_component_bbox(mask)
        if not bbox:
            continue

        left, top, right, bottom = bbox
        pad = 34
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(frame.width, right + pad)
        bottom = min(frame.height, bottom + pad)

        cut_rgb = frame.crop((left, top, right, bottom)).convert("RGBA")
        cut_mask = mask.crop((left, top, right, bottom))
        cut_mask = cut_mask.point(lambda value: 255 if value > 44 else 0)
        cut_mask = cut_mask.filter(ImageFilter.GaussianBlur(0.45))
        cut_rgb.putalpha(cut_mask)

        cutout_path = CUTOUTS / f"expedition-cutout-{index:02d}.png"
        cut_rgb.save(cutout_path, optimize=True)


if __name__ == "__main__":
    save_assets()
