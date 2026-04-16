import cron from 'node-cron';
import { parseArgs } from './parser.js';
import { runAggregation } from '../core/aggregator.js';

async function main() {
  const { quiet, cron: isCronMode } = parseArgs();

  if (isCronMode) {
    console.log('⏰ 定时模式已启动，每天早上 8:00 自动生成日报');
    cron.schedule('0 8 * * *', () => {
      console.log('\n🤖 [定时任务] 开始抓取...\n');
      runAggregation({ quiet: false }).catch(err => {
        console.error('❌ 错误:', err);
      });
    });
    return;
  }

  await runAggregation({ quiet });
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
