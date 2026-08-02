-- AlterTable
ALTER TABLE "clicks" ADD COLUMN     "ab_variant_label" VARCHAR(100);

-- CreateTable
CREATE TABLE "ab_variants" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "destination_url" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL,
    "label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ab_variants_link_id_idx" ON "ab_variants"("link_id");

-- AddForeignKey
ALTER TABLE "ab_variants" ADD CONSTRAINT "ab_variants_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
