-- CreateTable
CREATE TABLE "geo_rules" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "destination_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geo_rules_link_id_idx" ON "geo_rules"("link_id");

-- CreateIndex
CREATE UNIQUE INDEX "geo_rules_link_id_country_code_key" ON "geo_rules"("link_id", "country_code");

-- AddForeignKey
ALTER TABLE "geo_rules" ADD CONSTRAINT "geo_rules_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
