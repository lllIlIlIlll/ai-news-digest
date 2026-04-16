import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const FAILED_SOURCES_FILE = 'output/failed-sources.json';
const MAX_CONSECUTIVE_FAILURES = 3;

export interface FailedSourceEntry {
  name: string;
  url: string;
  consecutiveFailures: number;
  lastError: string;
  lastFailedAt: string;
}

interface FailedSourcesData {
  [sourceName: string]: FailedSourceEntry;
}

export class FailedSourceTracker {
  private data: FailedSourcesData = {};
  private readonly filePath: string;

  constructor(filePath: string = FAILED_SOURCES_FILE) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content) as FailedSourcesData;
    } catch {
      this.data = {};
    }
  }

  private async save(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  shouldSkip(name: string): boolean {
    const entry = this.data[name];
    return entry ? entry.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES : false;
  }

  async recordFailure(name: string, url: string, error: string): Promise<boolean> {
    const entry = this.data[name] ?? { name, url, consecutiveFailures: 0, lastError: '', lastFailedAt: '' };
    entry.consecutiveFailures++;
    entry.lastError = error;
    entry.lastFailedAt = new Date().toISOString();
    this.data[name] = entry;
    await this.save();
    return entry.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
  }

  async recordSuccess(name: string): Promise<void> {
    if (this.data[name]) {
      this.data[name].consecutiveFailures = 0;
      await this.save();
    }
  }

  getAllFailedEntries(): FailedSourceEntry[] {
    return Object.values(this.data);
  }
}
