import { mkdir, writeFile } from 'fs/promises';

export async function writeDigest(content: string, date: Date): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];
  const outputDir = 'output';
  const latestPath = `${outputDir}/latest.md`;
  const datedPath = `${outputDir}/${dateStr}.md`;

  await mkdir(outputDir, { recursive: true });

  await writeFile(latestPath, content, 'utf-8');
  await writeFile(datedPath, content, 'utf-8');
}