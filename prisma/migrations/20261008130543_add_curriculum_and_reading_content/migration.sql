/*
  Warnings:

  - You are about to drop the column `content` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Lesson` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[unitId,number]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_topicId_fkey";

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "content" TEXT,
ADD COLUMN     "lessonId" TEXT;

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "content",
DROP COLUMN "createdAt",
DROP COLUMN "description",
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "unitId" TEXT,
ALTER COLUMN "gradeId" DROP NOT NULL,
ALTER COLUMN "topicId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Textbook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Textbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT,
    "example" TEXT,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarPoint" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "explanation" TEXT,
    "example" TEXT,

    CONSTRAINT "GrammarPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Textbook_name_key" ON "Textbook"("name");

-- CreateIndex
CREATE INDEX "Unit_grade_idx" ON "Unit"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_textbookId_grade_number_key" ON "Unit"("textbookId", "grade", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_lessonId_word_key" ON "Vocabulary"("lessonId", "word");

-- CreateIndex
CREATE INDEX "Lesson_unitId_idx" ON "Lesson"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_unitId_number_key" ON "Lesson"("unitId", "number");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarPoint" ADD CONSTRAINT "GrammarPoint_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
