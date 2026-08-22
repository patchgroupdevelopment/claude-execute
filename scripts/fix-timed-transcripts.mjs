// Artıq yaradılmış transcript_timed.txt fayllarındakı prefiks təkrarlarını təmizləyir.
// (ingest-bootcamp.mjs-in ilk versiyası bunu etmirdi — fayllar 3 dəfə şişik idi.)

import { readdir, readFile, writeFile, stat } from "fs/promises";
import path from "path";

const ROOT = "NASDAQ VIDEO";

function dedupe(content) {
  const lines = content.split(/\r?\n/);
  const head = [];
  const rows = [];
  for (const l of lines) {
    const m = l.match(/^\[(\d{2}:\d{2}:\d{2})\]\s(.*)$/);
    if (m) rows.push({ ts: m[1], txt: m[2] });
    else if (rows.length === 0) head.push(l);
  }
  // Sürüşən pəncərə: "A" → "A B" → "B" → "B C" → "C" ...
  // Hər sətirdən yalnız ƏVVƏLKİ ilə üst-üstə düşməyən YENİ hissəni götürürük.
  const out = [];
  let prev = "";
  for (const r of rows) {
    let overlap = 0;
    const max = Math.min(prev.length, r.txt.length);
    for (let k = max; k > 0; k--) {
      if (prev.endsWith(r.txt.slice(0, k))) { overlap = k; break; }
    }
    const fresh = r.txt.slice(overlap).trim();
    prev = r.txt;
    if (fresh) out.push(`[${r.ts}] ${fresh}`);
  }
  return head.join("\n") + "\n" + out.join("\n") + "\n";
}

const dirs = (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory());
let fixed = 0;
for (const d of dirs) {
  const p = path.join(ROOT, d.name, "transcript_timed.txt");
  try {
    const before = (await stat(p)).size;
    const cleaned = dedupe(await readFile(p, "utf8"));
    await writeFile(p, cleaned, "utf8");
    const after = (await stat(p)).size;
    console.log(`${d.name.slice(0, 45).padEnd(46)} ${(before / 1024).toFixed(0)}k → ${(after / 1024).toFixed(0)}k`);
    fixed++;
  } catch { /* fayl hələ yoxdur */ }
}
console.log(`\n${fixed} fayl təmizləndi.`);
