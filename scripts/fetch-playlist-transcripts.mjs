// YouTube PLAYLIST → transkript toplusu (bir əmrlə, link-bə-link yox).
//
// İstifadə:
//   node scripts/fetch-playlist-transcripts.mjs "<playlist-url>" [çıxış-qovluğu]
//
// Nə edir:
//   1. yt-dlp ilə playlistdəki bütün videoların siyahısını çıxarır
//   2. hər biri üçün avtomatik altyazını çəkir (tr → en → az sırası ilə)
//   3. VTT-ni təmiz mətnə çevirir (təkrarlanan sətirlər silinir)
//   4. video-train/<qovluq>/NN_<id>.txt kimi yazır + index.md yaradır
//
// Video FAYLI yüklənmir — yalnız altyazı. Ona görə sürətli və yer tutmur.

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const exec = promisify(execFile);

const playlistUrl = process.argv[2];
const outName = process.argv[3] || "playlist";
if (!playlistUrl) {
  console.error('İstifadə: node scripts/fetch-playlist-transcripts.mjs "<playlist-url>" [qovluq-adı]');
  process.exit(1);
}

const OUT_DIR = path.join("video-train", outName);
const TMP_DIR = path.join(OUT_DIR, ".tmp");

// VTT → təmiz mətn. Avtomatik altyazıda hər sətir 2-3 dəfə təkrarlanır
// (sürüşən pəncərə effekti) — onları atırıq.
function cleanVtt(vtt) {
  const blocks = vtt.split(/\r?\n\r?\n/);
  const lines = [];
  let last = "";
  for (const b of blocks) {
    for (const raw of b.split(/\r?\n/)) {
      if (!raw) continue;
      if (raw.includes("-->")) continue;
      if (/^(WEBVTT|Kind:|Language:|NOTE)/.test(raw)) continue;
      const clean = raw.replace(/<[^>]+>/g, "").trim();
      if (clean && clean !== last) {
        lines.push(clean);
        last = clean;
      }
    }
  }
  // Prefiks təkrarlarını at: "salam" sonra "salam necəsən" gəlirsə, ilkini at
  const final = [];
  for (let i = 0; i < lines.length; i++) {
    if (i + 1 < lines.length && lines[i + 1].startsWith(lines[i])) continue;
    final.push(lines[i]);
  }
  return final.join(" ");
}

async function ytdlp(args) {
  const { stdout } = await exec("yt-dlp", args, { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

console.log("📋 Playlist oxunur...");
let listRaw;
try {
  listRaw = await ytdlp(["--flat-playlist", "--print", "%(id)s\t%(title)s", playlistUrl]);
} catch (e) {
  console.error("yt-dlp playlisti oxuya bilmədi:", e.message);
  process.exit(1);
}

const videos = listRaw.trim().split("\n").filter(Boolean).map((l) => {
  const [id, ...rest] = l.split("\t");
  return { id: id.trim(), title: rest.join("\t").trim() };
}).filter((v) => v.id && v.id !== "NA");

console.log(`   ${videos.length} video tapıldı.\n`);
await mkdir(OUT_DIR, { recursive: true });
await mkdir(TMP_DIR, { recursive: true });

const index = [];
let ok = 0, fail = 0;

for (let i = 0; i < videos.length; i++) {
  const v = videos[i];
  const n = String(i + 1).padStart(2, "0");
  const outFile = path.join(OUT_DIR, `${n}_${v.id}.txt`);

  if (existsSync(outFile)) {
    console.log(`${n}. ⏭️  artıq var — ${v.title.slice(0, 60)}`);
    index.push({ n, ...v, file: path.basename(outFile) });
    ok++;
    continue;
  }

  process.stdout.write(`${n}. ${v.title.slice(0, 60)} ... `);
  const base = path.join(TMP_DIR, v.id);
  let got = null;

  for (const lang of ["tr", "en", "az", "ru"]) {
    try {
      await ytdlp([
        "--skip-download", "--write-auto-sub", "--sub-lang", lang,
        "--sub-format", "vtt", "--no-warnings", "-o", base,
        `https://www.youtube.com/watch?v=${v.id}`,
      ]);
      const files = await readdir(TMP_DIR);
      const hit = files.find((f) => f.startsWith(v.id) && f.endsWith(".vtt"));
      if (hit) { got = { lang, path: path.join(TMP_DIR, hit) }; break; }
    } catch { /* növbəti dil */ }
  }

  if (!got) {
    console.log("❌ altyazı yoxdur");
    fail++;
    continue;
  }

  const text = cleanVtt(await readFile(got.path, "utf8"));
  await writeFile(outFile, `# ${v.title}\n# https://youtu.be/${v.id}\n# dil: ${got.lang}\n\n${text}\n`, "utf8");
  await rm(got.path, { force: true });
  console.log(`✅ ${got.lang} · ${(text.length / 1000).toFixed(0)}k simvol`);
  index.push({ n, ...v, file: path.basename(outFile), lang: got.lang, chars: text.length });
  ok++;
}

await rm(TMP_DIR, { recursive: true, force: true });

const idx = [
  `# ${outName} — transkript indeksi`,
  ``,
  `Mənbə: ${playlistUrl}`,
  `Çəkilib: ${new Date().toISOString().slice(0, 10)}`,
  `Video: ${ok} uğurlu, ${fail} altyazısız`,
  ``,
  `| # | Başlıq | Fayl | Dil | Ölçü |`,
  `|---|--------|------|-----|------|`,
  ...index.map((v) => `| ${v.n} | ${v.title.replace(/\|/g, "/")} | \`${v.file}\` | ${v.lang || "—"} | ${v.chars ? (v.chars / 1000).toFixed(0) + "k" : "—"} |`),
].join("\n");

await writeFile(path.join(OUT_DIR, "index.md"), idx + "\n", "utf8");

console.log(`\n✅ Bitdi: ${ok} transkript → ${OUT_DIR}/`);
console.log(`   İndeks: ${OUT_DIR}/index.md`);
if (fail) console.log(`   ⚠️  ${fail} videoda altyazı yox idi.`);
