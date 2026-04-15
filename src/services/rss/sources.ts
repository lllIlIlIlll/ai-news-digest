import type { RSSSource } from '../../models/config.js';

const RESEARCH_SOURCES: RSSSource[] = [
  { name: 'GoogleResearch', url: 'https://research.google/blog/rss' },
  { name: 'DeepMind', url: 'https://deepmind.google/discover/blog/rss' },
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { name: 'BAIR', url: 'https://bair.berkeley.edu/blog/feed.xml' },
  { name: 'AWS_ML', url: 'https://aws.amazon.com/blogs/machine-learning/feed' },
  { name: 'AmazonScience', url: 'https://www.amazon.science/index.rss' },
];

const NEWS_SOURCES: RSSSource[] = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'TheVerge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TheDecoder', url: 'https://the-decoder.com/feed/' },
  { name: 'MarkTechPost', url: 'https://www.marktechpost.com/feed' },
  { name: 'DailyAI', url: 'https://dailyai.com/feed' },
  { name: 'LastWeekInAI', url: 'https://lastweekin.ai/feed' },
  { name: 'HackerNoon', url: 'https://hackernoon.com/tagged/ai/feed' },
  { name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml' },
];

const CN_SOURCES: RSSSource[] = [
  { name: 'MSRA_Asia', url: 'https://plink.anyfeeder.com/weixin/MSRAsia' },
  { name: 'SanHuaAI', url: 'https://sanhua.himrr.com/daily-news/feed' },
  { name: 'RuanYifeng', url: 'https://www.ruanyifeng.com/blog/atom.xml' },
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss' },
  { name: 'Sspai', url: 'https://sspai.com/feed' },
];

const TECH_SOURCES: RSSSource[] = [
  { name: 'MLMastery', url: 'https://machinelearningmastery.com/blog/feed' },
  { name: 'GradientFlow', url: 'https://gradientflow.com/feed/' },
  { name: 'AISummer', url: 'https://theaisummer.com/feed.xml' },
  { name: 'AIHub', url: 'https://aihub.org/feed' },
];

const HN_SOURCE: RSSSource = { name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI&count=30' };

export const RSS_SOURCES: RSSSource[] = [
  ...RESEARCH_SOURCES,
  ...NEWS_SOURCES,
  ...CN_SOURCES,
  ...TECH_SOURCES,
];

export { HN_SOURCE };
