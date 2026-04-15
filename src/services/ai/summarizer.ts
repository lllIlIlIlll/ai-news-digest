import type { Article } from '../../models/article.js';

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
    const contentToSummarize = article.description.trim();

    if (!contentToSummarize) {
      if (!quiet) {
        process.stdout.write(`\r  [${i + 1}/${articles.length}] 跳过（无内容）: ${article.title.slice(0, 35)}...`);
      }
      continue;
    }

    const isUrlDescription = /^https?:\/\//i.test(contentToSummarize);
    const summaryContent = isUrlDescription ? article.title : contentToSummarize;

    if (!quiet) {
      const label = isUrlDescription ? '（标题生成）' : '';
      process.stdout.write(`\r  [${i + 1}/${articles.length}] 摘要生成中${label}: ${article.title.slice(0, 35)}...`);
    }

    try {
      const result = await generateSummaryAndInterpretation(baseUrl, apiKey, article.title, summaryContent);
      article.description = result.summary;
      article.interpretation = result.interpretation;
      article.chineseTitle = result.chineseTitle;
    } catch (err) {
      if (!quiet) {
        console.warn(`\n  ⚠️ 摘要失败: ${article.title.slice(0, 30)}`);
      }
    }
  }

  if (!quiet) process.stdout.write('\n');
}

async function generateSummaryAndInterpretation(
  baseUrl: string,
  apiKey: string,
  title: string,
  currentDescription: string
): Promise<{ summary: string; interpretation: string; chineseTitle: string }> {
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
      max_tokens: 2500,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `为以下文章完成三项任务：
1. 将标题翻译为中文
2. 生成一句话摘要（不超过50字）
3. 撰写解读（100-200字，总结核心观点、结论或重要细节）

标题：${title}
内容：${truncatedDescription}

输出格式（严格按此格式，不要任何前缀）：
中文标题 | 摘要 | 解读`
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  const text = textBlock?.text ?? '';
  const trimmed = text.trim();

  if (!trimmed || !trimmed.includes('|')) {
    return { summary: currentDescription, interpretation: '', chineseTitle: '' };
  }

  const parts = trimmed.split('|').map((p: string) => p.trim());
  if (parts.length < 3) {
    return { summary: currentDescription, interpretation: '', chineseTitle: '' };
  }
  const chineseTitle = parts[0] || '';
  const summary = parts[1] || currentDescription;
  const interpretation = parts.slice(2).join(' | ');

  return {
    summary: summary.length > 0 ? summary : currentDescription,
    interpretation: interpretation.length > 0 ? interpretation : '',
    chineseTitle: chineseTitle.length > 0 ? chineseTitle : '',
  };
}
