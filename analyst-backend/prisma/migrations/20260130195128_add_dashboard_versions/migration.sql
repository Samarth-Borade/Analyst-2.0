/*
  Warnings:

  - A unique constraint covering the columns `[dashboard_id,shared_with_email]` on the table `dashboard_shares` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `data_sources` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dashboard_shares" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "shared_with_user_id" TEXT;

-- AlterTable
ALTER TABLE "dashboards" ALTER COLUMN "prompt_used" DROP NOT NULL;

-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "dashboard_id" TEXT,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "row_count" INTEGER,
ADD COLUMN     "schema" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'csv',
ALTER COLUMN "connection_config" DROP NOT NULL;

-- CreateTable
CREATE TABLE "dashboard_versions" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "configuration" JSONB NOT NULL,
    "commit_message" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboard_versions_dashboard_id_idx" ON "dashboard_versions"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_versions_created_at_idx" ON "dashboard_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_versions_dashboard_id_version_number_key" ON "dashboard_versions"("dashboard_id", "version_number");

-- CreateIndex
CREATE INDEX "audit_logs_dashboard_id_idx" ON "audit_logs"("dashboard_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_shares_dashboard_id_shared_with_email_key" ON "dashboard_shares"("dashboard_id", "shared_with_email");

-- AddForeignKey
ALTER TABLE "dashboard_versions" ADD CONSTRAINT "dashboard_versions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
