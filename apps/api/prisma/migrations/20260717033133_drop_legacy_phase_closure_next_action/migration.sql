/*
  Warnings:

  - You are about to drop the column `nextAction` on the `phase_closures` table. All the data in the column will be lost.
  - You are about to drop the column `nextDueDate` on the `phase_closures` table. All the data in the column will be lost.
  - You are about to drop the column `nextOwner` on the `phase_closures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "phase_closures" DROP COLUMN "nextAction",
DROP COLUMN "nextDueDate",
DROP COLUMN "nextOwner";
