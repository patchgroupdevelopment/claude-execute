// Bootcamp playlistini "izlənə bilən" formata çevirir.
//
// Hər video üçün:
//   NASDAQ VIDEO/<NN>_<qısa-ad>/
//     ├── frames/f_00001.jpg ...   (hər N saniyədən bir kadr, 1280px)
//     ├── frames_timeline.txt      (kadr → dəqiqə:saniyə cədvəli)
//     ├── audio.mp3                (dərsin səsi)
//     └── transcript.txt           (YouTube avtomatik altyazısı, təmizlənmiş)
//
// Video faylı kadrlar çıxarıldıqdan sonra silinir (yer tutmasın).
//
// İstifadə:
//   node scripts/ingest-bootcamp.mjs [başlanğıc] [son] [kadr-aralığı-san]
//   məs: node scripts/ingest-bootcamp.mjs 2 10 8

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile, readdir, rm, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const exec = promisify(execFile);

const PLAYLIST = "https://www.youtube.com/playlist?list=PLI6WlRvF6Pu94jhpa-FhA40tLaIIRrUgC";
const ROOT = "NASDAQ VIDEO";
const FROM = parseInt(process.argv[2] || "2", 10);
const TO = parseInt(process.argv[3] || "45", 10);
const STEP = parseInt(process.argv[4] || "8", 10); // saniyə

function slug(s) {
  return s
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 55);
}

function cleanVtt(vtt) {
  const lines = [];
  let last = "";
  for (const raw of vtt.split(/\r?\n/)) {
    if (!raw || raw.includes("-->")) continue;
    if (/^(WEBVTT|Kind:|Language:|NOTE)/.test(raw)) continue;
    const c = raw.replace(/<[^>]+>/g, "").trim();
    if (c && c !== last) { lines.push(c); last = c; }
  }
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (i + 1 < lines.length && lines[i + 1].startsWith(lines[i])) continue;
    out.push(lines[i]);
  }
  return out.join(" ");
}

