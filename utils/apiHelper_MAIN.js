/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  BELAL BOTX666 — Ultimate API Helper v10.0                    ║
 * ║  ✅ 8-UA rotation          ✅ Per-domain rate limit            ║
 * ║  ✅ Auto retry (2s→5s→12s) ✅ Jitter delay                    ║
 * ║  ✅ baseApiUrl 30min cache ✅ 3-source fallback                ║
 * ║  ✅ downloadToTmp + cleanTmp ✅ Stream + Race                  ║
 * ║  ✅ GROQ/Gemini key rotation ✅ Facebook domain skip           ║
 * ║  ✅ 1000+ command ready    ✅ GitHub Actions optimized         ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

// ─── User-Agent Pool (8টা) ──────────────────────────────────────────────────
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.82 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.82 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
];
let _uaIdx = 0;
const getUA = () => UA_POOL[_uaIdx++ % UA_POOL.length];

// ─── Jitter delay ────────────────────────────────────────────────────────────
const jitter = (base = 0) => new Promise(r => setTimeout(r, base + Math.random() * 500));

// ─── Facebook domains — retry/UA করা যাবে না ────────────────────────────────
const FB_DOMAINS = ["facebook.com","fbcdn.net","messenger.com","fb.com","fbsbx.com","fbcdn.com"];
const isFB = url => FB_DOMAINS.some(d => String(url).includes(d));

// ─── Per-domain rate limiter ─────────────────────────────────────────────────
const _domainHits = new Map();
function getDomain(url) { try { return new URL(url).hostname; } catch { return "unknown"; } }
function rateCheck(url) {
  const d    = getDomain(url);
  const now  = Date.now();
  const hits = (_domainHits.get(d) || []).filter(t => now - t < 10000);
  _domainHits.set(d, [...hits, now]);
  return hits.length < 20; // 10sec এ max 20 req per domain
}

// ─── baseApiUrl Cache ─────────────────────────────────────────────────────────
const BASE_SOURCES = [
  "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json",
  "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
  "https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json",
];
let _cachedBase = null, _cacheTime = 0;
const BASE_TTL  = 30 * 60 * 1000;

async function getBaseApi() {
  if (_cachedBase && Date.now() - _cacheTime < BASE_TTL) return _cachedBase;
  for (const src of BASE_SOURCES) {
    try {
      const r    = await axios.get(src, { timeout: 8000, headers: { "User-Agent": getUA() } });
      const base = r.data?.api || r.data?.baseApi || r.data?.url;
      if (base) { _cachedBase = base; _cacheTime = Date.now(); return _cachedBase; }
    } catch {}
  }
  return _cachedBase || null;
}

// ─── Core safe request ───────────────────────────────────────────────────────
async function safeRequest(method, url, data, opts = {}, maxRetry = 3) {
  if (!rateCheck(url)) await jitter(1000);
  const skipUA = isFB(url);

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      if (attempt > 1) await jitter(attempt * 500);
      const config = {
        method, url,
        timeout: opts.timeout || 30000,
        headers: {
          ...(!skipUA ? { "User-Agent": getUA(), "Accept-Language": "en-US,en;q=0.9" } : {}),
          "Accept": "application/json, text/plain, */*",
          ...opts.headers,
        },
        maxRedirects: opts.maxRedirects || 8,
        ...opts,
      };
      if (data) config.data = data;
      return await axios(config);
    } catch (err) {
      const status   = err.response?.status;
      const retryable = !err.response || status === 429 || status === 502 || status === 503 || status === 504;
      if (attempt < maxRetry && retryable && !skipUA) {
        const delays = [2000, 5000, 12000];
        await new Promise(r => setTimeout(r, (delays[attempt-1] || 12000) + Math.random() * 1000));
        continue;
      }
      throw err;
    }
  }
}

const safeGet  = (url, opts, retry)       => safeRequest("GET",  url, null, opts, retry);
const safePost = (url, data, opts, retry) => safeRequest("POST", url, data, opts, retry);

// ─── Stream download ─────────────────────────────────────────────────────────
async function safeStream(url, filename, opts = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) await jitter(attempt * 300);
      const res = await axios({
        method: "GET", url,
        responseType: "stream",
        timeout: opts.timeout || 35000,
        maxRedirects: 8,
        headers: {
          "User-Agent": getUA(),
          "Referer":    opts.referer || "https://www.google.com/",
          "Accept":     "video/mp4,video/*;q=0.9,*/*;q=0.8",
          ...opts.headers,
        },
      });
      if (filename) res.data.path = filename;
      return res.data;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

// ─── Race stream (fastest CDN) ───────────────────────────────────────────────
async function raceStream(urls, filename) {
  try {
    return await Promise.any(
      urls.map(url => safeStream(url, filename).then(s => { if (!s) throw new Error("null"); return s; }))
    );
  } catch { throw new Error("সব stream source ব্যর্থ"); }
}

