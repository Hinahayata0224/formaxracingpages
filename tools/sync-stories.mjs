#!/usr/bin/env node
/**
 * 人物故事同步：公众号「人物」合集 → data/stories.json
 *
 * 用法：
 *   node tools/sync-stories.mjs            # 抓合集，缺失的追加（会为新增条目抓摘要）
 *   node tools/sync-stories.mjs --dry-run  # 只看不写
 *   node tools/sync-stories.mjs --no-fetch # 不访问文章页，摘要留空
 *
 * 规则：
 *   - 只追加，不删除、不覆盖已有条目（人工写的 excerpt_en / title_en 会保留）
 *   - 去重：标题相同或链接 key 相同视为同一篇
 *   - 摘要取文章页 og:description，拿不到就留空
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'stories.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'wechat.json');
const ALBUM = '3554643453215817739';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const args = process.argv.slice(2).reduce((acc, a) => {
  if (a.startsWith('--')) acc[a.slice(2)] = true;
  return acc;
}, {});

const fmtDate = (ts) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Number(ts) * 1000));

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\\x0a/gi, ' ').replace(/\\x26/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normTitle(t) {
  return decode(t).replace(/\s+/g, '').replace(/[丨|｜]/g, '|');
}

async function fetchArticleSummary(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const html = await resp.text();
  const desc = /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/.exec(html);
  const title = /<meta[^>]+property="og:title"[^>]+content="([^"]*)"/.exec(html);
  return {
    excerpt: desc ? decode(desc[1]) : '',
    title: title ? decode(title[1]) : '',
  };
}

async function main() {
  let biz = 'MzAwNDExMDQ3Mw==';
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg.biz) biz = cfg.biz;
  }

  const api = `https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=${encodeURIComponent(biz)}&album_id=${ALBUM}&f=json`;
  const resp = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const json = await resp.json();
  if (json.base_resp && json.base_resp.ret !== 0) throw new Error('合集接口 ret=' + json.base_resp.ret);
  const list = (json.getalbum_resp && json.getalbum_resp.article_list) || [];
  console.log(`人物合集返回 ${list.length} 篇`);

  const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { items: [] };
  const items = Array.isArray(data.items) ? data.items : [];
  const seenTitles = new Set(items.map((i) => normTitle(i.title)));

  const added = [];
  for (const raw of list) {
    const title = decode(raw.title);
    if (seenTitles.has(normTitle(title))) continue;
    const url = String(raw.url || '').replace(/^http:/, 'https:').replace(/#rd$/, '');
    let excerpt = '';
    if (!args['no-fetch']) {
      try {
        const s = await fetchArticleSummary(url);
        excerpt = s.excerpt;
      } catch (e) {
        console.warn(`  摘要抓取失败（${title}）：${e.message}`);
      }
    }
    added.push({
      date: raw.create_time ? fmtDate(raw.create_time) : '',
      title,
      title_en: '',
      excerpt,
      excerpt_en: '',
      url,
    });
    seenTitles.add(normTitle(title));
  }

  console.log(`新增 ${added.length} 篇`);
  added.forEach((a) => console.log(`  + ${a.date}  ${a.title}${a.excerpt ? '  — ' + a.excerpt.slice(0, 24) : ''}`));

  if (!added.length) return;
  if (args['dry-run']) { console.log('（--dry-run，未写盘）'); return; }

  const merged = added.concat(items).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  data.items = merged;
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`已写入 data/stories.json（共 ${merged.length} 条）`);
}

main().catch((err) => { console.error('失败：' + err.message); process.exit(1); });
