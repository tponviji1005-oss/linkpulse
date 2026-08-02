require('dotenv').config();
const fs = require('fs');
const prisma = require('./src/config/prisma');
const { getAdvancedAnalytics } = require('./src/controllers/analyticsController');

(async () => {
  const links = await prisma.link.findMany({
    select: { id: true, shortCode: true, userId: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('TOTAL LINKS', links.length);

  const outDir = 'C:/Users/tponv/AppData/Local/Temp/opencode/payloads';
  fs.mkdirSync(outDir, { recursive: true });

  for (const link of links) {
    const req = {
      params: { id: link.id },
      query: { period: 'all' },
      user: { userId: link.userId },
    };
    let captured = null;
    const res = {
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(d) {
        captured = d;
        return this;
      },
    };
    const next = (e) => {
      console.log(`CONTROLLER ERROR for ${link.shortCode}:`, e && e.message);
    };
    await getAdvancedAnalytics(req, res, next);
    if (captured) {
      const file = `${outDir}/${link.shortCode}.json`;
      fs.writeFileSync(file, JSON.stringify(captured, null, 2));
      console.log(
        `${link.shortCode} -> status=${res.statusCode} totalClicks=${captured.totalClicks} bots=${captured.botClicks} health=${captured.healthLabel} trends=${captured.dailyTrend.length}`,
      );
    } else {
      console.log(`${link.shortCode} -> NO PAYLOAD status=${res.statusCode}`);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error('SCRIPT ERROR:', e && e.stack ? e.stack : e);
  await prisma.$disconnect();
  process.exit(1);
});
