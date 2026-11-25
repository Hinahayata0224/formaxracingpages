#!/usr/bin/env node
/**
 * 添加/移除赞助商，直接改 data/sponsors.json
 *
 * 用法：
 *   node tools/add-sponsor.mjs --tier silver --name "某某科技" --img image/sponsor/silver/某某科技.png
 *   node tools/add-sponsor.mjs --tier silver --name "某某科技" --img ... --url "https://mp.weixin.qq.com/s/xxxx"
 *   node tools/add-sponsor.mjs --tier gold --name "某某科技" --img ... --no-size   # 不自动读尺寸
 *   node tools/add-sponsor.mjs --remove --tier silver --name "某某科技"
 *
 * tier：diamond / gold / silver
 * 图片尺寸会自动从 PNG / JPEG 文件头读取，写进 width/height，避免渲染时抖动。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'sponsors.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[k] = true;
    else { out[k] = next; i++; }
  }
  return out;
}

function imageSize(abs) {
  const buf = fs.readFileSync(abs);
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

const args = parseArgs(process.argv.slice(2));
const tierKey = String(args.tier || '').toLowerCase();
if (!['diamond', 'gold', 'silver'].includes(tierKey)) {
  console.error('请用 --tier diamond|gold|silver');
  process.exit(1);
}
if (!args.name) { console.error('缺少 --name'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const tier = (data.tiers || []).find((t) => t.key === tierKey);
if (!tier) { console.error('data/sponsors.json 里找不到 tier: ' + tierKey); process.exit(1); }

const idx = tier.items.findIndex((s) => s.name === args.name);

if (args.remove) {
  if (idx < 0) { console.log('没有找到：' + args.name); process.exit(0); }
  tier.items.splice(idx, 1);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`已移除 ${args.name}（${tierKey} 现有 ${tier.items.length} 个）`);
  process.exit(0);
}

if (!args.img) { console.error('缺少 --img（相对仓库根目录的路径）'); process.exit(1); }
const rel = String(args.img).replace(/\\/g, '/');
const abs = path.join(ROOT, rel);
if (!fs.existsSync(abs)) { console.error('图片不存在：' + rel); process.exit(1); }

const entry = { name: String(args.name), img: rel, url: args.url ? String(args.url) : '' };
if (!args['no-size']) {
  const size = imageSize(abs);
  if (size) { entry.width = size.width; entry.height = size.height; }
}

if (idx >= 0) tier.items[idx] = entry;
else tier.items.push(entry);

data.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`${idx >= 0 ? '已更新' : '已添加'} ${entry.name} → ${tierKey}（该级共 ${tier.items.length} 个）` + (entry.width ? `，${entry.width}×${entry.height}` : ''));
