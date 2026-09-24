/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Assignment` table. All the data in the column will be lost.
  - Added the required column `exerciseId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "dueDate",
DROP COLUMN "startDate",
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "exerciseId" TEXT NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Assignment_exerciseId_idx" ON "Assignment"("exerciseId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

-- CreateIndex
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
