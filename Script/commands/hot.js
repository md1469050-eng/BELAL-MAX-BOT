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
  downloadToTmp = async(url, filename) => {
    const fs2 = require("fs-extra"), path2 = require("path"), axios2 = require("axios");
    const dir = path2.join(process.cwd(), "tmp"); await fs2.ensureDir(dir);
    const out = path2.join(dir, filename || ("dl_" + Date.now() + ".mp4"));
    const r = await axios2({ method: "GET", url, responseType: "stream", timeout: 35000,
      headers: { "User-Agent": "Mozilla/5.0" }, maxRedirects: 8 });
    await new Promise((res, rej) => {
      const w = require("fs").createWriteStream(out);
      r.data.pipe(w); w.on("finish", res); w.on("error", rej);
    });
    return out;
  },
  cleanTmp = (f, ms = 10000) => setTimeout(() => require("fs-extra").remove(f).catch(() => {}), ms),
  getUA = () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
} = _apiHelper;

const TERMS = [
  "hot girl dance","hot girls reels","capcut_edit girl","hot girls edit",
  "tiktok hot girl dance","hot dance girl viral","trending girl remix",
  "hot edit girl","girl dance capcut",
];
const EXCLUDE = ["boy","male","guy","man","bro","dude","ছেলে","পুরুষ"];
const TIKWM = [
  q => `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=40`,
  q => `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=30`,
  q => `https://api.tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=20`,
];
let recentIds = [];

async function getVideo() {
  for (let a = 0; a < 5; a++) {
    const term = TERMS[Math.floor(Math.random() * TERMS.length)];
    for (const b of TIKWM) {
      try {
        const r = await axios.get(b(term), { timeout: 12000 });
        const videos = r?.data?.data?.videos?.filter(v => v.play);
        if (!videos?.length) continue;
        let pool = videos.filter(v => !recentIds.includes(v.video_id));
        if (!pool.length) { recentIds = []; pool = videos; }
        for (const v of pool) {
          const t = (v.title || "").toLowerCase(), au = (v.author?.unique_id || "").toLowerCase();
          if (EXCLUDE.some(w => t.includes(w) || au.includes(w))) continue;
          recentIds.push(v.video_id);
          if (recentIds.length > 25) recentIds.shift();
          return { url: v.play, title: v.title, digg: v.digg_count || 0 };
        }
      } catch {}
    }
  }
  return null;
}

module.exports = {
  config: {
    name: "hot", aliases: ["হট", "hotreels", "hotgirls"],
    version: "2.1.0",
    author: "Belal YT",
    description: "হট গার্লস ভিডিও", usage: "hot", cooldown: 10, role: 0,
    category: "video",
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    // ✅ FIX: sendMessage callback থেকে messageID নাও
    let waitMsgID = null;
    await new Promise(r =>
      api.sendMessage("🔥 হট গার্লস ভিডিও খুঁজছি...", threadID, (err, info) => {
        if (!err && info) waitMsgID = info.messageID;
        r();
      })
    );

    let tmpFile = null;
    try {
      const video = await getVideo();
      if (!video) throw new Error("ভিডিও পাওয়া যায়নি");
      tmpFile = await downloadToTmp(video.url, `hot_${Date.now()}.mp4`);
      if (waitMsgID) await api.unsendMessage(waitMsgID).catch(() => {});
      await api.sendMessage({
        body: `💃 হট গার্লস ভিডিও:\n📹 ${(video.title || "Hot Dance").slice(0, 80)}\n❤️ লাইক: ${Number(video.digg).toLocaleString()}`,
        attachment: fs.createReadStream(tmpFile),
      }, threadID, messageID);
    } catch {
      if (waitMsgID) await api.unsendMessage(waitMsgID).catch(() => {});
      api.sendMessage("❌ ভিডিও আনতে ব্যর্থ। আবার চেষ্টা করুন।", threadID, messageID);
    } finally {
      if (tmpFile) cleanTmp(tmpFile);
    }
  },

  onStart: function(ctx) { return module.exports.run(ctx); },
};
