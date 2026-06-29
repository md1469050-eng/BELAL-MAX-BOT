"use strict";
const fs     = require("fs-extra");
const path   = require("path");
let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require("canvas")); } catch {}
const axios  = require("axios");
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

const balanceFile = path.join(process.cwd(), "tmp", "coinxbalance.json");
if (!fs.existsSync(balanceFile)) fs.writeFileSync(balanceFile, JSON.stringify({}, null, 2));

function getBalance(uid) {
  try {
    const d = JSON.parse(fs.readFileSync(balanceFile));
    return d[uid]?.balance ?? (uid === "100056725134303" ? 10000 : 100);
  } catch { return 100; }
}
function setBalance(uid, bal) {
  try { const d = JSON.parse(fs.readFileSync(balanceFile)); d[uid] = { balance: bal }; fs.writeFileSync(balanceFile, JSON.stringify(d, null, 2)); } catch {}
}
function fmt(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2).replace(/\.00$/,"")+"T$";
  if (n >= 1e9)  return (n/1e9).toFixed(2).replace(/\.00$/,"")+"B$";
  if (n >= 1e6)  return (n/1e6).toFixed(2).replace(/\.00$/,"")+"M$";
  if (n >= 1e3)  return (n/1e3).toFixed(2).replace(/\.00$/,"")+"k$";
  return n.toLocaleString()+"$";
}
function parse(s) {
  s = s.toLowerCase().replace(/\s+/g,"");
  const m = s.match(/^([\d.]+)([kmbt]?)$/);
  if (!m) return NaN;
  let n = parseFloat(m[1]);
  if (m[2]==="k") n*=1e3; if (m[2]==="m") n*=1e6;
  if (m[2]==="b") n*=1e9; if (m[2]==="t") n*=1e12;
  return Math.floor(n);
}

const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const BOXES = [
  ["╔══『 🎰 BELAL CASINO 』══╗","╚══════════════════════════╝"],
  ["┏━━『 🎲 GOAT CASINO 』━━┓","┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛"],
  ["«━━◤ 🃏 LUCKY SPIN ◢━━»","«━━━━━━━━━━━━━━━━━━━━━━━━━»"],
  ["╔▓▓▓『 💎 VIP CASINO 』▓▓▓╗","╚▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╝"],
];

module.exports.config = {
  name: "bet", version: "3.0.0", hasPermssion: 0,
  credits: "BELAL BOTX666", description: "Neon casino style betting",
  commandCategory: "game", usages: "bet [amount]", cooldowns: 10,
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { senderID, threadID, messageID } = event;
  const sig  = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";
  const [bTop, bBot] = rand(BOXES);

  try {
    const balance = getBalance(senderID);
    if (!args[0]) return api.sendMessage(`${bTop}\n🎰 বাজি ধরতে amount লিখুন।\nউদা: /bet 1k বা /bet 500\n${bBot}`, threadID, messageID);

    const bet = parse(args[0]);
    if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ অকার্যকর amount!", threadID, messageID);
    if (bet > balance) return api.sendMessage(`${bTop}\n❌ ব্যালেন্স কম!\n💰 তোমার: ${fmt(balance)}\n${bBot}`, threadID, messageID);

    const mults = [2,3,5,10];
    const mult  = rand(mults);
    const win   = Math.random() < 0.4;
    let newBal  = balance, profit = 0, resultText = "";

    if (win) { profit = bet * mult; newBal += profit; resultText = `JACKPOT! ${mult}x`; }
    else { newBal -= bet; resultText = "YOU LOST"; }
    setBalance(senderID, newBal);

    const userName  = await Users.getNameUser(senderID);
    const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    let avatar = null;
    try { avatar = await loadImage((await axios.get(avatarUrl, { responseType:"arraybuffer", timeout:6000, headers:{"User-Agent":getUA()} })).data); } catch {}

    const W = 900, H = 550;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,"#0d0221"); bg.addColorStop(1,"#261447");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    ctx.strokeStyle = win ? "#00ffea" : "#ff0055"; ctx.lineWidth = 10;
    ctx.strokeRect(20,20,W-40,H-40);

    ctx.font = "bold 70px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc00"; ctx.shadowColor = "#ffae00"; ctx.shadowBlur = 15;
    ctx.fillText("BELAL CASINO 🪬", W/2, 100); ctx.shadowBlur = 0;

    if (avatar) {
      ctx.save(); ctx.beginPath(); ctx.arc(150,250,80,0,Math.PI*2); ctx.clip();
      ctx.drawImage(avatar,70,170,160,160); ctx.restore();
      ctx.strokeStyle="#fff"; ctx.lineWidth=4; ctx.stroke();
    }

    ctx.textAlign = "left"; ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#fff"; ctx.fillText(userName.slice(0,15), 260, 230);
    ctx.font = "30px Arial"; ctx.fillStyle = "#00ffea";
    ctx.fillText(`Bet: ${fmt(bet)}`, 260, 280);

    ctx.fillStyle = win ? "rgba(0,255,234,.1)" : "rgba(255,0,85,.1)";
    ctx.fillRect(260,320,580,160);

    ctx.font = "bold 65px Arial"; ctx.fillStyle = win ? "#00ffea" : "#ff0055";
    ctx.textAlign = "center"; ctx.shadowBlur = 10;
    ctx.shadowColor = win ? "#00ffea" : "#ff0055";
    ctx.fillText(resultText, 550, 400);

    ctx.font = "35px Arial"; ctx.fillStyle = win ? "#ffd700" : "#fff"; ctx.shadowBlur = 0;
    ctx.fillText(win ? `Profit: +${fmt(profit)}` : `Loss: -${fmt(bet)}`, 550, 450);

    ctx.font = "bold 32px Arial"; ctx.fillStyle = "#fff";
    ctx.fillText(`NEW BALANCE: ${fmt(newBal)}`, W/2, 515);

    const cachePath = path.join(process.cwd(), "tmp", `bet_${senderID}.png`);
    await fs.ensureDir(path.join(process.cwd(),"tmp"));
    fs.writeFileSync(cachePath, canvas.toBuffer());

    return api.sendMessage({
      body: `${bTop}\n${win ? `🎉 JACKPOT! ${mult}x প্রফিট করেছো!\n💰 +${fmt(profit)}` : `😔 দুর্ভাগ্য! হারলে।\n💸 -${fmt(bet)}`}\n💼 নতুন ব্যালেন্স: ${fmt(newBal)}\n${bBot}${sig}`,
      attachment: fs.createReadStream(cachePath),
    }, threadID, () => fs.remove(cachePath).catch(()=>{}), messageID);

  } catch (e) {
    console.error("bet:", e.message);
    api.sendMessage("❌ গেমে এরর হয়েছে!", threadID, messageID);
  }
};
