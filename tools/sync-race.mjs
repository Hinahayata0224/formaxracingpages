#!/usr/bin/env node
/**
 * 赛场动态同步：从公众号「赛场动态」合集抓取文章，按比赛日 × 两辆车写入 data/race-days.json
 *
 * 用法：
 *   node tools/sync-race.mjs                 # 抓取并写回
 *   node tools/sync-race.mjs --dry-run       # 只打印，不写盘
 *   node tools/sync-race.mjs --expect 7      # 假定本届共 7 个比赛日；合集里没有的 DAY 写成「敬请期待」
 *   node tools/sync-race.mjs --no-images     # 不下载封面
 *
 * 规则：
 *   - 已有数据（含手动补的 DAY 6）不会被删除；合集里出现同一天同一辆车时以合集为准
 *   - 某天只有一辆车的文章时，另一辆车写成 null（前端渲染「敬请期待」）
 *   - 封面下载到 image/race/day{N}-{ev|av}.jpg，已存在则跳过
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'data', 'race-days.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'wechat.json');
const IMG_DIR = path.join(ROOT, 'image', 'race');
const DEFAULT_ALBUM = '3561905531105263626';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

const fmtDate = (ts) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Number(ts) * 1000));

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
  const text = await resp.text();
  try { return JSON.parse(text); } catch { throw new Error('接口未返回 JSON（可能被风控）'); }
}

/**
 * 用 cwebp 把 jpg 压成 560px 宽的 webp；成功则删掉 jpg 并返回 webp 路径，失败返回 null
 * （本地 Windows 没有 cwebp 时会走 fallback，保留 jpg）
 */
function toWebp(jpgAbs) {
  const webpAbs = jpgAbs.replace(/\.jpe?g$/i, '.webp');
  const r = spawnSync('cwebp', ['-quiet', '-q', '82', '-resize', '560', '0', jpgAbs, '-o', webpAbs], { stdio: 'ignore' });
  if (r.status === 0 && fs.existsSync(webpAbs)) {
    try { fs.unlinkSync(jpgAbs); } catch {}
    return webpAbs;
  }
  return null;
}

async function download(url, dest) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error('封面 HTTP ' + resp.status);
  fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
}

function normalizeTitle(title) {
  return String(title || '').replace(/&amp;/g, '&').trim();
}

