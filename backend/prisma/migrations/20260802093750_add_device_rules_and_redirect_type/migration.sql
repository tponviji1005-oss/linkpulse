-- AlterTable
ALTER TABLE "clicks" ADD COLUMN     "redirect_type" VARCHAR(20);

-- CreateTable
CREATE TABLE "device_rules" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "device_type" VARCHAR(20) NOT NULL,
    "destination_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_rules_link_id_idx" ON "device_rules"("link_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_rules_link_id_device_type_key" ON "device_rules"("link_id", "device_type");

-- AddForeignKey
ALTER TABLE "device_rules" ADD CONSTRAINT "device_rules_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
