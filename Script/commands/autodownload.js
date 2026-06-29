"use strict";
// ── apiHelper safe loader ──────────────────────────────────────
const _apiHelper = (() => {
  try { return require("../../utils/apiHelper"); } catch {}
  try { return require("../utils/apiHelper"); } catch {}
  return global._apiHelper || global.apiHelper || {};
})();
const {
  safeGet = async(u,o)=>(await require("axios").get(u,{timeout:30000,...(o||{})})),
  safePost = async(u,d,o)=>(await require("axios").post(u,d,{timeout:30000,...(o||{})})),
  safeStream = async(u,f)=>{ const r=await require("axios")({method:"GET",url:u,responseType:"stream",timeout:30000}); if(f)r.data.path=f; return r.data; },
  getUA = ()=>(_apiHelper.getUA ? _apiHelper.getUA() : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
  getBaseApi = ()=>(_apiHelper.getBaseApi ? _apiHelper.getBaseApi() : null),
} = _apiHelper;
// ────────────────────────────────────────────────────────────

const axios = require("axios");

// ─── URL PATTERNS ───────────────────────────────────────────────────────────
const URL_PATTERNS = {
  tiktok: /https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+/i,
  youtube: /https?:\/\/(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/i,
  facebook: /https?:\/\/(www\.|m\.|web\.)?facebook\.com\/[^\s]+\/videos\/[^\s]+/i,
  instagram: /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^\s]+/i,
  twitter: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+\/status\/[^\s]+/i
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
};

function detectPlatform(text) {
  for (const [platform, regex] of Object.entries(URL_PATTERNS)) {
    const match = text.match(regex);
    if (match) return { platform, url: match[0] };
  }
  return null;
}

async function streamVideo(videoUrl, filename = "video.mp4") {
  const res = await axios({
    method: "GET",
    url: videoUrl,
    responseType: "stream",
    headers: HEADERS,
    timeout: 20000,
    maxRedirects: 8
  });
  res.data.path = filename;
  return res.data;
}

async function getTikTokStream(url) {
  const { data } = await axios.get(
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    { timeout: 8000 }
  );
  if (!data || data.code !== 0) throw new Error("tikwm failed");
  const v = data.data;
  const videoUrl = v.hdplay || v.play;
  if (!videoUrl) throw new Error("no video url");
  const info = {
    title: v.title || "TikTok Video",
    author: v.author?.nickname || "Unknown",
    duration: v.duration ? `${v.duration}s` : "N/A",
    views: v.play_count ? Number(v.play_count).toLocaleString() : "N/A",
    likes: v.digg_count ? Number(v.digg_count).toLocaleString() : "N/A"
  };
  const stream = await streamVideo(videoUrl, "tiktok.mp4");
  return { stream, info };
}

async function getTikTokFallback(url) {
  const { data } = await axios.post(
    "https://ssstik.io/abc?url=dl",
    new URLSearchParams({ id: url, locale: "en", tt: "" }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://ssstik.io/"
      },
      timeout: 10000
    }
  );
  const match = data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i);
  if (!match) throw new Error("ssstik failed");
  const stream = await streamVideo(match[1], "tiktok.mp4");
  return {
    stream,
    info: { title: "TikTok Video", author: "Unknown", duration: "N/A", views: "N/A", likes: "N/A" }
  };
}

async function getCobaltStream(url, platform) {
  const { data } = await axios.post(
    "https://api.cobalt.tools/api/json",
    { url, vQuality: "720", isAudioOnly: false },
    {
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      timeout: 12000
    }
  );
  if (!data || !data.url) throw new Error("cobalt failed");
  const stream = await streamVideo(data.url, `${platform}.mp4`);
  return {
    stream,
    info: {
      title: data.filename || `${platform} Video`,
      author: "Unknown",
      duration: "N/A",
      views: "N/A",
      likes: "N/A"
    }
  };
}

async function getVideoStream(platform, url) {
  if (platform === "tiktok") {
    return Promise.any([getTikTokStream(url),
      getTikTokFallback(url)]);
  }
  return getCobaltStream(url, platform);
}

function formatInfo(platform, info) {
  const icons = { tiktok: "🎵", youtube: "▶️", facebook: "📘", instagram: "📸", twitter: "🐦" };
  const icon = icons[platform] || "🎬";
  return [`${icon} ╔══════════════════╗`,
    `  ║  ${platform.toUpperCase()} VIDEO  ║`,
    `  ╚══════════════════╝`,
    `📌 Title: ${(info.title || "N/A").slice(0, 60)}`,
    `👤 Author: ${info.author || "N/A"}`,
    `⏱️ Duration: ${info.duration || "N/A"}`,
    `👁️ Views: ${info.views || "N/A"}`,
    `❤️ Likes: ${info.likes || "N/A"}`,
    `\n⚡ Powered by BELAL-BOTX666`].join("\n");
}

module.exports.config = {
  name: "autodownload",
  version: "6.0.0",
  hasPermssion: 0,
  credits: "BELAL BOTX666",
  description: "Auto detect & download videos ULTRA FAST (stream mode)",
  commandCategory: "video",
  usages: "[video link]",
  cooldowns: 5,
  noPrefix: true
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, messageID, body } = event;
  if (!body || typeof body !== "string") return;
  const detected = detectPlatform(body);
  if (!detected) return;
  const { platform, url } = detected;
  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);
    const { stream, info } = await getVideoStream(platform, url);
    const caption = formatInfo(platform, info);
    await api.sendMessage({ body: caption, attachment: stream }, threadID, messageID);
    api.setMessageReaction("✅", messageID, () => {}, true);
  } catch (err) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      `❌ ভিডিও ডাউনলোড ব্যর্থ!\nPlatform: ${platform}\nError: ${err.message || "Unknown"}`,
      threadID, messageID
    );
  }
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  const url = args.join(" ").trim();
  if (!url) return api.sendMessage("📎 একটা ভিডিও লিংক দাও।", threadID, messageID);
  const detected = detectPlatform(url);
  if (!detected) return api.sendMessage(
    "❌ সাপোর্টেড লিংক না।\nTikTok, YouTube, Facebook, Instagram, Twitter",
    threadID, messageID
  );
  const { platform } = detected;
  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);
    const { stream, info } = await getVideoStream(platform, url);
    const caption = formatInfo(platform, info);
    await api.sendMessage({ body: caption, attachment: stream }, threadID, messageID);
    api.setMessageReaction("✅", messageID, () => {}, true);
  } catch (err) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`❌ ব্যর্থ: ${err.message}`, threadID, messageID);
  }
};
    
