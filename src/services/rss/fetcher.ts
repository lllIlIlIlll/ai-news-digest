import type { FetchResult } from '../../models/article.js';
import type { RSSSource } from '../../models/config.js';
import { RSS_SOURCES, HN_SOURCE } from './sources.js';

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

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

  const results = await Promise.all([
    ...RSS_SOURCES.map((source) => fetchSource(source, quiet)),
    fetchSource(HN_SOURCE, quiet),
  ]);

  return results;
}

async function fetchSource(source: RSSSource, quiet: boolean): Promise<FetchResult> {
  try {
    if (!quiet) console.log(`  Fetching: ${source.name}`);
    const xml = await fetchWithTimeout(source.url);
    return { source: source.name, articles: [], xml };
  } catch (err) {
    if (!quiet) console.warn(`  解析失败，跳过: ${source.name} — ${err instanceof Error ? err.message : err}`);
    return { source: source.name, articles: [], error: String(err) };
  }
}
