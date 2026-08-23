# Kadrlardan "kontakt vərəqi" düzəldir: 9 kadr → 1 şəbəkə şəkli.
#
# Məqsəd: bütün kadrlara BAXMAQ, amma hər birini ayrıca açmadan.
# Hər xanaya vaxt damğası yazılır ki, transkriptlə uyğunlaşdırmaq mümkün olsun
# və lazım gələndə həmin kadrı ayrıca açıb yaxından baxa bilim.
#
# İstifadə: python scripts/make-contact-sheets.py [video-nömrəsi ...]
#           arqumentsiz → hamısı

import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(r"C:\Fuad\claude-execute-main\NASDAQ VIDEO")
COLS, ROWS = 3, 3
CELL_W, CELL_H = 682, 384
LABEL_H = 22
PER_SHEET = COLS * ROWS

wanted = set(sys.argv[1:])

def keyframes(d):
    kf = d / "keyframes.txt"
    out = []
    if kf.exists():
        for line in kf.read_text(encoding="utf-8").splitlines():
            if line.startswith("#") or not line.strip():
                continue
            p = line.split("\t")
            if len(p) >= 2:
                out.append((p[0], p[1]))
    return out

total = 0
for d in sorted(ROOT.iterdir()):
    if not d.is_dir():
        continue
    num = d.name.split("_")[0]
    if wanted and num not in wanted:
        continue
    frames = keyframes(d)
    if not frames:
        continue
    sheets_dir = d / "sheets"
    sheets_dir.mkdir(exist_ok=True)
    for old in sheets_dir.glob("*.jpg"):
        old.unlink()

    n_sheets = (len(frames) + PER_SHEET - 1) // PER_SHEET
    for s in range(n_sheets):
        chunk = frames[s * PER_SHEET:(s + 1) * PER_SHEET]
        sheet = Image.new("RGB", (COLS * CELL_W, ROWS * (CELL_H + LABEL_H)), (18, 18, 20))
        drw = ImageDraw.Draw(sheet)
        for i, (fname, tstamp) in enumerate(chunk):
            fp = d / "frames" / fname
            if not fp.exists():
                continue
            try:
                im = Image.open(fp).convert("RGB").resize((CELL_W, CELL_H), Image.LANCZOS)
            except Exception:
                continue
            cx = (i % COLS) * CELL_W
            cy = (i // COLS) * (CELL_H + LABEL_H)
            drw.text((cx + 6, cy + 4), f"{tstamp}  [{fname}]", fill=(255, 220, 120))
            sheet.paste(im, (cx, cy + LABEL_H))
        out = sheets_dir / f"sheet_{s+1:03d}.jpg"
        sheet.save(out, quality=82, optimize=True)
        total += 1
    print(f"{d.name[:55]:<56} {len(frames):>4} kadr -> {n_sheets:>3} vereq")

print(f"\nCEMI {total} kontakt vereqi.")
