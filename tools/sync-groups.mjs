#!/usr/bin/env node
/**
 * 团队分组卡片链接同步：公众号「招新」合集 → data/groups.json
 *
 * 用法：
 *   node tools/sync-groups.mjs            # 抓合集，更新各组链接
 *   node tools/sync-groups.mjs --dry-run  # 只看不写
 *
 * 说明：
 *   - 页面上的 8 张分组卡片带 data-group="elec|aero|chassis|driverless|marketing|secretary|qc|driver"
 *   - js/groups.js 在页面加载时读 data/groups.json 覆盖卡片链接
 *   - 合集里没有的组保持原链接不变
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'groups.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'wechat.json');
const ALBUM = '3425816951120019456'; // 招新合集
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const args = process.argv.slice(2).reduce((acc, a) => {
  if (a.startsWith('--')) acc[a.slice(2)] = true;
  return acc;
}, {});

const GROUP_NAMES = {
  elec: '电气系统组',
  aero: '车身空力组',
  chassis: '底盘组',
  driverless: '无人系统组',
  marketing: '市场部',
  secretary: '秘书部',
  qc: '质管部',
  driver: '车手部',
};

const fmtDate = (ts) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Number(ts) * 1000));

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
  console.log(`招新合集返回 ${list.length} 篇`);

  const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { items: {} };
  const items = data.items || {};

  let changed = 0;
  const found = new Set();
  for (const raw of list) {
    const title = String(raw.title || '').replace(/&amp;/g, '&').trim();
    // 招新｜电气系统组 / 招新丨电气系统组
    const name = title.replace(/^招新\s*[丨|｜]\s*/, '').trim();
    const key = Object.keys(GROUP_NAMES).find((k) => GROUP_NAMES[k] === name);
    if (!key) continue;
    found.add(key);
    const url = String(raw.url || '').replace(/^http:/, 'https:').replace(/#rd$/, '');
    const prev = items[key];
    if (!prev || prev.url !== url || prev.title !== title) {
      items[key] = { url, title, date: raw.create_time ? fmtDate(raw.create_time) : '' };
      changed++;
    }
  }

  const missing = Object.keys(GROUP_NAMES).filter((k) => !found.has(k));
  console.log(`匹配到 ${found.size} 个组，更新 ${changed} 条${missing.length ? '；未在合集中找到：' + missing.join(', ') : ''}`);

  if (!changed) { console.log('没有变化'); return; }
  if (args['dry-run']) { console.log('（--dry-run，未写盘）'); return; }

  data.items = items;
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('已写入 data/groups.json');
}

main().catch((err) => { console.error('失败：' + err.message); process.exit(1); });
