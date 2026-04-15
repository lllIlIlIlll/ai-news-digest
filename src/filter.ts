import { Article } from './types.js';

const HIGHLIGHT_KEYWORDS = [
  'GPT', 'LLM', '大模型', 'Agent',
  'OpenAI', 'Anthropic', 'DeepMind', 'Gemini',
  'AI Agent', '多模态', '推理模型',
];

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
    isHighlight: HIGHLIGHT_KEYWORDS.some(kw =>
      article.title.includes(kw) || article.description.includes(kw)
    ),
  }));
}

export function filterLast24Hours(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return articles
    .filter(article => article.pubDate >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}
