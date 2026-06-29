"use strict";
const fs   = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "vut",
  version: "2.2.0",
  hasPermission: 2,
  credits: "BELAL BOTX666",
  description: "মেনশন করা ইউজার কিছু বললেই ভূতের আতঙ্ক ছড়াবে",
  commandCategory: "fun",
  usages: ["/vut on @user", "/vut off", "/vut admin on", "/vut admin off"],
  cooldowns: 3,
  role: 0,
};

const allowedUIDs = [
  "100056725134303","100029575411956","61584261741217","61583235547978",
  "100050176872558","61584216563899","100086228841266","61584522727189",
  "61554155702194","100089070078160","61567839089378","61582652176450"
];

// ✅ FIX: __dirname এ লেখার পরিবর্তে process.cwd()/tmp তে লেখো
const DATA_DIR     = path.join(process.cwd(), "tmp");
const dataFile     = path.join(DATA_DIR, "vut_status.json");
const adminModeFile= path.join(DATA_DIR, "vut_admin_mode.json");

function readJSON(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  return {};
}
function writeJSON(file, data) {
  try { fs.ensureDirSync(DATA_DIR); fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch {}
}

const ghostMessages = [
  "তুমি এখনো বসে আছো কারণ তুমি দেখছো না, কিন্তু এই ঘরে এমন কিছু দাঁড়িয়ে আছে যেটা আলোয় ধরা পড়ে না 👁️🌑",
  "তুমি ভাবছো এটা শুধু নীরবতা, কিন্তু নীরবতা এমন ভারী হয় না—এই নীরবতার ভেতর কেউ দাঁড়িয়ে থেকে তোমার দিকেই তাকিয়ে আছে 👻",
  "তুমি পেছনে তাকাওনি অনেকক্ষণ, কারণ জানো তাকালে যেটা দেখবে সেটা নড়বে না, শুধু অস্বাভাবিকভাবে খুব কাছে থাকবে 🌒",
  "তুমি আলো জ্বালিয়ে রেখেছো তবু ঘরের কোণটা অকারণে অন্ধকার, কারণ অন্ধকারটা আজ কোনো জায়গা ছাড়তে রাজি না 👁️",
  "তুমি নিঃশ্বাস নিলে বাতাস ঠান্ডা হয়, ছাড়লে আবার স্বাভাবিক—এটা ঘরের নিয়ম না ❄️",
  "তুমি জানো এই ঘরে কেউ থাকার কথা না, তবু বসে থাকতে গিয়ে বারবার মনে হচ্ছে জায়গাটা ইতিমধ্যে নেওয়া হয়েছে 🏠👤",
  "তুমি আয়নার সামনে দাঁড়ালে নিজের চোখের দিকটাই অস্বস্তিকর লাগে 🪞👁️",
  "তুমি শব্দ খুঁজছো, কিন্তু ভয়টা শব্দ না—ভয়টা এমন কিছু আছে যেটা একদম চুপ করে থেকেও বোঝা যায় 👻",
  "তুমি আলো নিভাওনি, তবু ছায়াটা দেয়ালে স্পষ্ট, কারণ ওটা আলো তৈরি করে না—আলো ব্যবহার করে 🌑",
  "তুমি এখনো আছো বলে ঘরটা শান্ত, তুমি নড়লেই এই শান্ত ভাবটা ভেঙে যাবে 😶‍🌫️",
  "তুমি দরজার দিকে তাকালে বুকটা হালকা ভারী লাগে, কারণ দরজার ওপাশে কিছু না থাকলেও ভেতরের দিকটা একা না 🚪",
  "তুমি ভাবছো এটা কল্পনা, কিন্তু কল্পনা কখনো জায়গা ঠান্ডা করে না ❄️👁️",
  "তুমি বসে আছো অথচ পেছনের দিকটা অস্বাভাবিকভাবে গভীর লাগছে, যেন ঘরটা সেখানে শেষ হচ্ছে না 🌑",
  "তুমি জানালার দিকে তাকাতে চাইছো না, কারণ কাঁচে তাকালেই বোঝা যায়—ভেতর আর বাইরে আজ আলাদা না 🪟",
  "তুমি চোখ সরালেই অস্বস্তিটা বাড়ে, কারণ ভয়টা দেখার জন্য না—ভয়টা অনুভব করার জন্য 👻",
  "তুমি একা আছো ভেবে নিশ্চিন্ত, কিন্তু এই ঘর একা থাকলে এমন আচরণ করে না 🏠👁️",
  "তুমি চুপ থাকলে ঘরটাও চুপ, কিন্তু এই চুপের ভেতর এমন কিছু আছে যেটা অপেক্ষা করতে জানে 🌑",
  "তুমি জানো না কেন আজ সময়টা ধীর, কারণ কিছু জিনিস নড়ার আগে সময় নেয় ⏳👻",
  "তুমি এখনও পড়ছো—মানে এই মুহূর্তে ঘরের সবকিছু তোমার দিকেই মনোযোগ দিচ্ছে 👁️🌑",
  "কবরের নীরবতা যেমন ভারী হয়, ঘরের বাতাসটাও আজ ঠিক তেমন ⚰️",
  "মেঝের ঠান্ডা আজ কবরের মাটির মতো ❄️",
  "দরজার ভেতরের দিকটা আজ অস্বাভাবিক, যেন বাইরে না—ভেতরেই কিছু ঢুকে পড়েছে 🚪",
];

const creditTag = "┄┉❈✡️⋆⃝চাঁদের~পাহাড়🪬❈┉┄";

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, messageID } = event;
  const status = readJSON(dataFile);
  if (!status[threadID] || !status[threadID].includes(senderID)) return;
  const random = ghostMessages[Math.floor(Math.random() * ghostMessages.length)];
  return api.sendMessage(`${random}\n\n${creditTag}`, threadID, messageID);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!allowedUIDs.includes(senderID)) {
    return api.sendMessage("❌ আপনি এই কমান্ড চালাতে অনুমোদিত নন!", threadID, messageID);
  }

  const mentions  = Object.keys(event.mentions || {});
  let adminMode   = readJSON(adminModeFile);
  const isAdminOnly = adminMode[threadID] || false;

  const threadInfo  = await api.getThreadInfo(threadID);
  const adminIDs    = threadInfo.adminIDs.map(e => e.id);
  const isSenderAdmin = adminIDs.includes(senderID);

  if (args[0] === "admin") {
    if (!isSenderAdmin)
      return api.sendMessage("❌ এডমিন মোড চালাতে হলে গ্রুপ এডমিন হতে হবে!", threadID, messageID);
    if (args[1] === "on") {
      adminMode[threadID] = true;
      writeJSON(adminModeFile, adminMode);
      return api.sendMessage("🔒 এডমিন মোড চালু হয়েছে।", threadID);
    } else if (args[1] === "off") {
      adminMode[threadID] = false;
      writeJSON(adminModeFile, adminMode);
      return api.sendMessage("🔓 এডমিন মোড বন্ধ করা হলো।", threadID);
    }
    return api.sendMessage("📌 কমান্ড:\n/vut admin on\n/vut admin off", threadID);
  }

  if (isAdminOnly && !isSenderAdmin)
    return api.sendMessage("🚫 এই কমান্ড এখন শুধুমাত্র এডমিনদের জন্য!", threadID, messageID);

  let status = readJSON(dataFile);
  if (!status[threadID]) status[threadID] = [];

  if (args[0] === "off") {
    delete status[threadID];
    writeJSON(dataFile, status);
    return api.sendMessage("❌ ভূতের মোড বন্ধ করা হয়েছে।", threadID);
  }

  if (!mentions.length)
    return api.sendMessage("⚠️ যাকে আতঙ্ক দিতে চান তাকে মেনশন করুন!", threadID, messageID);

  const added = [];
  mentions.forEach(uid => {
    if (!status[threadID].includes(uid)) { status[threadID].push(uid); added.push(uid); }
  });
  writeJSON(dataFile, status);

  if (!added.length)
    return api.sendMessage("ℹ️ মেনশন করা ইউজার আগেই ভূতের আতঙ্কে আছে!", threadID, messageID);

  return api.sendMessage(`✅ ভূতের আতঙ্ক মোড চালু!\nমেনশন করা ইউজার কিছু বললেই ভূতের বার্তা পাবে!\n\n${creditTag}`, threadID);
};
