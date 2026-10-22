// Records the launch video's gameplay from the real game, frame by frame.
//
//   node scripts/record.mjs hero play dome docket audio
//   node scripts/record.mjs play --frames 30        (quick smoke test)
//
// Serves the repo root locally, opens /?capture=<scene> in headless Chrome,
// steps the game one frame at a time, and pipes screenshots into FFmpeg.
// Output: public/capture/<scene>.mp4 + <scene>.events.json, public/capture/audio/*.wav
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const VIDEO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME_DIR = resolve(VIDEO_DIR, '..');
const OUT = join(VIDEO_DIR, 'public', 'capture');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 ? Number(args[i + 1]) : fallback;
};
const scenes = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const WIDTH = flag('--w', 1920);
const HEIGHT = flag('--h', 1080);
const FRAME_LIMIT = flag('--frames', Infinity);

function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = resolve(GAME_DIR, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(GAME_DIR) || file.includes(`${GAME_DIR}/video`)) return res.writeHead(404).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function openScene(browser, base, scene) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}/?capture=${scene}&seed=7`);
  await page.waitForFunction(() => window.__capture?.ready, null, { timeout: 60000 });
  return { page, errors };
}

async function recordScene(browser, base, scene) {
  const { page, errors } = await openScene(browser, base, scene);
  const total = Math.min(await page.evaluate(() => window.__capture.frames), FRAME_LIMIT);
  const file = join(OUT, `${scene}.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate(() => window.__capture.step());
    const shot = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ffmpeg.stdin.write(shot)) await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
    if (i % 30 === 0) process.stdout.write(`\r${scene}: ${i}/${total} frames · ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ffmpeg.stdin.end();
  await new Promise((ok, fail) => ffmpeg.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}`)))));
  const events = await page.evaluate(() => window.__capture.events);
  await writeFile(join(OUT, `${scene}.events.json`), `${JSON.stringify(events, null, 1)}\n`);
  await page.close();
  console.log(`\r${scene}: ${total} frames → ${file} (${((Date.now() - started) / 1000).toFixed(0)}s) · ${events.length} events${errors.length ? ` · PAGE ERRORS: ${errors.join(' | ')}` : ''}`);
  if (errors.length) process.exitCode = 1;
}

function wav(pcm16, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm16.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm16.length, 40);
  return Buffer.concat([header, pcm16]);
}

async function recordAudio(browser, base) {
  const { page, errors } = await openScene(browser, base, 'audio');
  await mkdir(join(OUT, 'audio'), { recursive: true });
  const names = await page.evaluate(() => window.__capture.names);
  for (const name of names) {
    const { sampleRate, base64 } = await page.evaluate((n) => window.__capture.renderAudio(n), name);
    await writeFile(join(OUT, 'audio', `${name}.wav`), wav(Buffer.from(base64, 'base64'), sampleRate));
  }
  await page.close();
  console.log(`audio: ${names.length} files → ${join(OUT, 'audio')}${errors.length ? ` · PAGE ERRORS: ${errors.join(' | ')}` : ''}`);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });
try {
  for (const scene of scenes) {
    if (scene === 'audio') await recordAudio(browser, base);
    else await recordScene(browser, base, scene);
  }
} finally {
  await browser.close();
  server.close();
}
