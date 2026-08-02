require("dotenv").config();
const prisma = require("./src/config/prisma");
(async () => {
  const link = await prisma.link.findFirst({ where: { shortCode: "rpfiCos0" } });
  const clicks = await prisma.click.findMany({
    where: { linkId: link.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { isBot: true, userAgent: true, createdAt: true },
  });
  for (const c of clicks) console.log(JSON.stringify({ isBot: c.isBot, ua: (c.userAgent || "").slice(0, 50), at: c.createdAt.toISOString() }));
  await prisma.$disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
