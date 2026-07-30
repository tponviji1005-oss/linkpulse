-- AlterTable
ALTER TABLE "clicks" ADD COLUMN "browser_version" VARCHAR(20);
ALTER TABLE "clicks" ADD COLUMN "language" VARCHAR(10);
ALTER TABLE "clicks" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "clicks" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "clicks" ADD COLUMN "os_version" VARCHAR(20);
ALTER TABLE "clicks" ADD COLUMN "region" VARCHAR(100);
ALTER TABLE "clicks" ADD COLUMN "state" VARCHAR(100);
ALTER TABLE "clicks" ADD COLUMN "timezone" VARCHAR(50);

-- CreateIndex
CREATE INDEX "clicks_country_idx" ON "clicks"("country");
CREATE INDEX "clicks_created_at_idx" ON "clicks"("created_at");
