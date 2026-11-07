import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dataset from 'markdown-dataset' with { type: 'json' };
import { chromium } from 'playwright-core';

const viteBin = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
);
const PORT = Number(process.env.PERF_PORT ?? 4176);
const APP_URL = `http://127.0.0.1:${PORT}`;
const CANDIDATE_URLS = [
  `${APP_URL}/dmh-pwa/benchmark.html`,
  `${APP_URL}/benchmark.html`,
];

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const count = Math.max(1, Number(argValue('count', 25)));
const maxChars = Math.max(100_000, Number(argValue('max-chars', 2_000_000)));
const sample = argValue('sample', 'spread');

function decodeDataset() {
  return dataset
    .map((item) =>
      item.markdownEncoding === 'base64'
        ? Buffer.from(item.markdownEncoded, 'base64').toString('utf8')
        : String(item.markdownEncoded ?? ''),
    )
    .filter((text) => text.trim().length > 0);
}

function selectDocs(docs) {
  const sorted = [...docs].sort((a, b) => b.length - a.length);
  const pool =
    sample === 'typical'
      ? sorted.filter((doc) => doc.length >= 5_000 && doc.length <= 50_000)
      : sorted;
  const candidates = pool.length > 0 ? pool : sorted;

  const candidateIndexes = new Set([0]);
  for (let index = 1; index < count; index += 1) {
    candidateIndexes.add(
      Math.min(
        candidates.length - 1,
        Math.floor((index / count) * candidates.length),
      ),
    );
  }

  const selected = [];
  let totalChars = 0;
  for (const index of [...candidateIndexes].sort((a, b) => a - b)) {
    const doc = candidates[index];
    if (!doc) continue;
    if (selected.length > 0 && totalChars + doc.length > maxChars) continue;
    selected.push(doc);
    totalChars += doc.length;
    if (selected.length >= count) break;
  }
  return {
    selected,
    totalChars,
    largestChars: sorted[0]?.length ?? 0,
    largestDoc: sorted[0] ?? '',
  };
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const url of CANDIDATE_URLS) {
      try {
        const response = await fetch(url);
        if (response.ok) return url;
      } catch {
        // Keep polling until Vite is ready.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite dev server did not start in time.');
}

function startVite() {
  const child = spawn(
    process.execPath,
    [viteBin, '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

function printResults(payload) {
  console.log('\nMarkdown rendering benchmark');
  console.log(
    `Docs: ${payload.docs.count}, total chars: ${payload.docs.totalChars.toLocaleString()}, largest: ${payload.docs.largestChars.toLocaleString()}`,
  );
  console.log('');
  const rows = payload.results.map((result) => ({
    Scenario: result.name,
    'Total ms': result.ms,
    Docs: result.docs ?? '',
    Chars: result.chars?.toLocaleString() ?? '',
    'Ms/doc': result.perDocMs ?? '',
  }));
  console.table(rows);
  console.log('\nJSON:\n' + JSON.stringify(payload, null, 2));
}

async function main() {
  const docs = decodeDataset();
  if (docs.length === 0) throw new Error('markdown-dataset is empty.');
  const selected = selectDocs(docs);
  console.log(
    `Selected ${selected.selected.length}/${docs.length} dataset documents (${selected.totalChars.toLocaleString()} chars, sample=${sample}).`,
  );
  console.log(
    `Largest dataset document: ${selected.largestChars.toLocaleString()} chars.`,
  );

  const server = startVite();
  let browser;
  try {
    const url = await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.addInitScript(
      (payload) => {
        window.__markdownPerfDocs__ = payload.docs;
        window.__markdownPerfLargest__ = payload.largest;
      },
      { docs: selected.selected, largest: selected.largestDoc },
    );
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.__markdownPerfResults__),
      null,
      { timeout: 180_000 },
    );
    const payload = await page.evaluate(() => window.__markdownPerfResults__);
    printResults(payload);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
