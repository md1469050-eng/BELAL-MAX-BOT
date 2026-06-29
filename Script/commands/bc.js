"use strict";
const fs     = require("fs-extra");
const axios  = require("axios");
let Canvas;
try { Canvas = require("canvas"); } catch {}
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

const WIN_RATE = 30, MIN_BET = 100;
const FACES    = ["bau","cua","tom","ca","nai","ga"];
const IMGS     = {
  bau:"https://i.postimg.cc/SR3qy939/bau.png", cua:"https://i.postimg.cc/0jbPRnWx/cua.png",
  tom:"https://i.postimg.cc/tCnpBrnN/tom.png", ca:"https://i.postimg.cc/BnWskxx9/ca.png",
  nai:"https://i.postimg.cc/05B9dgjN/nai.png", ga:"https://i.postimg.cc/Kz9xHw5J/ga.png",
};

module.exports.config = {
  name: "bc", version: "3.0.0", hasPermssion: 0,
  credits: "BELAL BOTX666", description: "🎰 বউ-কুয়া ক্যাসিনো গেম",
  commandCategory: "Game", usages: "bc [bau/cua/tom/ca/nai/ga] [টাকা]", cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Currencies }) {
  const { threadID, messageID, senderID } = event;
  const sig = "\n┄┉❈চাঁদের~পাহাড়🪬❈┉┄";

  if (args.length < 2) return api.sendMessage(
`«━━━◤ 🎰 BAU-CUA CASINO ◢━━━»
⚠️ ব্যবহার: bc [নাম] [টাকা]
📝 উদা: bc bau 500
🎯 অপশন: bau cua tom ca nai ga${sig}`, threadID, messageID);

  const choice = args[0].toLowerCase();
  const bet    = parseInt(args[1]);
  if (!FACES.includes(choice)) return api.sendMessage(`❌ ভুল নাম! পছন্দ: ${FACES.join(", ")}`, threadID, messageID);

  const userData = await Currencies.getData(senderID);
  if (isNaN(bet) || bet < MIN_BET) return api.sendMessage(`❌ সর্বনিম্ন বেট ${MIN_BET}$`, threadID, messageID);
  if (bet > userData.money) return api.sendMessage(`❌ ব্যালেন্স কম! তোমার কাছে: ${userData.money}$`, threadID, messageID);

  const luck   = Math.floor(Math.random() * 100) + 1;
  const pool   = luck > WIN_RATE ? FACES.filter(f => f !== choice) : [...FACES];
  const result = [0,1,2].map(() => pool[Math.floor(Math.random() * pool.length)]);
  const count  = result.filter(f => f === choice).length;
  const cachePath = `${process.cwd()}/tmp/bc_${senderID}.png`;
  await fs.ensureDir(`${process.cwd()}/tmp`);

  try {
    const [bgBuf, ...diceBufs] = await Promise.all([
      axios.get("https://i.postimg.cc/9fcVVWSb/background.png", { responseType:"arraybuffer", timeout:8000, headers:{"User-Agent":getUA()} }).then(r=>r.data).catch(()=>null),
      ...result.map(f => axios.get(IMGS[f], { responseType:"arraybuffer", timeout:8000, headers:{"User-Agent":getUA()} }).then(r=>r.data)),
    ]);

    const canvas = Canvas.createCanvas(1200, 900);
    const ctx    = canvas.getContext("2d");
    if (bgBuf) ctx.drawImage(await Canvas.loadImage(bgBuf), 0,0,1200,900);
    else { ctx.fillStyle="#1a0a00"; ctx.fillRect(0,0,1200,900); }

    const pos = [[250,129],[612,134],[480,344]];
    for (let i=0; i<3; i++) {
      if (diceBufs[i]) ctx.drawImage(await Canvas.loadImage(diceBufs[i]), pos[i][0], pos[i][1], 370, 370);
    }
    fs.writeFileSync(cachePath, canvas.toBuffer("image/png"));

    let body;
    if (count === 0) {
      await Currencies.decreaseMoney(senderID, bet);
      body = `«━━━◤ 🎰 CASINO RESULT ◢━━━»\n💔 LOSE — তুমি হেরেছো!\n🎲 ফলাফল: ${result.join(" | ")}\n📉 হারিয়েছো: -${bet}$\n💰 ব্যালেন্স: ${userData.money - bet}$${sig}`;
    } else {
      const win = bet * count;
      await Currencies.increaseMoney(senderID, win);
      body = `«━━━◤ 🎰 CASINO RESULT ◢━━━»\n🎉 WINNER — তুমি জিতেছো!\n🎲 ফলাফল: ${result.join(" | ")}\n✅ ${count}টি ${choice} পেয়েছো!\n💰 বোনাস: +${win}$${sig}`;
    }

    return api.sendMessage({ body, attachment: fs.createReadStream(cachePath) }, threadID,
      () => fs.remove(cachePath).catch(()=>{}), messageID);
  } catch {
    fs.remove(cachePath).catch(()=>{});
    return api.sendMessage("❌ গেম লোড করতে সমস্যা! আবার চেষ্টা করুন।", threadID, messageID);
  }
};
