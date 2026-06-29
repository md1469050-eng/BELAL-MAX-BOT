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
 * videov2.js — v8.0 FIXED
 * ✅ Cobalt API নতুন format
 * ✅ search + সাথে সাথে #1 ভিডিও পাঠায়
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
      _cachedSafeApi = base; return base;
    }
  } catch {}
  if (_cachedSafeApi) return _cachedSafeApi;
  return _FALLBACK_APIS[0];
}

// ✅ FIX: Cobalt নতুন format
async function getCobaltUrl(videoId, fmt) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = ["https://api.cobalt.tools","https://cobalt.api.timelessnesses.me"];
  return Promise.any(instances.map(base =>
    axios.post(base, {
      url: youtubeUrl,
      videoQuality: "720",
      audioFormat: "mp3",
      downloadMode: fmt === "mp3" ? "audio" : "auto",
      filenameStyle: "basic"
    }, { headers: { "Accept": "application/json", "Content-Type": "application/json" }, timeout: 15000 })
    .then(r => {
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

async function searchAndDownload(keyword, fmt) {
  const base = await getApi();
  const results = (await axios.get(
    `${base}/ytFullSearch?songName=${encodeURIComponent(keyword)}`, { timeout: 15000 }
  )).data;
  if (!results?.length) return null;
  const top = results[0];

  const cobaltP = getCobaltUrl(top.id, fmt)
    .then(url => ({ url, title: top.title, quality: "720p" }))
    .catch(() => null);

  const oldApiP = axios.get(
    `${base}/ytDl3?link=${top.id}&format=${fmt}&quality=3`, { timeout: 40000 }
  ).then(r => ({ url: r.data.downloadLink, title: r.data.title, quality: r.data.quality }))
    .catch(() => null);

  const settled = await Promise.allSettled([cobaltP, oldApiP]);
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value?.url) {
      return { ...s.value, thumb: top.thumbnail, time: top.time, channel: top.channel?.name || "" };
    }
  }
  throw new Error("সব API ব্যর্থ হয়েছে");
}

module.exports = {
  config: {
    name: "v",
    aliases: ["videov2"],
    version: "8.0.0",
    author: "Belal YT",
    countDown: 10,
    role: 0,
    hasPermssion: 0,
    shortDescription: "YouTube ভিডিও/অডিও — সাথে সাথে পাঠায়",
    category: "media",
    guide: { en: "{pn} <গানের নাম>  |  {pn} -a <গানের নাম>" },
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    if (!args.length) return api.sendMessage(
      "❌ উদাহরণ:\n/v Bohemian Rhapsody\n/v -a Bangla remix", threadID, messageID
    );

    let fmt = "mp4";
    if (args[0]?.toLowerCase() === "-a" || args[0]?.toLowerCase() === "mp3") {
      fmt = "mp3"; args.shift();
    }

    const keyword = args.join(" ").trim();
    if (!keyword) return api.sendMessage("❌ গানের নাম দিন।", threadID, messageID);

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const result = await searchAndDownload(keyword, fmt);
      if (!result) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`⭕ "${keyword}" এর কোনো ফলাফল নেই।`, threadID, messageID);
      }

      const stream = await fastStream(result.url, `video.${fmt}`);
      await api.sendMessage({
        body: `${fmt==="mp4"?"🎬":"🎵"} ${result.title}\n⏱️ ${result.time} | ${result.channel}\n📊 ${result.quality}`,
        attachment: stream
      }, threadID, () => {}, messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (e) {
      console.error("[videov2]", e.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`❌ ডাউনলোড ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
    }
  },
};

setTimeout(() => getApi().catch(() => {}), 2000);
