import { Article } from './types.js';

export function filterLast24Hours(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return articles
    .filter(article => article.pubDate >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}
