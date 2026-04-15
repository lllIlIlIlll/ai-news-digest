import type { Article } from '../models/article.js';

const STAR_KEYWORDS = [
  'GPT', 'LLM', '大模型', 'Agent', 'OpenAI', 'Anthropic', 'DeepMind',
  'Gemini', 'AI Agent', '多模态', '推理模型'
];

function isHighlight(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return STAR_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

export function filterLast1Hour(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000);

  return articles
    .filter(article => article.pubDate >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

export function deduplicateByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (seen.has(article.link)) return false;
    seen.add(article.link);
    return true;
  });
}

export function markHighlights(articles: Article[]): Article[] {
  return articles.map(article => ({
    ...article,
    isHighlight: isHighlight(article.title, article.description),
  }));
}
