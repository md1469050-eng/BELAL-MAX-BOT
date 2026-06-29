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
 * song.js — v7.0 FIXED
 * ✅ Cobalt API নতুন format
 * ✅ fallback API race
 * ✅ disk নেই — সরাসরি stream
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

// ✅ FIX: Cobalt নতুন format
async function getCobaltUrl(videoId) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = [
    "https://api.cobalt.tools",
    "https://cobalt.api.timelessnesses.me",
  ];
  return Promise.any(instances.map(base =>
    axios.post(base, {
      url: youtubeUrl,
      audioFormat: "mp3",
      downloadMode: "audio",
      filenameStyle: "basic"
    }, {
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      timeout: 15000
    }).then(r => {
      const url = r.data?.url || r.data?.audio;
      if (!url) throw new Error("no url");
      return url;
    })
  ));
}

async function fastAudioStream(url) {
  return Promise.any([url, url, url].map(u =>
    axios({ method: "GET", url: u, responseType: "stream", headers: HEADERS, timeout: 60000, maxRedirects: 10 })
      .then(r => { r.data.path = "song.mp3"; return r.data; })
  ));
}

async function streamImg(url, name) {
  const r = await axios.get(url, { responseType: "stream", timeout: 10000 });
  r.data.path = name;
  return r.data;
}

async function getDownloadUrl(videoId) {
  const base = await getApi();

  const cobalt = getCobaltUrl(videoId).catch(() => null);

  const oldApi = axios.get(
    `${base}/ytDl3?link=${videoId}&format=mp3&quality=3`, { timeout: 40000 }
  ).then(r => {
    if (!r.data?.downloadLink) throw new Error("no link");
    return r.data.downloadLink;
  }).catch(() => null);

  const results = await Promise.allSettled([cobalt, oldApi]);
  for (const res of results) {
    if (res.status === "fulfilled" && res.value) return res.value;
  }
  throw new Error("সব API ব্যর্থ হয়েছে");
}

module.exports = {
  config: {
    name: "song",
    aliases: ["music", "play", "mp3", "audio", "গান"],
    version: "7.0.0",
    author: "Belal YT",
    countDown: 10,
    role: 0,
    hasPermssion: 0,
    shortDescription: "গান সার্চ করে অডিওতে পাঠায়",
    category: "media",
    guide: { en: "{pn} <গানের নাম>" },
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!args.length) return api.sendMessage(
      "🎵 ব্যবহার: /song <গানের নাম>\nউদাহরণ: /song Bohemian Rhapsody",
      threadID, messageID
    );

    const keyword = args.join(" ").trim();
    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const base = await getApi();
      const results = (await axios.get(
        `${base}/ytFullSearch?songName=${encodeURIComponent(keyword)}`, { timeout: 15000 }
      )).data.slice(0, 6);

      if (!results.length) return api.sendMessage(
        `⭕ "${keyword}" এর কোনো গান পাওয়া যায়নি।`, threadID, messageID
      );

      let msg = `🎵 "${keyword}"\n${"─".repeat(22)}\n\n`;
      const thumbPromises = results.map((r, i) => {
        msg += `${i+1}. ${r.title}\n⏱️ ${r.time} | ${r.channel?.name||"?"}\n\n`;
        return streamImg(r.thumbnail, `st${i+1}.jpg`).catch(() => null);
      });
      msg += "👉 নম্বর দিয়ে reply করুন (১-৬)";

      const imgs = (await Promise.all(thumbPromises)).filter(Boolean);
      api.setMessageReaction("✅", messageID, () => {}, true);

      api.sendMessage({ body: msg, attachment: imgs }, threadID, (err, info) => {
        if (err || !info) return;
        global.client.handleReply.push({
          name: "song",
          messageID: info.messageID,
          author: senderID,
          result: results,
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

    const choice = parseInt(body);
    if (isNaN(choice) || choice < 1 || choice > handleReply.result.length)
      return api.sendMessage("❌ সঠিক নম্বর দিন (১-৬)।", threadID, messageID);

    const vid = handleReply.result[choice - 1];
    try { await api.unsendMessage(handleReply.messageID); } catch {}

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const downloadUrl = await getDownloadUrl(vid.id);
      const stream = await fastAudioStream(downloadUrl);

      await api.sendMessage({
        body: `🎵 ${vid.title}\n⏱️ ${vid.time} | ${vid.channel?.name || ""}\n\n🎶 ┄┉ উপভোগ করুন ┉┄ 🎶`,
        attachment: stream
      }, threadID, () => {}, messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (e) {
      console.error("[song]", e.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`❌ গান আনতে ব্যর্থ: ${e.message?.slice(0,100)}`, threadID, messageID);
    }
  },
};

setTimeout(() => getApi().catch(() => {}), 2000);