// Altyazını vaxt damğaları ilə saxlayır — kadrlarla uyğunlaşdırmaq üçün.
// YouTube avtomatik altyazısında hər sətir "böyüyərək" 2-3 dəfə təkrarlanır
// (sürüşən pəncərə). Prefiks təkrarlarını atırıq — yoxsa fayl 3 dəfə şişir.
function timedVtt(vtt) {
  const blocks = vtt.split(/\r?\n\r?\n/);
  const raw = [];
  let last = "";
  for (const b of blocks) {
    const ls = b.split(/\r?\n/);
    const tl = ls.find((l) => l.includes("-->"));
    if (!tl) continue;
    const start = tl.split("-->")[0].trim().split(".")[0];
    const txt = ls.filter((l) => l && !l.includes("-->") && !/^(WEBVTT|Kind:|Language:)/.test(l))
      .map((l) => l.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ");
    if (txt && txt !== last) { raw.push({ start, txt }); last = txt; }
  }
  // Növbəti sətir bu sətirlə başlayırsa, bu sətir onun yarımçıq halıdır — at.
  const rows = [];
  for (let i = 0; i < raw.length; i++) {
    if (i + 1 < raw.length && raw[i + 1].txt.startsWith(raw[i].txt)) continue;
    rows.push(`[${raw[i].start}] ${raw[i].txt}`);
  }
  return rows.join("\n");
}

async function run(cmd, args, opts = {}) {
  return exec(cmd, args, { maxBuffer: 128 * 1024 * 1024, ...opts });
}

// ── Playlist siyahısı ──
const listRaw = (await run("yt-dlp", ["--js-runtimes", "node", "--flat-playlist", "--print", "%(playlist_index)s\t%(id)s\t%(title)s", PLAYLIST])).stdout;
const all = listRaw.trim().split("\n").filter(Boolean).map((l) => {
  const [idx, id, ...t] = l.split("\t");
  return { idx: parseInt(idx, 10), id: id.trim(), title: t.join("\t").trim() };
}).filter((v) => v.id && v.id !== "NA" && v.title !== "NA");

const targets = all.filter((v) => v.idx >= FROM && v.idx <= TO);
console.log(`📚 ${targets.length} video emal olunacaq (${FROM}–${TO}), kadr aralığı ${STEP}s\n`);

await mkdir(ROOT, { recursive: true });

for (const v of targets) {
  const nn = String(v.idx).padStart(2, "0");
  const dir = path.join(ROOT, `${nn}_${slug(v.title)}`);
  const framesDir = path.join(dir, "frames");

  if (existsSync(path.join(dir, "frames_timeline.txt"))) {
    console.log(`${nn}. ⏭️  hazırdır — ${v.title.slice(0, 55)}`);
    continue;
  }

  console.log(`${nn}. ${v.title.slice(0, 60)}`);
  await mkdir(framesDir, { recursive: true });
  const vpath = path.join(dir, "video.mp4");

  // 1) Video (720p kifayətdir — qrafik yazıları oxunur, yer az tutur)
  try {
    process.stdout.write("    ⬇️  video... ");
    await run("yt-dlp", [
      "--js-runtimes", "node",
      "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
      "--merge-output-format", "mp4", "--no-warnings", "-o", vpath,
      `https://www.youtube.com/watch?v=${v.id}`,
    ]);
    const s = await stat(vpath);
    console.log(`${(s.size / 1e6).toFixed(0)} MB`);
  } catch (e) {
    console.log(`❌ yüklənmədi (${e.message.split("\n")[0].slice(0, 60)})`);
    continue;
  }

  // 2) Kadrlar
  process.stdout.write("    🖼️  kadrlar... ");
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", vpath,
    "-vf", `fps=1/${STEP},scale=1280:-2`, "-q:v", "3",
    path.join(framesDir, "f_%05d.jpg"),
  ]);
  const frames = (await readdir(framesDir)).filter((f) => f.endsWith(".jpg")).sort();
  console.log(`${frames.length} kadr`);

  // Kadr → vaxt cədvəli
  const timeline = frames.map((f, i) => {
    const sec = i * STEP;
    const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${f}\t${hh}:${mm}:${ss}`;
  }).join("\n");
  await writeFile(path.join(dir, "frames_timeline.txt"), timeline + "\n", "utf8");

  // 3) Səs
  process.stdout.write("    🔊 səs... ");
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", vpath,
    "-vn", "-acodec", "libmp3lame", "-q:a", "5", path.join(dir, "audio.mp3")]);
  console.log("ok");

  // 4) Altyazı
  process.stdout.write("    📝 transkript... ");
  let done = false;
  for (const lang of ["tr", "en", "az"]) {
    try {
      await run("yt-dlp", ["--js-runtimes", "node", "--skip-download", "--write-auto-sub", "--sub-lang", lang,
        "--sub-format", "vtt", "--no-warnings", "-o", path.join(dir, "sub"),
        `https://www.youtube.com/watch?v=${v.id}`]);
      const f = (await readdir(dir)).find((x) => x.startsWith("sub") && x.endsWith(".vtt"));
      if (f) {
        const vtt = await readFile(path.join(dir, f), "utf8");
        await writeFile(path.join(dir, "transcript.txt"),
          `# ${v.title}\n# https://youtu.be/${v.id}\n# dil: ${lang}\n\n${cleanVtt(vtt)}\n`, "utf8");
        await writeFile(path.join(dir, "transcript_timed.txt"),
          `# ${v.title} — vaxt damğalı (kadrlarla uyğunlaşdırmaq üçün)\n\n${timedVtt(vtt)}\n`, "utf8");
        await rm(path.join(dir, f), { force: true });
        console.log(`${lang} ✓`);
        done = true;
        break;
      }
    } catch { /* növbəti dil */ }
  }
  if (!done) console.log("altyazı yoxdur");

  // 5) Video faylını sil (kadrlar və səs artıq var)
  await rm(vpath, { force: true });
}

console.log("\n✅ Bitdi.");
