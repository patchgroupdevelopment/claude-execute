# Tək VTT faylını təmiz + vaxt damğalı transkriptə çevirir.
# İstifadə: python scripts/vtt-to-transcript.py <vtt> <qovluq> "<başlıq>" <video-id> <dil>

import sys, re
from pathlib import Path

vtt_path, out_dir, title, vid, lang = sys.argv[1:6]
raw = Path(vtt_path).read_text(encoding="utf-8", errors="ignore")

rows = []
last = ""
for block in re.split(r"\r?\n\r?\n", raw):
    lines = block.split("\n")
    tl = next((l for l in lines if "-->" in l), None)
    if not tl:
        continue
    start = tl.split("-->")[0].strip().split(".")[0]
    txt = " ".join(
        re.sub(r"<[^>]+>", "", l).strip()
        for l in lines
        if l and "-->" not in l and not re.match(r"^(WEBVTT|Kind:|Language:|NOTE)", l)
    ).strip()
    if txt and txt != last:
        rows.append((start, txt))
        last = txt

# Sürüşən pəncərə: yalnız YENİ hissəni saxla
timed, plain = [], []
prev = ""
for ts, txt in rows:
    ov = 0
    for k in range(min(len(prev), len(txt)), 0, -1):
        if prev.endswith(txt[:k]):
            ov = k
            break
    fresh = txt[ov:].strip()
    prev = txt
    if fresh:
        timed.append(f"[{ts}] {fresh}")
        plain.append(fresh)

d = Path(out_dir)
hdr = f"# {title}\n# https://youtu.be/{vid}\n# dil: {lang}\n\n"
(d / "transcript.txt").write_text(hdr + " ".join(plain) + "\n", encoding="utf-8")
(d / "transcript_timed.txt").write_text(
    f"# {title} — vaxt damgali\n\n" + "\n".join(timed) + "\n", encoding="utf-8"
)
print(f"OK: {len(timed)} setir")
