// ── apiHelper safe loader ──────────────────────────────────────
const _apiHelper = (() => {
  try { return require("../../utils/apiHelper"); } catch {}
  try { return require("../utils/apiHelper"); } catch {}
  return global._apiHelper || global.apiHelper || {};
})();
const {
  getUA = () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  getBaseApi = () => null,
} = _apiHelper;
// ────────────────────────────────────────────────────────────
/*
 * video.js — v6.0 FIXED
 * ✅ Cobalt API নতুন format (url field)
 * ✅ search + thumbnail Promise.all
 * ✅ disk নেই — সরাসরি stream attachment
 */
const axios = require("axios");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

const _FALLBACK_APIS = [
  "https://kaiz-apis.gleeze.com/api",
  "https://www.noobs-api.rf.gd/dipto",
  "https://api-aroniix.koyeb.app",
];
let _cachedSafeApi = null;
async function getApi() {
  try {
    const base = await getBaseApi();
    if (base && typeof base === "string" && base.startsWith("http")) {
      _cachedSafeApi = base;
      return base;
    }
  } catch {}
  if (_cachedSafeApi) return _cachedSafeApi;
  return _FALLBACK_APIS[0];
}

// ✅ FIX: Cobalt নতুন API format (2024+)
async function getCobaltUrl(videoId, fmt) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = [
    "https://api.cobalt.tools",
    "https://cobalt.api.timelessnesses.me",
  ];
  return Promise.any(instances.map(base =>
    axios.post(base, {
      url: youtubeUrl,               // ✅ "url" (নতুন format)
      videoQuality: "720",
      audioFormat: "mp3",
      downloadMode: fmt === "mp3" ? "audio" : "auto",
      filenameStyle: "basic"
    }, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      timeout: 15000
    }).then(r => {
      const url = r.data?.url || r.data?.audio;
      if (!url) throw new Error("no url");
      return url;
    })
  ));
}

async function fastStream(url, filename) {
  return Promise.any([url, url, url].map(u =>
    axios({ method: "GET", url: u, responseType: "stream", headers: HEADERS, timeout: 60000, maxRedirects: 10 })
      .then(r => { r.data.path = filename; return r.data; })
  ));
}

async function streamImg(url, name) {
  const r = await axios.get(url, { responseType: "stream", timeout: 10000 });
  r.data.path = name;
  return r.data;
}

// ✅ FIX: download URL বের করা — Cobalt + fallback API race
async function getDownloadUrl(videoId, fmt) {
  const base = await getApi();

  const cobaltPromise = getCobaltUrl(videoId, fmt)
    .catch(() => null);

  const oldApiPromise = axios.get(
    `${base}/ytDl3?link=${videoId}&format=${fmt}&quality=3`, { timeout: 40000 }
  ).then(r => {
    if (!r.data?.downloadLink) throw new Error("no link");
    return { url: r.data.downloadLink, title: r.data.title, quality: r.data.quality };
  }).catch(() => null);

  // যেটা আগে আসে এবং null নয় সেটা নাও
  const results = await Promise.allSettled([cobaltPromise, oldApiPromise]);
  for (const res of results) {
    if (res.status === "fulfilled" && res.value) {
      const val = res.value;
      if (typeof val === "string") return { url: val, title: null, quality: "720p" };
      return val;
    }
  }
  throw new Error("সব API ব্যর্থ হয়েছে");
}

