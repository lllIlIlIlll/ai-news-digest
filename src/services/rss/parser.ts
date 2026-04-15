import { XMLParser } from 'fast-xml-parser';
import type { Article } from '../../models/article.js';
import type { FetchResult } from '../../models/article.js';
import { decodeEntities } from '../../utils/html.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function truncateDescription(text: string, maxChars = 100): string {
  if (typeof text !== 'string') return '';
  const decoded = decodeEntities(text);
  const stripped = decoded.replace(/<[^>]+>/g, '').trim();
  const urlMatch = stripped.match(/^Article URL:\s*(\S+)/);
  if (urlMatch) return urlMatch[1];
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function parseRSSItems(xml: string, source: string): Article[] {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  const itemArray = Array.isArray(items) ? items : [items];

  return itemArray
    .map((item: Record<string, unknown>) => {
      const title = item.title?.['#text'] ?? item.title ?? '';
      const link = item.link?.['#text'] ?? item.link ?? item.guid ?? '';
      const pubDateStr = item.pubDate?.['#text'] ?? item.pubDate ?? item.published ?? '';
      const description = item.description?.['#text'] ?? item.description?.['__cdata'] ?? item.description ?? item.summary ?? '';

      if (!title || !link || !pubDateStr) return null;

      const pubDate = new Date(pubDateStr as string);
      if (isNaN(pubDate.getTime())) return null;

      return {
        title: decodeEntities(String(title).trim()),
        link: String(link).trim(),
        pubDate,
        source,
        description: truncateDescription(description as string),
      } satisfies Article;
    })
    .filter((a): a is Article => a !== null);
}

export function parseArticles(fetchResults: FetchResult[]): Article[] {
  const articles: Article[] = [];
  for (const result of fetchResults) {
    if (result.error || !result.xml) continue;
    const parsed = parseRSSItems(result.xml, result.source);
    articles.push(...parsed);
  }
  return articles;
}
