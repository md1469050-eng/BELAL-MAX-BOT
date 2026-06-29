/**
 * tiktok.js — v4.0 FIXED
 * ✅ Multi-API fallback
 * ✅ stream সরাসরি — disk error handle করা
 * BELAL BOTX666 | Master: Belal YT
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

// ── apiHelper safe loader ──────────────────────────────────────
const _apiHelper = (() => {
  try { return require("../../utils/apiHelper"); } catch {}
  try { return require("../utils/apiHelper"); } catch {}
  return global._apiHelper || global.apiHelper || {};
})();
const {
  getUA = () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
} = _apiHelper;

module.exports.config = {
  name: "tiktok", aliases: ["tt", "tikdown"], version: "4.0.0",
  author: "Belal YT", description: "TikTok ভিডিও watermark ছাড়া ডাউনলোড",
  usage: "/tiktok [link]", category: "📥 ডাউনলোড", cooldowns: 15, hasPermssion: 0, role: 0,
};

async function fromTikwm(url) {
  const APIs = [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
    `https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`,
  ];
  for (const api of APIs) {
    try {
      const r = await axios.get(api, { timeout: 12000 });
      const d = r?.data?.data;
      if (!d) continue;
      const videoUrl = d.hdplay || d.play;
      if (!videoUrl) continue;
      return {
        url: videoUrl,
        info: {
          title:    d.title   || "TikTok ভিডিও",
          author:   d.author?.nickname || "Unknown",
          duration: d.duration ? `${d.duration}s` : "N/A",
          likes:    d.digg_count ? Number(d.digg_count).toLocaleString() : "N/A",
          comments: d.comment_count ? Number(d.comment_count).toLocaleString() : "N/A",
        }
      };
    } catch {}
  }
  return null;
}

async function fromMahiApi(url) {
  try {
    const r = await axios.get(
      `https://mahi-apis.onrender.com/api/tiktok?url=${encodeURIComponent(url)}`,
      { timeout: 15000 }
    );
    const d = r?.data;
    if (!d?.video) return null;
    return {
      url: d.video,
      info: { title: d.title || "TikTok ভিডিও", author: d.author || "Unknown", duration: "N/A", likes: "N/A", comments: "N/A" }
    };
  } catch { return null; }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const url = args[0];
  if (!url || !url.includes("tiktok")) {
    return api.sendMessage("❌ TikTok লিংক দিন!\nউদাহরণ: /tiktok https://vm.tiktok.com/xxx", threadID, messageID);
  }

  api.setMessageReaction("⏳", messageID, () => {}, true);
  let tmpMsgID = null;
  await new Promise(r =>
    api.sendMessage("⬇️ TikTok ডাউনলোড হচ্ছে...", threadID, (e, i) => { tmpMsgID = i?.messageID; r(); })
  );

  let tmpFile = null;
  try {
    let result = await fromTikwm(url) || await fromMahiApi(url);
    if (!result) throw new Error("সব API ব্যর্থ হয়েছে");

    // ✅ FIX: ঠিকমতো tmp ডাউনলোড করা
    const tmpDir = path.join(process.cwd(), "tmp");
    await fs.ensureDir(tmpDir);
    tmpFile = path.join(tmpDir, `tt_${Date.now()}.mp4`);

    const r2 = await axios({
      method: "GET", url: result.url, responseType: "stream",
      headers: { "User-Agent": getUA() }, timeout: 60000, maxRedirects: 10
    });
    await new Promise((res, rej) => {
      const ws = fs.createWriteStream(tmpFile);
      r2.data.pipe(ws);
      ws.on("finish", res);
      ws.on("error", rej);
    });

    // ✅ FIX: file size চেক
    const stat = await fs.stat(tmpFile);
    if (stat.size < 1000) throw new Error("ভিডিও ফাইল খুব ছোট, আবার চেষ্টা করুন");

    try { if (tmpMsgID) api.unsendMessage(tmpMsgID); } catch {}
    api.setMessageReaction("✅", messageID, () => {}, true);

    await api.sendMessage({
      body: `🎵 ${result.info.title}\n👤 ${result.info.author}\n⏱️ ${result.info.duration}\n❤️ ${result.info.likes}  💬 ${result.info.comments}`,
      attachment: fs.createReadStream(tmpFile),
    }, threadID, messageID);

    setTimeout(() => fs.remove(tmpFile).catch(() => {}), 30000);
  } catch (err) {
    try { if (tmpMsgID) api.unsendMessage(tmpMsgID); } catch {}
    if (tmpFile) fs.remove(tmpFile).catch(() => {});
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`❌ ডাউনলোড ব্যর্থ: ${err.message?.slice(0,100)}`, threadID, messageID);
  }
};

module.exports.onStart = module.exports.run;
