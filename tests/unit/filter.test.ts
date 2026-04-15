import { describe, it, expect } from 'vitest';
import { filterLast1Hour, deduplicateByUrl, markHighlights } from '../../src/core/filter.js';

describe('filterLast1Hour', () => {
  it('should filter articles within the last hour', () => {
    const now = new Date();
    const articles = [
      { title: 'A', link: 'http://a.com', pubDate: new Date(now.getTime() - 30 * 60 * 1000), source: 'Test', description: '' },
      { title: 'B', link: 'http://b.com', pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), source: 'Test', description: '' },
    ];
    const result = filterLast1Hour(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });
});

describe('deduplicateByUrl', () => {
  it('should remove duplicate articles by URL', () => {
    const articles = [
      { title: 'A', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'A duplicate', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'B', link: 'http://b.com', pubDate: new Date(), source: 'Test', description: '' },
    ];
    const result = deduplicateByUrl(articles);
    expect(result).toHaveLength(2);
  });
});

describe('markHighlights', () => {
  it('should mark articles with keywords as highlights', () => {
    const articles = [
      { title: 'GPT-5 Released', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'Weather is nice', link: 'http://b.com', pubDate: new Date(), source: 'Test', description: '' },
    ];
    const result = markHighlights(articles);
    expect(result[0].isHighlight).toBe(true);
    expect(result[1].isHighlight).toBe(false);
  });
});