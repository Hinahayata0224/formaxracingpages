#!/usr/bin/env node
// 追加一篇人物故事到 data/stories.json
//
// 用法：
//   node tools/add-story.mjs --title "人物｜..." --url "https://mp.weixin.qq.com/s/xxxx" \
//        --excerpt "一句话摘要" --title-en "Profile | ..." --excerpt-en "One-line summary"
//
// 可选：--date YYYY-MM-DD（默认今天）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'stories.json');

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
    '  node tools/add-story.mjs --title "人物｜..." --url "https://mp.weixin.qq.com/s/xxxxxxxx" \\',
    '       --excerpt "一句话摘要" --title-en "Profile | ..." --excerpt-en "One-line summary"',
    '',
    '可选参数：--date YYYY-MM-DD',
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
if (args.excerpt) item.excerpt = String(args.excerpt).trim();
if (args['title-en']) item.title_en = String(args['title-en']).trim();
if (args['excerpt-en']) item.excerpt_en = String(args['excerpt-en']).trim();

const before = data.items.length;
data.items = data.items.filter((it) => it.url !== url);
data.items.unshift(item);
data.items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
data.updated = today();

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`${before === data.items.length ? '已覆盖' : '已添加'}：${date}  ${item.title}`);
console.log(`当前共 ${data.items.length} 篇，写入 data/stories.json`);
