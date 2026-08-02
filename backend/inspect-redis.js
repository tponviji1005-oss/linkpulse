require('dotenv').config();
const { connectRedis, disconnectRedis, getRedisClient } = require('./src/lib/redis');

(async () => {
  await connectRedis();
  const client = getRedisClient();
  const keys = await client.keys('analytics:*');
  console.log('ANALYTICS KEYS:', keys.length);
  for (const k of keys.slice(0, 3)) {
    const v = await client.get(k);
    console.log('---', k, 'len', v ? v.length : 0);
    if (v) {
      try {
        const o = JSON.parse(v);
        console.log('  keys:', Object.keys(o).join(','));
        console.log(
          '  browserBreakdown type:',
          Array.isArray(o.browserBreakdown) ? 'ARRAY' : typeof o.browserBreakdown,
        );
      } catch (e) {
        console.log('  UNPARSEABLE:', String(v).slice(0, 120));
      }
    }
  }
  await disconnectRedis();
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
