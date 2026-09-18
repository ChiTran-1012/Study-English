/*
  Warnings:

  - You are about to drop the column `createdBy` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `gradeId` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `Exercise` table. All the data in the column will be lost.
  - Added the required column `teacherId` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `QuestionOption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "createdBy",
DROP COLUMN "gradeId",
DROP COLUMN "topicId",
ADD COLUMN     "teacherId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "source" SET DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "label" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
