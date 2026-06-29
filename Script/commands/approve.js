"use strict";
const fs     = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
  name: "approve", version: "3.0.0", hasPermssion: 2,
  credits: "BELAL BOTX666", commandCategory: "Admin",
  description: "গ্রুপ অ্যাপ্রুভাল সিস্টেম",
  usages: "approve <tid> <সময়> | approve box", cooldowns: 2,
};

const DATA    = `${process.cwd()}/tmp/thuebot.json`;
const fmtDate = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
const parseDate = s => { const [dd,mm,yy] = s.split("/").map(Number); return new Date(yy, mm-1, dd); };
const sig     = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, messageReply } = event;
  const bdTime = moment.tz("Asia/Dhaka").format("hh:mm A | DD MMM YYYY");
  if (!fs.existsSync(`${__dirname}/data`)) fs.mkdirSync(`${__dirname}/data`, { recursive: true });

  if (messageReply?.body?.includes("APPROVED LIST")) {
    const idx = parseInt(args[0]) - 1;
    if (isNaN(idx)) return api.sendMessage("❌ সিরিয়াল নম্বর দিন।", threadID, messageID);
    let data = JSON.parse(fs.readFileSync(DATA, "utf8"));
    if (idx < 0 || idx >= data.length) return api.sendMessage("❌ ভুল নম্বর!", threadID, messageID);
    const removed = data.splice(idx, 1)[0];
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
    return api.sendMessage(
`«━━━◤ 🗑️ REMOVED ◢━━━»
✅ গ্রুপটি সরানো হয়েছে।
🆔 TID: ${removed.t_id}${sig}`, threadID);
  }

  if (args[0] === "box") {
    if (!fs.existsSync(DATA)) return api.sendMessage("⚠️ কোনো অ্যাপ্রুভ করা গ্রুপ নেই!", threadID);
    const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
    if (!data.length) return api.sendMessage("⚠️ লিস্ট ফাঁকা!", threadID);

    let msg = `«━━━◤ ✨ APPROVED LIST ◢━━━»\n📊 মোট: ${data.length} গ্রুপ\n━━━━━━━━━━━━━━━━━━\n`;
    data.forEach((g, i) => {
      const remain = Math.max(0, Math.ceil((parseDate(g.time_end) - new Date()) / 86400000));
      const bar    = "▓".repeat(Math.min(10, Math.ceil(remain/3))) + "░".repeat(Math.max(0, 10-Math.ceil(remain/3)));
      msg += `[${i+1}] 🆔 ${g.t_id}\n📅 মেয়াদ: ${g.time_end} | ⏳ ${remain}d\n${bar}\n━━━━━━━━━━━━━━━━━━\n`;
    });
    msg += `💡 নম্বর reply দিলে remove হবে।\n⏰ ${bdTime}${sig}`;
    return api.sendMessage(msg, threadID);
  }

  if (args.length < 2) return api.sendMessage("⚠️ ব্যবহার: approve <TID> <সময়>\nউদা: approve 123456 30day", threadID, messageID);

  const tid   = args[0];
  const match = args[1].toLowerCase().match(/^(\d+)(day|month|year)$/);
  if (!match) return api.sendMessage("❌ ফরম্যাট ভুল! উদা: 7day, 1month, 1year", threadID, messageID);

  const num = parseInt(match[1]), unit = match[2];
  const start = new Date(), end = new Date();
  if (unit === "day")   end.setDate(end.getDate() + num);
  if (unit === "month") end.setMonth(end.getMonth() + num);
  if (unit === "year")  end.setFullYear(end.getFullYear() + num);

  let data = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, "utf8")) : [];
  if (data.find(e => e.t_id === tid)) return api.sendMessage("⚠️ এই গ্রুপ অলরেডি লিস্টে আছে!", threadID, messageID);

  data.push({ t_id: tid, user: "Everyone", time_start: fmtDate(start), time_end: fmtDate(end) });
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));

  return api.sendMessage(
`«━━━◤ ✅ APPROVED ◢━━━»
━━━━━━━━━━━━━━━━━━
🆔 TID    » ${tid}
📅 শুরু   » ${fmtDate(start)}
📅 শেষ    » ${fmtDate(end)}
⏳ মেয়াদ  » ${num} ${unit}
🌟 Status » Premium ✅
━━━━━━━━━━━━━━━━━━
⏰ ${bdTime}${sig}`, threadID, messageID);
};
