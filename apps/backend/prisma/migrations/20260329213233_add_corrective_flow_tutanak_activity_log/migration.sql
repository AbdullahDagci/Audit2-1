/*
  Warnings:

  - You are about to drop the column `assigned_to` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `completion_notes` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `completion_photo_path` on the `corrective_actions` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `corrective_actions` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `corrective_actions` table without a default value. This is not possible if the table is not empty.
  - Made the column `response_id` on table `corrective_actions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('pending', 'evidence_uploaded', 'completed');

-- CreateEnum
CREATE TYPE "TutanakStatus" AS ENUM ('draft', 'sent');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InspectionStatus" ADD VALUE 'scheduled';
ALTER TYPE "InspectionStatus" ADD VALUE 'pending_action';

-- DropForeignKey
ALTER TABLE "corrective_actions" DROP CONSTRAINT "corrective_actions_assigned_to_fkey";

-- AlterTable
ALTER TABLE "corrective_actions" DROP COLUMN "assigned_to",
DROP COLUMN "completed_at",
DROP COLUMN "completion_notes",
DROP COLUMN "completion_photo_path",
DROP COLUMN "due_date",
ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "evidence_notes" TEXT,
ADD COLUMN     "evidence_photo_path" TEXT,
ADD COLUMN     "evidence_uploaded_at" TIMESTAMP(3),
ADD COLUMN     "is_critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "response_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "inspections" ADD COLUMN     "scheduled_date" DATE;

-- CreateTable
CREATE TABLE "tutanaklar" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Tutanak',
    "content" JSONB NOT NULL,
    "status" "TutanakStatus" NOT NULL DEFAULT 'draft',
    "pdf_path" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutanaklar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "inspection_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutanaklar" ADD CONSTRAINT "tutanaklar_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutanaklar" ADD CONSTRAINT "tutanaklar_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
