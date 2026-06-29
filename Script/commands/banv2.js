"use strict";
const fs  = require("fs-extra");
const sig = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";

module.exports.config = {
  name: "banv2", version: "3.0.0", hasPermssion: 1,
  credits: "BELAL BOTX666", description: "গ্রুপ থেকে সদস্য warn ও ban করো",
  commandCategory: "Admin",
  usages: "banv2 [@tag/reply] [কারণ] | listban | unban [id] | reset | view",
  cooldowns: 5,
};

const DATA = `${process.cwd()}/tmp/banv2_cache/bans.json`;
function loadData() {
  if (!fs.existsSync(DATA)) { fs.ensureDirSync(`${process.cwd()}/tmp/banv2_cache`); fs.writeFileSync(DATA, JSON.stringify({ warns:{}, banned:{} }, null, 2)); }
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function saveData(d) { fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); }

module.exports.run = async function ({ api, args, Users, event }) {
  const { messageID, threadID, senderID } = event;
  const info    = await api.getThreadInfo(threadID);
  const botID   = api.getCurrentUserID();
  const isAdmin = id => info.adminIDs.some(a => a.id == id);

  if (!isAdmin(botID)) return api.sendMessage("❌ বটকে গ্রুপ অ্যাডমিন করুন!", threadID, messageID);

  const bans = loadData();
  if (!bans.warns[threadID])  bans.warns[threadID]  = {};
  if (!bans.banned[threadID]) bans.banned[threadID] = [];

  if (args[0] === "listban") {
    const list = bans.banned[threadID];
    if (!list?.length) return api.sendMessage("✅ কেউ ব্যান হয়নি।", threadID, messageID);
    let msg = `«━━━◤ 🔨 BAN LIST ◢━━━»\n`;
    for (const id of list) {
      const name = await api.getUserInfo(id).then(u => u[id]?.name).catch(() => id);
      msg += `👤 ${name}\n🆔 ${id}\n━━━━━━━━━━━━━━━━━━\n`;
    }
    return api.sendMessage(msg + sig, threadID, messageID);
  }

  if (args[0] === "unban") {
    if (!isAdmin(senderID) && !global.config?.ADMINBOT?.includes(senderID))
      return api.sendMessage("❌ শুধু অ্যাডমিন unban করতে পারবে!", threadID, messageID);
    const id  = parseInt(args[1]);
    const idx = bans.banned[threadID].indexOf(id);
    if (idx === -1) return api.sendMessage("✅ ব্যান তালিকায় নেই।", threadID, messageID);
    bans.banned[threadID].splice(idx, 1);
    delete bans.warns[threadID][id];
    saveData(bans);
    return api.sendMessage(`✅ ${id} কে ব্যান থেকে সরানো হয়েছে।${sig}`, threadID, messageID);
  }

  if (args[0] === "reset") {
    if (!isAdmin(senderID) && !global.config?.ADMINBOT?.includes(senderID))
      return api.sendMessage("❌ শুধু অ্যাডমিন reset করতে পারবে!", threadID, messageID);
    bans.warns[threadID]  = {};
    bans.banned[threadID] = [];
    saveData(bans);
    return api.sendMessage(`✅ সব ডেটা রিসেট হয়েছে।${sig}`, threadID, messageID);
  }

  if (args[0] === "view") {
    const targets = Object.keys(event.mentions).length ? Object.keys(event.mentions) : [senderID];
    let msg = `«━━━◤ 👁️ WARN VIEW ◢━━━»\n`;
    for (const id of targets) {
      const name  = await api.getUserInfo(id).then(u => u[id]?.name).catch(() => id);
      const warns = bans.warns[threadID][id] || [];
      msg += warns.length ? `👤 ${name}: ${warns.length} warn\n📝 ${warns.join(", ")}\n` : `👤 ${name}: কোনো warn নেই ✅\n`;
      msg += "━━━━━━━━━━━━━━━━━━\n";
    }
    return api.sendMessage(msg + sig, threadID, messageID);
  }

  if (!isAdmin(senderID) && !global.config?.ADMINBOT?.includes(senderID))
    return api.sendMessage("❌ শুধু অ্যাডমিন warn দিতে পারবে!", threadID, messageID);

  let targets = [], reason = "কোনো কারণ দেওয়া হয়নি";
  if (event.type === "message_reply") {
    targets = [event.messageReply.senderID];
    reason  = args.join(" ") || reason;
  } else if (Object.keys(event.mentions).length) {
    targets = Object.keys(event.mentions);
    let m   = args.join(" ");
    for (const n of Object.values(event.mentions)) m = m.replace(n, "");
    reason  = m.trim() || reason;
  } else return api.sendMessage("❌ কাউকে tag করো বা reply করো!", threadID, messageID);

  const names = [];
  for (const id of targets) {
    const name = await api.getUserInfo(id).then(u => u[id]?.name).catch(() => id);
    names.push(name);
    if (!bans.warns[threadID][id]) bans.warns[threadID][id] = [];
    bans.warns[threadID][id].push(reason);
    const wc = bans.warns[threadID][id].length;
    if (wc >= 2 && !isAdmin(id)) {
      await api.removeUserFromGroup(parseInt(id), threadID);
      if (!bans.banned[threadID].includes(parseInt(id))) bans.banned[threadID].push(parseInt(id));
    }
  }
  saveData(bans);

  const kicked = targets.filter(id => (bans.warns[threadID][id]?.length >= 2) && !isAdmin(id));
  return api.sendMessage({
    body:
`«━━━◤ ⚠️ WARN SYSTEM ◢━━━»
👤 ${names.join(", ")}
📝 কারণ: ${reason}
⚠️ Warn: ${bans.warns[threadID][targets[0]]?.length || 1}/2
${kicked.length ? "👞 কিক করা হয়েছে!" : "🔔 আরেকটা warn → kick!"}${sig}`,
    mentions: targets.map((id,i) => ({ tag: names[i], id })),
  }, threadID, messageID);
};