module.exports = {
  config: {
    name: "video",
    version: "6.0.0",
    author: "Belal YT",
    countDown: 10,
    role: 0,
    hasPermssion: 0,
    shortDescription: "YouTube ভিডিও/অডিও ডাউনলোড",
    longDescription: "YouTube search করে ভিডিও বা অডিও ডাউনলোড করে পাঠায়",
    category: "media",
    guide: { en: "{pn} -v <নাম>  |  {pn} -a <নাম>  |  {pn} -i <নাম>" },
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    let action = args[0]?.toLowerCase() || "-v";
    if (!["-v","video","mp4","-a","audio","mp3","-i","info"].includes(action)) {
      args.unshift("-v");
      action = "-v";
    }

    const ytReg = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))(([\w-]){11})(?:\S+)?$/;
    const isUrl = args[1] ? ytReg.test(args[1]) : false;

    if (isUrl) {
      const fmt = ["-v","video","mp4"].includes(action) ? "mp4" : "mp3";
      const vid = args[1].match(ytReg)?.[1];
      if (!vid) return api.sendMessage("❌ YouTube লিংক সঠিক নয়।", threadID, messageID);
      try {
        api.setMessageReaction("⏳", messageID, () => {}, true);
        const result = await getDownloadUrl(vid, fmt);
        const stream = await fastStream(result.url, `video.${fmt}`);
        await api.sendMessage(
          { body: `${fmt==="mp4"?"🎬":"🎵"} ${result.title || "YouTube ভিডিও"}\n📊 ${result.quality || ""}`, attachment: stream },
          threadID, () => {}, messageID
        );
        api.setMessageReaction("✅", messageID, () => {}, true);
      } catch (e) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        api.sendMessage(`❌ ডাউনলোড ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
      }
      return;
    }

    args.shift();
    const keyword = args.join(" ").trim();
    if (!keyword) return api.sendMessage(
      "❌ উদাহরণ:\n/video -v Bangla remix\n/video -a Bohemian Rhapsody", threadID, messageID
    );

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const base = await getApi();
      const results = (await axios.get(
        `${base}/ytFullSearch?songName=${encodeURIComponent(keyword)}`, { timeout: 15000 }
      )).data.slice(0, 6);

      if (!results.length) return api.sendMessage(`⭕ "${keyword}" এর কোনো ফলাফল নেই।`, threadID, messageID);

      let msg = `🔎 "${keyword}"\n${"─".repeat(22)}\n\n`;
      const thumbPromises = results.map((r, i) => {
        msg += `${i+1}. ${r.title}\n⏱️ ${r.time} | ${r.channel?.name||"?"}\n\n`;
        return streamImg(r.thumbnail, `t${i+1}.jpg`).catch(() => null);
      });
      msg += "👉 নম্বর দিয়ে reply করুন (১-৬)";

      const imgs = (await Promise.all(thumbPromises)).filter(Boolean);
      api.setMessageReaction("✅", messageID, () => {}, true);
      api.sendMessage({ body: msg, attachment: imgs }, threadID, (err, info) => {
        if (err || !info) return;
        global.client.handleReply.push({
          name: "video",
          messageID: info.messageID,
          author: senderID,
          result: results,
          action,
        });
      }, messageID);
    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`❌ Search ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
    }
  },

  handleReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;
    const { result, action } = handleReply;
    const choice = parseInt(body);
    if (isNaN(choice) || choice < 1 || choice > result.length)
      return api.sendMessage("❌ সঠিক নম্বর দিন (১-৬)।", threadID, messageID);

    const vid = result[choice - 1];
    try { await api.unsendMessage(handleReply.messageID); } catch {}

    if (["-i","info"].includes(action)) {
      try {
        api.setMessageReaction("⏳", messageID, () => {}, true);
        const base = await getApi();
        const { data: d } = await axios.get(`${base}/ytfullinfo?videoID=${vid.id}`, { timeout: 15000 });
        const thumb = await streamImg(d.thumbnail, "info.jpg").catch(() => null);
        const msg = { body: `✨ ${d.title}\n⏳ ${(d.duration/60).toFixed(1)} min\n👀 ${d.view_count} views\n👍 ${d.like_count} likes\n📢 ${d.channel}\n🔗 ${d.webpage_url}` };
        if (thumb) msg.attachment = thumb;
        api.sendMessage(msg, threadID, messageID);
        api.setMessageReaction("✅", messageID, () => {}, true);
      } catch (e) {
        api.sendMessage(`❌ ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
      }
      return;
    }

    const fmt = ["-v","video","mp4"].includes(action) ? "mp4" : "mp3";
    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      const result2 = await getDownloadUrl(vid.id, fmt);
      const stream = await fastStream(result2.url, `video.${fmt}`);
      await api.sendMessage(
        { body: `${fmt==="mp4"?"🎬":"🎵"} ${result2.title || vid.title}\n📊 ${result2.quality || ""}`, attachment: stream },
        threadID, () => {}, messageID
      );
      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`❌ ডাউনলোড ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
    }
  },
};

setTimeout(() => getApi().catch(() => {}), 2000);
