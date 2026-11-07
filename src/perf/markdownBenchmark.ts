import { Crepe } from '@milkdown/crepe';
import { nextTick } from 'vue';
import { parseMarkdown } from '@/utils/markdownParser';
import {
  renderMarkdownToHtml,
  warmupStaticRenderer,
} from '@/components/common/milkdown/staticRenderer';
import { createCrepeFeatureConfig } from '@/components/common/milkdown/crepeConfig';
import { mentionFeature } from '@/components/common/milkdown/plugins/mention';
import { headingAnchorFeature } from '@/components/common/milkdown/plugins/headingAnchor';
import { tagAutocompleteFeature } from '@/components/common/milkdown/plugins/tagAutocomplete';
import { tagDecorationFeature } from '@/components/common/milkdown/plugins/tagDecoration';
import { READONLY_CREPE_FEATURES } from '@/components/common/milkdown/features';

interface PerfResult {
  name: string;
  ms: number;
  docs?: number;
  chars?: number;
  perDocMs?: number;
  textChars?: number;
  meta?: Record<string, unknown>;
}

interface PerfResults {
  docs: { count: number; totalChars: number; largestChars: number };
  results: PerfResult[];
}

declare global {
  interface Window {
    __markdownPerfDocs__?: string[];
    __markdownPerfLargest__?: string;
    __markdownPerfResults__?: PerfResults;
  }
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function summarize(
  name: string,
  ms: number,
  docs: number,
  chars: number,
  textChars?: number,
  meta?: Record<string, unknown>,
): PerfResult {
  return {
    name,
    ms: Math.round(ms * 100) / 100,
    docs,
    chars,
    perDocMs: docs ? Math.round((ms / docs) * 100) / 100 : undefined,
    textChars,
    meta,
  };
}

async function measureMarkdownItBatch(docs: string[]) {
  const host = document.createElement('div');
  const start = performance.now();
  for (const doc of docs) {
    const container = document.createElement('div');
    container.innerHTML = parseMarkdown(doc);
    host.appendChild(container);
  }
  const ms = performance.now() - start;
  const textChars = host.textContent?.length ?? 0;
  host.remove();
  return { ms, textChars };
}

async function measureStaticBatch(docs: string[]) {
  await warmupStaticRenderer();
  const host = document.createElement('div');
  const start = performance.now();
  for (const doc of docs) {
    const container = document.createElement('div');
    container.innerHTML = await renderMarkdownToHtml(doc);
    host.appendChild(container);
  }
  const ms = performance.now() - start;
  const textChars = host.textContent?.length ?? 0;
  host.remove();
  return { ms, textChars };
}

async function measureStaticSingle(content: string) {
  const start = performance.now();
  const html = await renderMarkdownToHtml(content);
  const ms = performance.now() - start;
  return { ms, chars: html.length };
}

async function measureCrepe(content: string, readonly: boolean) {
  const host = document.createElement('div');
  host.style.cssText =
    'position:absolute;left:-10000px;top:0;width:1200px;min-height:10px;';
  document.body.appendChild(host);

  const crepe = new Crepe({
    root: host,
    defaultValue: content,
    features: readonly ? READONLY_CREPE_FEATURES : {},
    featureConfigs: createCrepeFeatureConfig((key) => key),
  })
    .addFeature(mentionFeature)
    .addFeature(headingAnchorFeature)
    .addFeature(readonly ? tagDecorationFeature : tagAutocompleteFeature);

  if (readonly) crepe.setReadonly(true);

  const start = performance.now();
  await crepe.create();
  await nextTick();
  await nextFrame();
  await nextFrame();
  const ms = performance.now() - start;
  const textChars =
    host.querySelector('.ProseMirror')?.textContent?.length ?? 0;

  await crepe.destroy();
  host.remove();
  return { ms, textChars };
}

async function run() {
  const docs = (window.__markdownPerfDocs__ ?? []).filter(Boolean);
  if (docs.length === 0) {
    window.__markdownPerfResults__ = {
      docs: { count: 0, totalChars: 0, largestChars: 0 },
      results: [],
    };
    return;
  }

  const totalChars = docs.reduce((sum, doc) => sum + doc.length, 0);
  const largest =
    window.__markdownPerfLargest__ ||
    docs.reduce((best, doc) => (doc.length > best.length ? doc : best), '');
  const results: PerfResult[] = [];

  const markdownIt = await measureMarkdownItBatch(docs);
  results.push(
    summarize(
      'markdown-it batch (cards/chunks path)',
      markdownIt.ms,
      docs.length,
      totalChars,
      markdownIt.textChars,
    ),
  );

  const edit = await measureCrepe(largest, false);
  results.push(
    summarize(
      'edit Crepe single (largest doc)',
      edit.ms,
      1,
      largest.length,
      edit.textChars,
    ),
  );

  const view = await measureCrepe(largest, true);
  results.push(
    summarize(
      'read-only Crepe single (largest doc)',
      view.ms,
      1,
      largest.length,
      view.textChars,
    ),
  );

  const staticSingle = await measureStaticSingle(largest);
  results.push(
    summarize(
      'static Milkdown single (largest doc, warm)',
      staticSingle.ms,
      1,
      largest.length,
      staticSingle.chars,
    ),
  );

  const staticBatch = await measureStaticBatch(docs);
  results.push(
    summarize(
      'static Milkdown batch (cards/chunks path)',
      staticBatch.ms,
      docs.length,
      totalChars,
      staticBatch.textChars,
    ),
  );

  const payload: PerfResults = {
    docs: { count: docs.length, totalChars, largestChars: largest.length },
    results,
  };
  window.__markdownPerfResults__ = payload;
  // eslint-disable-next-line no-console
  console.table(payload.results);
}

void run();
