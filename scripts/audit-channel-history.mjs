// Bir dəfəlik audit: verilmiş Telegram qrupunun BÜTÜN mesaj tarixçəsini çəkib
// xam JSON olaraq yazır. Məqsəd: TP/SL formatını real datada görüb sonra
// düzgün parser + real qiymətlə nəticə yoxlaması yazmaq (özünə güvənməmək —
// qrupun "TP oldu" dediyinə kor-koranə inanmaq əvəzinə real qiymətlə yoxlanacaq).
//
// ENV: TG_API_ID, TG_API_HASH, TG_SESSION (mövcud channel-relay secretləri),
//      AUDIT_CHAT_ID (məs. -1004369378478)

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "data";
const CHAT_ID = process.env.AUDIT_CHAT_ID;

async function main() {
  if (!CHAT_ID) throw new Error("AUDIT_CHAT_ID lazımdır");
  await mkdir(DATA_DIR, { recursive: true });

  const apiId = parseInt(process.env.TG_API_ID, 10);
  const apiHash = process.env.TG_API_HASH;
  const sessionStr = process.env.TG_SESSION;

  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 3 });
  await client.connect();
  console.log("✅ Telegram-a qoşuldu");

  const entity = await client.getEntity(CHAT_ID);
  console.log(`Qrup: ${entity.title || CHAT_ID}`);

  const messages = [];
  let count = 0;
  for await (const msg of client.iterMessages(entity, { limit: 20000 })) {
    count++;
    if (!msg.message) continue; // media-only, boş və s. keçilir
    messages.push({
      id: msg.id,
      date: new Date(msg.date * 1000).toISOString(),
      text: msg.message,
    });
  }
  // xronoloji sıraya (köhnədən yeniyə) düz
  messages.reverse();

  console.log(`Toplam yoxlanmış mesaj: ${count} | mətnli mesaj: ${messages.length}`);
  if (messages.length) {
    console.log(`İlk mesaj: ${messages[0].date}`);
    console.log(`Son mesaj: ${messages[messages.length - 1].date}`);
  }

  const outPath = path.join(DATA_DIR, "audit-borsaworkout-group.json");
  await writeFile(outPath, JSON.stringify(messages, null, 2));
  console.log(`Yazıldı: ${outPath}`);

  await client.disconnect();
}

main().catch((err) => {
  console.error("XƏTA:", err);
  process.exit(1);
});
