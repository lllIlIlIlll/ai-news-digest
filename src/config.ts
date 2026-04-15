// 研究机构
const RESEARCH_SOURCES = {
  'GoogleResearch': 'https://research.google/blog/rss',
  'DeepMind': 'https://deepmind.google/discover/blog/rss',
  'OpenAI': 'https://openai.com/news/rss.xml',
  'BAIR': 'https://bair.berkeley.edu/blog/feed.xml',
  'AWS_ML': 'https://aws.amazon.com/blogs/machine-learning/feed',
  'AmazonScience': 'https://www.amazon.science/index.rss',
} as const;

// 科技新闻媒体
const NEWS_SOURCES = {
  'TechCrunch': 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'TheVerge': 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'TheDecoder': 'https://the-decoder.com/feed/',
  'MarkTechPost': 'https://www.marktechpost.com/feed',
  'DailyAI': 'https://dailyai.com/feed',
  'LastWeekInAI': 'https://lastweekin.ai/feed',
  'HackerNoon': 'https://hackernoon.com/tagged/ai/feed',
  'ScienceDaily': 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
} as const;

// 中文源
const CN_SOURCES = {
  'MSRA_Asia': 'https://plink.anyfeeder.com/weixin/MSRAsia',
  'SanHuaAI': 'https://sanhua.himrr.com/daily-news/feed',
  'RuanYifeng': 'https://www.ruanyifeng.com/blog/atom.xml',
  'Solidot': 'https://www.solidot.org/index.rss',
  'Sspai': 'https://sspai.com/feed',
} as const;

// 技术深度
const TECH_SOURCES = {
  'MLMastery': 'https://machinelearningmastery.com/blog/feed',
  'GradientFlow': 'https://gradientflow.com/feed/',
  'AISummer': 'https://theaisummer.com/feed.xml',
  'AIHub': 'https://aihub.org/feed',
} as const;

// Hacker News
const HN_SOURCE = 'https://hnrss.org/newest?q=AI&count=30';

// 合并所有源
export const RSS_SOURCES = {
  ...RESEARCH_SOURCES,
  ...NEWS_SOURCES,
  ...CN_SOURCES,
  ...TECH_SOURCES,
} as const;

export { HN_SOURCE };