// ─── Download to tmp file ─────────────────────────────────────────────────────
async function downloadToTmp(url, filename) {
  const tmpDir  = path.join(process.cwd(), "tmp");
  await fs.ensureDir(tmpDir);
  const tmpFile = path.join(tmpDir, filename || `dl_${Date.now()}.mp4`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 2000));
      const res = await axios({
        method: "GET", url,
        responseType: "stream",
        timeout: 40000,
        maxRedirects: 8,
        headers: {
          "User-Agent": getUA(),
          "Referer":    "https://www.google.com/",
          "Accept":     "*/*",
        },
      });
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(tmpFile);
        res.data.pipe(ws);
        ws.on("finish", resolve);
        ws.on("error", reject);
      });
      // Verify file has content
      const stat = fs.statSync(tmpFile);
      if (stat.size < 100) throw new Error("File too small, probably failed");
      return tmpFile;
    } catch (e) {
      if (attempt === 3) throw e;
    }
  }
}

// ─── Auto-cleanup tmp file ────────────────────────────────────────────────────
function cleanTmp(filePath, delayMs = 10000) {
  if (!filePath) return;
  setTimeout(() => fs.remove(filePath).catch(() => {}), delayMs);
}

// ─── Batch download (parallel, fastest) ──────────────────────────────────────
async function batchDownload(urls, folder) {
  await fs.ensureDir(folder || path.join(process.cwd(), "tmp"));
  return Promise.allSettled(
    urls.map((url, i) =>
      downloadToTmp(url, `batch_${i}_${Date.now()}.mp4`)
        .catch(() => null)
    )
  ).then(results => results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value));
}

// ─── TikTok video fetch (multi-source) ───────────────────────────────────────
async function fetchTikTok(query, count = 20) {
  const SOURCES = [
    `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=${count}`,
    `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=${count}`,
    `https://api.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=${count}`,
  ];
  for (const url of SOURCES) {
    try {
      const r = await safeGet(url, { timeout: 12000 });
      const videos = r?.data?.data?.videos?.filter(v => v.play);
      if (videos?.length) return videos;
    } catch {}
  }
  return [];
}

// ─── Image upload (multi-source) ─────────────────────────────────────────────
async function uploadFile(filePath) {
  const FormData = require("form-data");

  // catbox.moe
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));
    const r = await axios.post("https://catbox.moe/user/api.php", form,
      { headers: { ...form.getHeaders() }, timeout: 30000 });
    if (r?.data?.startsWith("https://")) return r.data.trim();
  } catch {}

  // 0x0.st
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    const r = await axios.post("https://0x0.st", form,
      { headers: { ...form.getHeaders() }, timeout: 30000 });
    if (r?.data?.startsWith("https://")) return r.data.trim();
  } catch {}

  // litterbox
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", "72h");
    form.append("fileToUpload", fs.createReadStream(filePath));
    const r = await axios.post("https://litterbox.catbox.moe/resources/internals/api.php", form,
      { headers: { ...form.getHeaders() }, timeout: 30000 });
    if (r?.data?.startsWith("https://")) return r.data.trim();
  } catch {}

  throw new Error("সব upload source ব্যর্থ");
}

// ─── GROQ key rotation ────────────────────────────────────────────────────────
const _groqIdx = { i: 0 };
function getGroqKey() {
  try {
    const k    = JSON.parse(fs.readFileSync(path.join(process.cwd(), "keys.json"), "utf8"));
    const pool = [k.GROQ_KEY, k.GROQ_KEY2, k.GROQ_KEY3, k.GROQ_KEY4].filter(Boolean);
    return pool.length ? pool[_groqIdx.i++ % pool.length] : (global.config?.APIKEYS?.GROQ || process.env.GROQ_KEY || "");
  } catch { return global.config?.APIKEYS?.GROQ || process.env.GROQ_KEY || ""; }
}

// ─── Gemini key rotation ──────────────────────────────────────────────────────
const _gemIdx = { i: 0 };
function getGeminiKey() {
  try {
    const k    = JSON.parse(fs.readFileSync(path.join(process.cwd(), "keys.json"), "utf8"));
    const pool = [k.GEMINI_KEY, k.GEMINI_KEY2, k.GEMINI_KEY3, k.GEMINI_KEY4].filter(Boolean);
    return pool.length ? pool[_gemIdx.i++ % pool.length] : (global.config?.APIKEYS?.GEMINI || process.env.GEMINI_KEY || "");
  } catch { return global.config?.APIKEYS?.GEMINI || process.env.GEMINI_KEY || ""; }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // Core
  getUA, jitter, isFB,
  // HTTP
  safeGet, safePost, safeRequest,
  // Stream
  safeStream, raceStream,
  // File
  downloadToTmp, cleanTmp, batchDownload, uploadFile,
  // API helpers
  getBaseApi, fetchTikTok,
  // Key rotation
  getGroqKey, getGeminiKey,
};
