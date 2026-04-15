import { XMLParser } from 'fast-xml-parser';
import { Article } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const HTML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&[a-z]+;|&#\d+;/gi, match => {
    if (match.startsWith('&#')) {
      const code = parseInt(match.slice(2, -1), 10);
      return isNaN(code) ? match : String.fromCharCode(code);
    }
    return HTML_ENTITIES[match] ?? match;
  });
}

function truncateDescription(text: unknown, maxChars = 100): string {
  if (typeof text !== 'string') return '';
  const decoded = decodeEntities(text);
  const stripped = decoded.replace(/<[^>]+>/g, '').trim();
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function parseRSSItems(xml: string, source: Article['source']): Article[] {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  const itemArray = Array.isArray(items) ? items : [items];

  return itemArray
    .map((item: any) => {
      const title = item.title?.['#text'] ?? (typeof item.title === 'string' ? item.title : '');
      const link = item.link?.['#text'] ?? (typeof item.link === 'string' ? item.link : (item.guid?.['#text'] ?? (typeof item.guid === 'string' ? item.guid : '')));
      const pubDateStr = item.pubDate?.['#text'] ?? (typeof item.pubDate === 'string' ? item.pubDate : (item.published?.['#text'] ?? (typeof item.published === 'string' ? item.published : '')));
      const descriptionRaw = item.description?.['#text'] ?? item.description?.['__cdata'] ?? (typeof item.description === 'string' ? item.description : (typeof item.summary === 'string' ? item.summary : ''));

      if (!title || !link || !pubDateStr) return null;

      const pubDate = new Date(pubDateStr);
      if (isNaN(pubDate.getTime())) return null;

      return {
        title: String(title).trim(),
        link: String(link).trim(),
        pubDate,
        source,
        description: truncateDescription(descriptionRaw),
      } satisfies Article;
    })
    .filter((a): a is Article => a !== null);
}

export function parseArticles(fetchResults: { source: Article['source']; xml?: string; error?: string }[]): Article[] {
  const articles: Article[] = [];
  for (const result of fetchResults) {
    if (result.error || !result.xml) continue;
    const parsed = parseRSSItems(result.xml, result.source);
    articles.push(...parsed);
  }
  return articles;
}
