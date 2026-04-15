import { FetchResult, Article } from './types.js';

const RSS_SOURCES = {
  'TechCrunch': 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'The Verge': 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
} as const;

const HN_SOURCE = 'https://hnrss.org/newest?q=AI&count=30';

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

export interface RawFetchResult extends FetchResult {
  xml?: string;
}

async function fetchWithTimeout(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) throw err;
      console.warn(`  Retry ${attempt}/${retries}: ${url}`);
    }
  }
  throw new Error('unreachable');
}

export async function fetchAllSources(quiet: boolean): Promise<RawFetchResult[]> {
  if (!quiet) console.log('Starting RSS fetch...\n');

  const results = await Promise.all([
    fetchSource('TechCrunch', RSS_SOURCES['TechCrunch'], quiet),
    fetchSource('The Verge', RSS_SOURCES['The Verge'], quiet),
    fetchSource('Hacker News', HN_SOURCE, quiet),
  ]);

  return results;
}

async function fetchSource(
  name: Article['source'],
  url: string,
  quiet: boolean
): Promise<RawFetchResult> {
  try {
    if (!quiet) console.log(`  Fetching: ${name}`);
    const xml = await fetchWithTimeout(url);
    return { source: name, articles: [], xml };
  } catch (err) {
    if (!quiet) console.warn(`  Failed: ${name} — ${err instanceof Error ? err.message : err}`);
    return { source: name, articles: [], error: String(err) };
  }
}
