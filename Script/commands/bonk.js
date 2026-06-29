"use strict";
const axios = require("axios");
let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require("canvas")); } catch {}
const fs   = require("fs-extra");
const path = require("path");
// ── apiHelper safe loader ──────────────────────────────────────
const _apiHelper = (() => {
  try { return require("../../utils/apiHelper"); } catch {}
  try { return require("../utils/apiHelper"); } catch {}
  return global._apiHelper || global.apiHelper || {};
})();
const { safeGet = async(u,o)=>(await require("axios").get(u,{timeout:30000,...(o||{})})),
        safePost = async(u,d,o)=>(await require("axios").post(u,d,{timeout:30000,...(o||{})})),
        safeStream = async(u,f)=>{ const r=await require("axios")({method:"GET",url:u,responseType:"stream",timeout:30000}); if(f)r.data.path=f; return r.data; },
        downloadToTmp = async(url,filename)=>{
          const fs=require("fs-extra"),path=require("path"),axios=require("axios");
          const dir=path.join(process.cwd(),"tmp"); await fs.ensureDir(dir);
          const out=path.join(dir,filename||("dl_"+Date.now()+".mp4"));
          const r=await axios({method:"GET",url,responseType:"stream",timeout:35000,headers:{"User-Agent":getUA()},maxRedirects:8});
          await new Promise((res,rej)=>{const w=require("fs").createWriteStream(out);r.data.pipe(w);w.on("finish",res);w.on("error",rej);});
          return out;
        },
        cleanTmp = (f,ms=10000)=>setTimeout(()=>require("fs-extra").remove(f).catch(()=>{}),ms),
        getUA = ()=>(_apiHelper.getUA ? _apiHelper.getUA() : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
        getBaseApi = ()=>(_apiHelper.getBaseApi ? _apiHelper.getBaseApi() : null),
        jitter = (b=0)=>new Promise(r=>setTimeout(r,b+Math.random()*800))
      } = _apiHelper;
// ────────────────────────────────────────────────────────────

const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const BOXES = [
  ["╔══『 🪓 BONK 』══╗","╚══════════════════╝"],
  ["«━━◤ 💥 SMASH ◢━━»","«━━━━━━━━━━━━━━━━━━»"],
  ["┏━━『 😤 BONKED 』━━┓","┗━━━━━━━━━━━━━━━━━━━━┛"],
  ["╔▓▓『 🔨 HIT 』▓▓╗","╚▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╝"],
];

async function circleCrop(buf, size) {
  const img    = await loadImage(buf);
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext("2d");
  ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
  ctx.drawImage(img,0,0,size,size);
  return canvas;
}

async function makeImage(one, two) {
  const bg = await loadImage((await axios.get("https://i.postimg.cc/KYJ0VnK0/image0.png", { responseType:"arraybuffer", timeout:10000, headers:{"User-Agent":getUA()} })).data);

  const canvas = createCanvas(640, 480);
  const ctx    = canvas.getContext("2d");
  ctx.drawImage(bg, 0,0,640,480);

  const getAvt = async id => (await axios.get(`https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType:"arraybuffer", timeout:8000, headers:{"User-Agent":getUA()} })).data;

  const [a1, a2] = await Promise.all([getAvt(one), getAvt(two)]);
  const c1 = await circleCrop(a1, 110);
  const c2 = await circleCrop(a2, 90);
  ctx.drawImage(c1, 60, 150);
  ctx.drawImage(c2, 500, 220);

  const outPath = path.join(process.cwd(),"tmp",`bonk_${one}_${two}.png`);
  await fs.ensureDir(path.join(process.cwd(),"tmp"));
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  return outPath;
}

module.exports.config = {
  name: "bonk", version: "2.0.0", hasPermssion: 0,
  credits: "BELAL BOTX666", description: "কাউকে BONK করো!",
  commandCategory: "fun", usages: "bonk [@mention/reply]", cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;
  const [bTop, bBot] = rand(BOXES);
  const sig = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";

  let targetID = messageReply?.senderID || Object.keys(mentions)[0] || (args[0]?.match(/^\d+$/) ? args[0] : null);
  if (!targetID) return api.sendMessage(`${bTop}\n⚠️ mention, reply বা UID দিন!\n${bBot}`, threadID, messageID);

  let targetName = "User";
  try { targetName = await Users.getNameUser(targetID); } catch {}

  api.setMessageReaction("⏳", messageID, ()=>{}, true);

  try {
    const file = await makeImage(senderID, targetID);
    api.sendMessage({
      body: `${bTop}\n🪓 ${targetName} কে BONK করা হলো!\n💥 দাগ থেকে যাবে!\n${bBot}${sig}`,
      attachment: fs.createReadStream(file),
    }, threadID, () => fs.remove(file).catch(()=>{}), messageID);
    api.setMessageReaction("✅", messageID, ()=>{}, true);
  } catch (e) {
    api.setMessageReaction("❌", messageID, ()=>{}, true);
    api.sendMessage("❌ BONK করতে সমস্যা হয়েছে!", threadID, messageID);
  }
};
