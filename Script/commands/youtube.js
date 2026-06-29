/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ▶️ youtube.js — YouTube ভিডিও ডাউনলোড
  BELAL BOTX666 | Master: Belal YT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const axios = require("axios");

// ── apiHelper safe loader ──────────────────────────────────────
const _apiHelper = (() => {
  try { return require("../../utils/apiHelper"); } catch {}
  try { return require("../utils/apiHelper"); } catch {}
  return global._apiHelper || global.apiHelper || {};
})();
const {
  getBaseApi = () => null,
  getUA = () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
} = _apiHelper;

const _FALLBACK_APIS = [
  "https://kaiz-apis.gleeze.com/api",
  "https://www.noobs-api.rf.gd/dipto",
  "https://api-aroniix.koyeb.app",
];
let _cachedApi = null;
async function getApi() {
  try {
    const base = await getBaseApi();
    if (base && typeof base === "string" && base.startsWith("http")) {
      _cachedApi = base;
      return base;
    }
  } catch {}
  if (_cachedApi) return _cachedApi;
  return _FALLBACK_APIS[0];
}

module.exports.config = {
  name: "youtube",
  aliases: ["yt", "ytmp4"],
  version: "3.0.0",
  author: "Belal YT",
  description: "YouTube ভিডিও ডাউনলোড করে পাঠায়",
  usage: "/youtube [link বা নাম]",
  category: "📥 ডাউনলোড",
  cooldowns: 20,
  hasPermssion: 0,
  role: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();
  if (!query) return api.sendMessage(
    "▶️ YouTube লিংক বা নাম দিন!\nউদাহরণ: /youtube Bangla song",
    threadID, messageID
  );

  api.setMessageReaction("⏳", messageID, () => {}, true);
  const tmpMsg = await new Promise(r =>
    api.sendMessage("⬇️ YouTube ভিডিও খুঁজছি...", threadID, (e, i) => r(i?.messageID))
  );

  try {
    const base = await getApi();
    const ytReg = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/;
    let videoId;

    if (ytReg.test(query)) {
      videoId = query.match(ytReg)?.[1];
    } else {
      // search করে প্রথম ফলাফল নাও
      const results = (await axios.get(
        `${base}/ytFullSearch?songName=${encodeURIComponent(query)}`, { timeout: 15000 }
      )).data;
      if (!results?.length) throw new Error("ভিডিও পাওয়া যায়নি");
      videoId = results[0].id;
    }

    const { data } = await axios.get(
      `${base}/ytDl3?link=${videoId}&format=mp4&quality=3`, { timeout: 40000 }
    );
    if (!data?.downloadLink) throw new Error("ডাউনলোড লিংক পাওয়া যায়নি");

    const tmpDir  = path.join(process.cwd(), "tmp");
    await fs.ensureDir(tmpDir);
    const tmpFile = path.join(tmpDir, `yt_${Date.now()}.mp4`);

    const r = await axios({ method: "GET", url: data.downloadLink, responseType: "stream",
      headers: { "User-Agent": getUA() }, timeout: 60000, maxRedirects: 10 });
    await new Promise((res, rej) => {
      const w = fs.createWriteStream(tmpFile);
      r.data.pipe(w);
      w.on("finish", res);
      w.on("error", rej);
    });

    try { api.unsendMessage(tmpMsg); } catch {}
    api.setMessageReaction("✅", messageID, () => {}, true);
    await api.sendMessage({
      body: `▶️ ${data.title || "YouTube ভিডিও"}\n📊 ${data.quality || ""}`,
      attachment: fs.createReadStream(tmpFile)
    }, threadID, messageID);

    setTimeout(() => fs.remove(tmpFile).catch(() => {}), 60000);
  } catch (err) {
    try { api.unsendMessage(tmpMsg); } catch {}
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`❌ ভিডিও ডাউনলোড ব্যর্থ: ${err.message?.slice(0,100)}`, threadID, messageID);
  }
};

module.exports.onStart = module.exports.run;
