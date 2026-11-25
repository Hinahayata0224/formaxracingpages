#!/usr/bin/env node
/**
 * 微信公众号文章抓取工具（无依赖，Node 18+）
 *
 * 两种模式：
 *   1) 单篇：node tools/sync-wechat.mjs --article "https://mp.weixin.qq.com/s/xxxx" [--tag 新车] [--dry-run]
 *      抓标题 / 发布日期 / 封面，追加进 data/news.json
 *   2) 合集：node tools/sync-wechat.mjs --album [--biz MzAw...] [--album-id 3425...] [--tag 动态] [--dry-run]
 *      抓「合集」里的全部文章（合集由公众号后台维护），去重后批量追加
 *
 * 说明：
 *   - 合集接口是公众号页面自带的 JSON 端点，无需登录、无需 cookie：
 *     https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=<biz>&album_id=<id>&f=json
 *   - 只能抓到「被加入该合集」的文章；不带合集的账号抓不到历史列表。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEWS_FILE = path.join(ROOT, 'data', 'news.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'wechat.json');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
function toDateSh(ts) {
  const d = new Date(Number(ts) * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts; // YYYY-MM-DD
}

async function fetchText(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' }, redirect: 'follow' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
  return await resp.text();
}

function decodeHtml(s) {
  return String(s)
    .replace(/\\x26amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\x26/g, '&');
}

/** 从文章 URL 提取稳定去重键：mid + idx，退化为去掉 #rd 的地址 */
function urlKey(url) {
  const u = decodeHtml(url);
  const mid = /[?&]mid=(\d+)/.exec(u);
  const idx = /[?&]idx=(\d+)/.exec(u);
  if (mid && idx) return 'wx:' + mid[1] + ':' + idx[1];
  const sn = /[?&]sn=([0-9a-f]+)/i.exec(u);
  if (sn) return 'wx:sn:' + sn[1];
  return 'url:' + u.replace(/[?&#].*$/, '');
}

async function fetchArticle(url) {
  const html = await fetchText(url);
  const t1 = /var msg_title\s*=\s*'([^']*)'/.exec(html) || /var msg_title\s*=\s*"([^"]*)"/.exec(html);
  const t2 = /<meta[^>]+property="og:title"[^>]+content="([^"]*)"/.exec(html);
  const title = decodeHtml((t1 && t1[1]) || (t2 && t2[1]) || '').replace(/\.html\(false\);?$/, '').trim();
  const ct = /var (?:ct|create_time)\s*=\s*"?(\d{10})"?/.exec(html);
  const img = /<meta[^>]+property="og:image"[^>]+content="([^"]*)"/.exec(html);
  const biz = /__biz=([A-Za-z0-9=+/_-]+)/.exec(html);
  if (!title) throw new Error('未能解析标题，可能被风控拦截');
  return {
    title,
    date: ct ? toDateSh(ct[1]) : '',
    cover: img ? decodeHtml(img[1]) : '',
    biz: biz ? biz[1] : '',
    url,
  };
}

async function fetchAlbum(biz, albumId) {
  const api = `https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=${encodeURIComponent(biz)}&album_id=${encodeURIComponent(albumId)}&f=json`;
  const raw = await fetchText(api);
  let json;
  try { json = JSON.parse(raw); } catch { throw new Error('合集接口未返回 JSON（可能被风控）'); }
  if (json.base_resp && json.base_resp.ret !== 0) throw new Error('合集接口返回 ret=' + json.base_resp.ret);
  const list = (json.getalbum_resp && json.getalbum_resp.article_list) || [];
  return list.map((it) => ({
    title: decodeHtml(it.title || '').trim(),
    date: it.create_time ? toDateSh(it.create_time) : '',
    cover: it.cover_img_1_1 || '',
    url: 'https://mp.weixin.qq.com/s?' + (/[?&](__biz=[^&#]+)/.exec(it.url) || [, ''])[1] +
         '&mid=' + it.msgid + '&idx=' + it.itemidx,
    rawUrl: it.url,
  }));
}

/** 标题里的「栏目丨标题」拆出 tag */
function guessTag(title, fallback) {
  const m = /^(.{2,6})[丨|｜]/.exec(title);
  return m ? m[1] : fallback;
}

function loadNews() {
  const data = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  return { data, items: Array.isArray(data.items) ? data.items : [] };
}

function saveNews(data) {
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(NEWS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args['dry-run'];
  const { data, items } = loadNews();
  const seen = new Set(items.map((i) => urlKey(i.url)));
  const candidates = [];

  if (args.article) {
    const a = await fetchArticle(args.article);
    candidates.push({ ...a, tag: args.tag || guessTag(a.title, '动态') });
  } else if (args.album || args.sync) {
    let biz = args.biz, albumId = args['album-id'], tag = args.tag;
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      biz = biz || cfg.biz;
      albumId = albumId || cfg.albumId;
      tag = tag || cfg.tag;
    }
    if (!biz || !albumId) throw new Error('缺少 __biz 或 album_id（可写在 data/wechat.json）');
    const list = await fetchAlbum(biz, albumId);
    console.log(`合集内共 ${list.length} 篇`);
    for (const it of list) candidates.push({ ...it, tag: tag || guessTag(it.title, '动态') });
  } else {
    console.log(`用法：
  node tools/sync-wechat.mjs --article "https://mp.weixin.qq.com/s/xxxx" [--tag 新车] [--dry-run]
  node tools/sync-wechat.mjs --album [--biz MzAw...] [--album-id 3425...] [--tag 动态] [--dry-run]`);
    process.exit(0);
  }

  const fresh = candidates.filter((c) => c.title && !seen.has(urlKey(c.url)));
  console.log(`候选 ${candidates.length} 篇，新增 ${fresh.length} 篇`);
  fresh.forEach((f) => console.log(`  + ${f.date}  ${f.tag}  ${f.title}`));

  if (!fresh.length) return;
  if (dry) { console.log('（--dry-run，未写入）'); return; }

  const merged = fresh.map((f) => ({
    date: f.date,
    title: f.title,
    title_en: '',
    url: f.url,
    tag: f.tag,
    tag_en: '',
  })).concat(items);
  merged.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  data.items = merged;
  saveNews(data);
  console.log(`已写入 ${NEWS_FILE}（共 ${merged.length} 条）`);
}

main().catch((err) => { console.error('失败：' + err.message); process.exit(1); });
