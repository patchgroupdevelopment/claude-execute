# Kadrları məzmuna görə qruplaşdırır: ardıcıl EYNİ görünən kadrları bir yerə yığır.
#
# Məqsəd: 8 saniyəlik aralıqla çəkilmiş kadrların böyük hissəsi eynidir
# (danışan adam, qrafik dəyişmir). Ekranın HƏQİQƏTƏN dəyişdiyi anları
# ayırırıq ki, məlumat itmədən hamısına baxmaq mümkün olsun.
#
# Metod: hər kadr 32x32 boz şəklə salınır, orta-hash (aHash) çıxarılır,
# ardıcıl kadrlar arasındakı Hamming məsafəsi hesablanır. Məsafə həddən
# aşağıdırsa → eyni səhnə sayılır və atlanır.
#
# Çıxış: hər video qovluğunda keyframes.txt — baxılmalı kadrların siyahısı
#        (fayl adı + vaxt + əvvəlkindən nə qədər fərqli).

import sys
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(r"C:\Fuad\claude-execute-main\NASDAQ VIDEO")
THRESHOLD = int(sys.argv[1]) if len(sys.argv) > 1 else 6  # Hamming həddi

def ahash(path):
    img = Image.open(path).convert("L").resize((32, 32), Image.BILINEAR)
    a = np.asarray(img, dtype=np.float32)
    return a > a.mean()

def hamming(a, b):
    return int(np.count_nonzero(a != b))

total_in = 0
total_out = 0
rows = []

for d in sorted(ROOT.iterdir()):
    if not d.is_dir():
        continue
    fdir = d / "frames"
    if not fdir.exists():
        continue
    frames = sorted(fdir.glob("f_*.jpg"))
    if not frames:
        continue

    # kadr → vaxt cədvəli
    times = {}
    tl = d / "frames_timeline.txt"
    if tl.exists():
        for line in tl.read_text(encoding="utf-8").splitlines():
            parts = line.split("\t")
            if len(parts) == 2:
                times[parts[0]] = parts[1]

    keep = []
    prev = None
    for f in frames:
        try:
            h = ahash(f)
        except Exception:
            continue
        if prev is None:
            dist = 999
        else:
            dist = hamming(prev, h)
        if dist >= THRESHOLD:
            keep.append((f.name, times.get(f.name, "?"), dist))
            prev = h
    total_in += len(frames)
    total_out += len(keep)

    out = ["# " + d.name, f"# {len(frames)} kadrdan {len(keep)} fərqli səhnə", ""]
    out += [f"{n}\t{t}\tfərq={dd}" for n, t, dd in keep]
    (d / "keyframes.txt").write_text("\n".join(out) + "\n", encoding="utf-8")
    rows.append((d.name, len(frames), len(keep)))

print(f"{'VIDEO':<58} {'KADR':>6} {'FƏRQLİ':>7}")
for n, a, b in rows:
    print(f"{n[:57]:<58} {a:>6} {b:>7}")
print(f"\nCƏMİ: {total_in} kadr → {total_out} fərqli səhnə ({100*total_out/max(total_in,1):.0f}%)")
