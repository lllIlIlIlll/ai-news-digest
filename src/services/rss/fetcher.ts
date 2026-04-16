import type { FetchResult } from '../../models/article.js';
import type { RSSSource } from '../../models/config.js';
import { RSS_SOURCES, HN_SOURCE } from './sources.js';
import { FailedSourceTracker } from './failed-sources.js';

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

const tracker = new FailedSourceTracker();

async function fetchWithTimeout(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  重试 ${attempt}/${retries}: ${url}`);
    }
  }
  throw new Error('unreachable');
}

export async function fetchAllSources(quiet: boolean): Promise<FetchResult[]> {
  if (!quiet) console.log('Starting RSS fetch...\n');

  await tracker.load();

  const results = await Promise.all([
    ...RSS_SOURCES.map((source) => fetchSource(source, quiet)),
    fetchSource(HN_SOURCE, quiet),
  ]);

  const failedEntries = tracker.getAllFailedEntries().filter((e) => e.consecutiveFailures >= MAX_RETRIES);
  if (failedEntries.length > 0) {
    console.warn(`\n⚠️ 已跳过 ${failedEntries.length} 个持续失败的RSS源（见 output/failed-sources.json）`);
  }

  return results;
}

async function fetchSource(source: RSSSource, quiet: boolean): Promise<FetchResult> {
  if (tracker.shouldSkip(source.name)) {
    return { source: source.name, skipped: true };
  }

  try {
    if (!quiet) console.log(`  Fetching: ${source.name}`);
    const xml = await fetchWithTimeout(source.url);
    await tracker.recordSuccess(source.name);
    return { source: source.name, xml };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!quiet) console.warn(`  解析失败，跳过: ${source.name} — ${errorMsg}`);
    const maxed = await tracker.recordFailure(source.name, source.url, errorMsg);
    if (maxed && !quiet) {
      console.warn(`  ⚠️ ${source.name} 已连续失败3次，将从后续抓取中移除`);
    }
    return { source: source.name, error: errorMsg };
  }
}
