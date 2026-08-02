require("dotenv").config();
const prisma = require("./src/config/prisma");
(async () => {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'links'
    ORDER BY ordinal_position
  `;
  console.log("LINKS COLUMNS:", JSON.stringify(cols));

  const link = await prisma.link.findFirst({ where: { maxClicks: { not: null } }, select: { id: true, shortCode: true, maxClicks: true, isActive: true } });
  console.log("SAMPLE:", JSON.stringify(link));

  if (link) {
    const rows = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id, "maxClicks", is_active AS "isActive"
        FROM links
        WHERE id = ${link.id}::uuid
        FOR UPDATE
      `;
      return locked;
    });
    console.log("FOR UPDATE RESULT:", JSON.stringify(rows));
  }

  await prisma.$disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
