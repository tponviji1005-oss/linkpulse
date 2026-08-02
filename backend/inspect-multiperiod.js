require('dotenv').config();
const fs = require('fs');
const prisma = require('./src/config/prisma');
const { getAdvancedAnalytics } = require('./src/controllers/analyticsController');

(async () => {
  const links = await prisma.link.findMany({
    select: { id: true, shortCode: true, userId: true },
    orderBy: { createdAt: 'desc' },
  });

  const outDir = 'C:/Users/tponv/AppData/Local/Temp/opencode/payloads-multi';
  fs.mkdirSync(outDir, { recursive: true });
  const periods = ['today', '7d', '30d', '90d', 'all'];

  let okCount = 0;
  let errCount = 0;

  for (const link of links) {
    for (const period of periods) {
      const req = {
        params: { id: link.id },
        query: { period },
        user: { userId: link.userId },
      };
      let captured = null;
      let controllerErr = null;
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
        controllerErr = e;
      };
      await getAdvancedAnalytics(req, res, next);
      if (captured) {
        const file = `${outDir}/${link.shortCode}__${period}.json`;
        fs.writeFileSync(file, JSON.stringify(captured));
        okCount++;
      } else {
        errCount++;
        console.log(
          `${link.shortCode} ${period} -> NO PAYLOAD status=${res.statusCode} err=${controllerErr && controllerErr.message}`,
        );
      }
    }
  }
  console.log(`DONE ok=${okCount} err=${errCount}`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error('SCRIPT ERROR:', e && e.stack ? e.stack : e);
  await prisma.$disconnect();
  process.exit(1);
});
