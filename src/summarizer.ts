import { Article } from './types.js';

const MODEL = 'MiniMax-M2.7-highspeed';

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY 环境变量未设置');
  return key;
}

function getBaseUrl(): string {
  return process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic';
}

export async function summarizeArticles(articles: Article[], quiet: boolean): Promise<void> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (!quiet) {
      process.stdout.write(`\r  [${i + 1}/${articles.length}] 摘要生成中: ${article.title.slice(0, 35)}...`);
    }

    try {
      const summary = await generateSummary(baseUrl, apiKey, article.title, article.description);
      article.description = summary;
    } catch (err) {
      if (!quiet) {
        console.warn(`\n  ⚠️ 摘要失败，保留原文: ${article.title.slice(0, 30)}`);
      }
    }
  }

  if (!quiet) process.stdout.write('\n');
}

async function generateSummary(baseUrl: string, apiKey: string, title: string, currentDescription: string): Promise<string> {
  const truncatedDescription = currentDescription.slice(0, 500);

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `为以下文章生成一句话中文摘要（不超过50字，返回纯摘要文字，不要任何前缀或解释）：

标题：${title}
内容：${truncatedDescription}`
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  // MiniMax may return thinking blocks - find the text block
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  const text = textBlock?.text ?? '';
  return text.trim();
}
