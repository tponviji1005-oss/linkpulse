-- CreateIndex
CREATE INDEX "clicks_link_id_ip_address_created_at_idx" ON "clicks"("link_id", "ip_address", "created_at");
