/*
 * sexvid.js — v3.0
 * ✅ Imgur stream — disk নেই
 * BELAL BOTX666 | Master: Belal YT
 * role: 2 (admin only)
 */
"use strict";
const axios = require("axios");

const VIDEOS = [
  "https://i.imgur.com/wplkWei.mp4","https://i.imgur.com/rJvUfXX.mp4","https://i.imgur.com/YqsGcBv.mp4",
  "https://i.imgur.com/PAJGtA6.mp4","https://i.imgur.com/yViwByW.mp4","https://i.imgur.com/S4lsfkT.mp4",
  "https://i.imgur.com/HpkE2V0.mp4","https://i.imgur.com/UJ7sm8I.mp4","https://i.imgur.com/nBLn7xd.mp4",
  "https://i.imgur.com/gH2Mbjo.mp4","https://i.imgur.com/hsAV4ka.mp4","https://i.imgur.com/nh5MDCE.mp4",
  "https://i.imgur.com/GiuSSoD.mp4","https://i.imgur.com/N53aPZ4.mp4","https://i.imgur.com/Q8XHg6w.mp4",
  "https://i.imgur.com/sz6UNIl.mp4","https://i.imgur.com/qqhCxOS.mp4","https://i.imgur.com/nm5NgXM.mp4",
  "https://i.imgur.com/c1UshIs.mp4","https://i.imgur.com/buyPh3t.mp4","https://i.imgur.com/MUt0UUh.mp4",
  "https://i.imgur.com/gMd2FVP.mp4","https://i.imgur.com/gNG8aJQ.mp4","https://i.imgur.com/syezUGL.mp4",
  "https://i.imgur.com/sVGMQTp.mp4","https://i.imgur.com/IKp5CTz.mp4","https://i.imgur.com/5zavCWI.mp4",
  "https://i.imgur.com/9y2c7Or.mp4","https://i.imgur.com/q9c09K9.mp4","https://i.imgur.com/OOBZN84.mp4",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://imgur.com/",
  "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
};

async function fastStream(links) {
  const pick = () => links[Math.floor(Math.random() * links.length)];
  const attempts = [pick(), pick(), pick()];
  return Promise.any(attempts.map(url =>
    axios({ method: "GET", url, responseType: "stream", headers: HEADERS, timeout: 25000, maxRedirects: 5 })
      .then(r => { r.data.path = "video.mp4"; return r.data; })
  ));
}

module.exports = {
  config: {
    name: "sexvid",
    aliases: ["18v"],
    version: "3.0",
    author: "Belal YT",
    countDown: 30,
    role: 2,
    shortDescription: "18+ ভিডিও (শুধু এডমিন)",
    longDescription: "18+ ভিডিও পাঠায় — শুধুমাত্র বট এডমিনদের জন্য",
    category: "18+",
    guide: "{p}{n}",
  },

  sentVideos: [],

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;
    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      const stream = await fastStream(VIDEOS);
      await message.reply({
        body: "🥵 ভিডিও এসে গেছে!\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄",
        attachment: stream,
      });
      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ ভিডিও লোড ব্যর্থ, আবার চেষ্টা করুন।");
    }
  }
};
