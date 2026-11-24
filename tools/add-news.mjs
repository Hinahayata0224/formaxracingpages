#!/usr/bin/env node
// 追加一条公众号推文到 data/news.json
//
// 用法：
//   node tools/add-news.mjs --title "回顾｜..." --url "https://mp.weixin.qq.com/s/xxxx"
//   node tools/add-news.mjs --title "..." --url "..." --date 2026-11-20 --tag 活动 --title-en "Recap | ..."
//
// 说明：
//   --date 省略时用今天；同一条 url 已存在时会覆盖而不是重复添加。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'news.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { out[key] = true; continue; }
    out[key] = next;
    i++;
  }
  return out;
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const args = parseArgs(process.argv.slice(2));
if (!args.title || !args.url) {
  console.error([
    '缺少参数。示例：',
    '  node tools/add-news.mjs --title "回顾｜新车发布" --url "https://mp.weixin.qq.com/s/xxxxxxxx" --tag 新车',
    '',
    '可选参数：--date YYYY-MM-DD  --title-en "..."  --tag-en "..."',
  ].join('\n'));
  process.exit(1);
}

const date = args.date === undefined ? today() : String(args.date);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`日期格式应为 YYYY-MM-DD，收到：${date}`);
  process.exit(1);
}

const url = String(args.url).trim();
if (!/^https:\/\/mp\.weixin\.qq\.com\/s[\w?=&%.\-/]*$/.test(url)) {
  console.error('链接应为公众号文章地址（https://mp.weixin.qq.com/s/...）');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
data.items = Array.isArray(data.items) ? data.items : [];

const item = { date, title: String(args.title).trim(), url };
if (args.tag) item.tag = String(args.tag).trim();
if (args['title-en']) item.title_en = String(args['title-en']).trim();
if (args['tag-en']) item.tag_en = String(args['tag-en']).trim();

const before = data.items.length;
data.items = data.items.filter((it) => it.url !== url);
data.items.unshift(item);
data.items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
data.updated = today();

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`${before === data.items.length ? '已覆盖' : '已添加'}：${date}  ${item.title}`);
console.log(`当前共 ${data.items.length} 条，写入 data/news.json`);
