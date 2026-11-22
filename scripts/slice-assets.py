"""Export draft WebP crops from the original Aetheris screenshots.

Usage: python scripts/slice-assets.py --output public/assets/reference-crops
Requires Pillow. Outputs retain the painted backgrounds of the input crops.
"""
from argparse import ArgumentParser
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "reference"

# Coordinates in the 1055 x 1491 compendium. Rows end above their nameplates.
COLUMNS = ((290, 474), (474, 646), (646, 822), (822, 1030))
ROWS = (
    (193, 296, "Nature", "florix mossling rocleaf petalyn"),
    (325, 417, "Fire", "pyrowl embera volflare cindram"),
    (447, 539, "Water", "bubblit shellora tidera aquaphin"),
    (566, 661, "Wind", "zephowl voltine galeon skyray"),
    (690, 779, "Earth", "terrabram geomole thornox bedrock"),
    (810, 895, "Light", "lumera solumi aurelyn dawnveil"),
    (926, 1008, "Shadow", "noctiri umbrel vexshade mistail"),
    (1036, 1118, "Crystal", "crysthorn glacelle prismara shardrake"),
    (1149, 1236, "Sky", "aerion cloudpom cirravel nimbus"),
)

def crop(source, box, destination, coordinates=(1672, 941)):
    width, height = coordinates
    left, top, right, bottom = box
    scaled = (
        round(left * source.width / width),
        round(top * source.height / height),
        round(right * source.width / width),
        round(bottom * source.height / height),
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    result = source.crop(scaled)
    result.save(destination, "WEBP", quality=88, method=6)
    if destination.stat().st_size > 400_000:
        result.save(destination, "WEBP", quality=76, method=6)


def extract(output):
    with Image.open(REFERENCE / "04-compendium.png") as poster:
        for top, bottom, kind, species in ROWS:
            for (left, right), name in zip(COLUMNS, species.split()):
                crop(poster, (left, top, right, bottom),
                     output / "creatures" / f"{name}.webp", (1055, 1491))
            icon = {"Nature": 234, "Fire": 353, "Water": 466, "Wind": 588,
                    "Earth": 708, "Light": 827, "Shadow": 941,
                    "Crystal": 1053, "Sky": 1166}[kind]
            crop(poster, (53, icon, 90, icon + 36),
                 output / "types" / f"{kind.lower()}.webp", (1055, 1491))

    with Image.open(REFERENCE / "01-title.png") as title:
        crop(title, (687, 0, 1483, 268), output / "logo-aetheris.webp")
        for name, box in {
            "new": (1065, 309, 1140, 374),
            "continue": (1123, 409, 1180, 458),
            "dex": (1123, 489, 1181, 545),
            "map": (1122, 575, 1185, 632),
            "settings": (1127, 662, 1183, 718),
        }.items():
            crop(title, box, output / "menu" / f"{name}.webp")

    with Image.open(REFERENCE / "05-hud.png") as hud:
        for name, box in {
            "notifications": (1276, 18, 1320, 58),
            "message": (1332, 17, 1385, 59),
            "bag": (1396, 15, 1447, 60),
            "interact": (1485, 745, 1560, 800),
            "sprint": (1589, 817, 1633, 859),
            "binoculars": (1380, 816, 1433, 864),
            "target": (1580, 655, 1629, 703),
            "ability": (1394, 713, 1445, 760),
        }.items():
            crop(hud, box, output / "hud" / f"{name}.webp")

    for filename, label, box in (
        ("01-title.png", "title-fragment", (0, 290, 991, 941)),
        ("02-dex.png", "dex-fragment", (585, 540, 1015, 649)),
        ("03-worldmap.png", "map-fragment", (185, 701, 446, 769)),
        ("05-hud.png", "valley-fragment", (1103, 478, 1480, 617)),
    ):
        with Image.open(REFERENCE / filename) as image:
            crop(image, box, output / "backgrounds" / f"{label}.webp")


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    extract(parser.parse_args().output)
