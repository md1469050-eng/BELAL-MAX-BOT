"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const { safeGet } = require("../../utils/apiHelper");

const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const BOXES = [
  ["╔══『 🌻 BEST FRIEND 』══╗","╚════════════════════════╝"],
  ["«━━◤ 💛 BFF FOREVER ◢━━»","«━━━━━━━━━━━━━━━━━━━━━━━━»"],
  ["┏━━『 🫶 FRIENDSHIP 』━━┓","┗━━━━━━━━━━━━━━━━━━━━━━━━┛"],
  ["╔♡♡『 🌼 MY BFF 』♡♡╗","╚♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡╝"],
];

const CAPTIONS = [
  "🌼 বন্ধুত্ব মানে শুধু পাশে থাকা না,\nবন্ধুত্ব মানে মন খারাপেও হাসি এনে দেওয়া 💛\nসব সময় এমনই থাকিস আমার Best Friend 🫶",
  "একটা মানুষই যথেষ্ট,\nযার সাথে সব কথা বলা যায় 💛🌻\nBest Friend Forever 🫶",
  "তুই আছিস বলেই,\nজীবনটা এত সুন্দর লাগে 🫶🌸\nMy Best Friend 💛",
  "রক্তের সম্পর্ক না হয়েও,\nযে মানুষটা নিজের চেয়েও কাছের 💛\nসেই তো আসল Best Friend 🌻🫶",
  "কথা কম, বোঝাপড়া বেশি 😌💛\nএইটাই আমাদের বন্ধুত্ব 🫶",
];

module.exports.config = {
  name: "bestfriend", version: "2.0.0", hasPermssion: 0,
  credits: "BELAL BOTX666", description: "Best friend banner image",
  commandCategory: "banner", usages: "bestfriend [@mention]", cooldowns: 5,
};

module.exports.run = async function ({ event, api }) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;
  const [bTop, bBot] = rand(BOXES);
  const sig = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";

  let targetID = Object.keys(mentions)[0] || messageReply?.senderID;
  if (!targetID) return api.sendMessage(`${bTop}\n❌ কাউকে mention বা reply করো!\n${bBot}`, threadID, messageID);

  try {
    const apiList = await safeGet("https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/refs/heads/main/SAHU-API.json", { timeout:8000 });
    const BASE    = apiList?.data?.AvatarCanvas;
    if (!BASE) throw new Error("API URL নেই");

    const res = await axios.post(`${BASE}/api`, { cmd:"bestFriend", senderID, targetID },
      { responseType:"arraybuffer", timeout:30000 });

    const imgPath = path.join(process.cwd(),"tmp",`bf_${senderID}_${targetID}.png`);
    await fs.ensureDir(path.join(process.cwd(),"tmp"));
    fs.writeFileSync(imgPath, res.data);

    return api.sendMessage({
      body: `${bTop}\n${rand(CAPTIONS)}\n${bBot}${sig}`,
      attachment: fs.createReadStream(imgPath),
    }, threadID, () => fs.remove(imgPath).catch(()=>{}), messageID);

  } catch {
    return api.sendMessage(`${bTop}\n❌ API Error! আবার চেষ্টা করো।\n${bBot}`, threadID, messageID);
  }
};
