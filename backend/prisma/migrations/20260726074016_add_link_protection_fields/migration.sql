-- AlterTable
ALTER TABLE "links" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "password_hash" VARCHAR(255);
