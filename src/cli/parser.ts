import type { CLIArgs } from '../models/config.js';

export function parseArgs(): CLIArgs {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  const cron = process.argv.includes('-cron') || process.argv.includes('--cron');
  return { quiet, cron };
}