function parseArticle(item) {
  const title = normalizeTitle(item.title);
  const car = /FSEC/i.test(title) ? 'ev' : (/FSAC/i.test(title) ? 'av' : null);
  const dayMatch = /DAY\s*(\d+)/i.exec(title);
  const short = title.replace(/^FS(E|A)C\s*DAY\s*\d+\s*[丨|｜]\s*/i, '').trim();
  return {
    day: dayMatch ? Number(dayMatch[1]) : 0,
    car,
    date: item.create_time ? fmtDate(item.create_time) : '',
    title,
    short,
    cover: (item.cover_img_1_1 || '').replace(/\/(0|300)$/, '/640'),
    url: String(item.url || '').replace(/^http:/, 'https:').replace(/#rd$/, ''),
    key: item.msgid + ':' + item.itemidx,
    msgid: item.msgid,
    itemidx: item.itemidx,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args['dry-run'];
  const noImages = !!args['no-images'];
  const forceImages = !!args['force-images'];
  const requireWebp = !!args['require-webp'];

  let biz = 'MzAwNDExMDQ3Mw==';
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg.biz) biz = cfg.biz;
  }
  const albumId = args.album || DEFAULT_ALBUM;

  const existing = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    : { days: [] };
  const byDate = new Map();
  for (const d of existing.days || []) byDate.set(d.date, { date: d.date, day: d.day || 0, ev: d.ev || null, av: d.av || null });

  const api = `https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=${encodeURIComponent(biz)}&album_id=${albumId}&f=json`;
  const json = await fetchJson(api);
  if (json.base_resp && json.base_resp.ret !== 0) throw new Error('合集接口 ret=' + json.base_resp.ret);
  const list = (json.getalbum_resp && json.getalbum_resp.article_list) || [];
  console.log(`合集返回 ${list.length} 篇`);

  let updated = 0;
  for (const raw of list) {
    const it = parseArticle(raw);
    if (!it.car || !it.day) { console.log('  跳过（无法识别车型/天数）：' + it.title); continue; }
    if (!byDate.has(it.date)) byDate.set(it.date, { date: it.date, day: it.day, ev: null, av: null });
    const day = byDate.get(it.date);
    day.day = Math.max(day.day || 0, it.day);
    const prev = day[it.car];
    if (!prev || prev.key !== it.key || prev.short !== it.short) {
      day[it.car] = { title: it.title, short: it.short, cover: it.cover, url: it.url, key: it.key, date: it.date };
      updated++;
    }
  }
  console.log(`更新/新增 ${updated} 条`);

  // 天数期望：--expect N，默认取现有最大天数
  const days = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const maxDay = Math.max(0, ...days.map((d) => d.day || 0));
  const expect = Number(args.expect || maxDay);
  if (expect > maxDay) {
    // 用最近一天的日期往后推，生成占位日
    const latest = days[0];
    const base = latest ? new Date(latest.date + 'T00:00:00+08:00') : new Date();
    for (let n = maxDay + 1; n <= expect; n++) {
      const d = new Date(base.getTime() + (n - maxDay) * 86400000);
      const date = fmtDate(d.getTime() / 1000);
      if (!byDate.has(date)) {
        byDate.set(date, { date, day: n, ev: null, av: null });
        console.log(`  DAY ${n} 合集暂无文章，写入占位（${date}）`);
      }
    }
  }

  // 封面下载
  const out = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  let downloaded = 0;
  let converted = 0;
  if (!noImages && !dry) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
    for (const d of out) {
      for (const car of ['ev', 'av']) {
        const it = d[car];
        if (!it) continue;
        // 已有 webp 的沿用，不再重复下载 jpg
        const webpRel = `image/race/day${d.day}-${car}.webp`;
        if (!forceImages && fs.existsSync(path.join(ROOT, webpRel))) { it.local = webpRel; continue; }
        if (!it.cover) continue;
        const rel = `image/race/day${d.day}-${car}.jpg`;
        const abs = path.join(ROOT, rel);
        if (forceImages || !fs.existsSync(abs)) {
          try { await download(it.cover, abs); downloaded++; } catch (e) { console.warn(`  封面下载失败 DAY ${d.day} ${car}: ${e.message}`); continue; }
        }
        const webp = toWebp(abs);
        if (webp) {
          converted++;
          it.local = path.relative(ROOT, webp).split(path.sep).join('/');
        } else {
          it.local = rel;
        }
      }
    }
  }
  for (const d of out) {
    for (const car of ['ev', 'av']) {
      const it = d[car];
      if (!it) continue;
      const webpRel = `image/race/day${d.day}-${car}.webp`;
      if (!it.local && fs.existsSync(path.join(ROOT, webpRel))) it.local = webpRel;
    }
  }

  console.log(`下载封面 ${downloaded} 张，转 webp ${converted} 张`);
  for (const d of out) {
    const marks = [];
    if (!d.ev) marks.push('EV 待补');
    if (!d.av) marks.push('AV 待补');
    console.log(`  DAY ${d.day} ${d.date}  ${d.ev ? d.ev.short : '—'}  |  ${d.av ? d.av.short : '—'}${marks.length ? '   (' + marks.join(', ') + ')' : ''}`);
  }

  if (dry) { console.log('（--dry-run，未写盘）'); return; }

  const payload = {
    updated: new Date().toISOString().slice(0, 10),
    source: albumId,
    days: out.map((d) => ({
      date: d.date,
      day: d.day,
      ev: d.ev || null,
      av: d.av || null,
    })),
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('已写入 data/race-days.json（' + out.length + ' 天）');

  if (requireWebp) {
    const leftovers = fs.readdirSync(IMG_DIR).filter((f) => /\.jpe?g$/i.test(f));
    if (leftovers.length) {
      console.error('❌ 仍有未转 webp 的封面：' + leftovers.join(', ') + '（cwebp 是否可用？）');
      process.exit(1);
    }
  }
}

main().catch((err) => { console.error('失败：' + err.message); process.exit(1); });
