/*
  Warnings:

  - You are about to drop the column `radarKey` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_radarKey_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "radarKey";
