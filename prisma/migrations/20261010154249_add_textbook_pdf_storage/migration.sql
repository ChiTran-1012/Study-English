-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "TextbookFile" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextbookFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "textbookFileId" TEXT NOT NULL,
    "unitId" TEXT,
    "lessonId" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TextbookFile_storageKey_key" ON "TextbookFile"("storageKey");

-- CreateIndex
CREATE INDEX "TextbookFile_textbookId_grade_idx" ON "TextbookFile"("textbookId", "grade");

-- CreateIndex
CREATE INDEX "TextbookFile_status_idx" ON "TextbookFile"("status");

-- CreateIndex
CREATE INDEX "DocumentChunk_textbookFileId_pageNumber_idx" ON "DocumentChunk"("textbookFileId", "pageNumber");

-- CreateIndex
CREATE INDEX "DocumentChunk_unitId_idx" ON "DocumentChunk"("unitId");

-- CreateIndex
CREATE INDEX "DocumentChunk_lessonId_idx" ON "DocumentChunk"("lessonId");

-- AddForeignKey
ALTER TABLE "TextbookFile" ADD CONSTRAINT "TextbookFile_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_textbookFileId_fkey" FOREIGN KEY ("textbookFileId") REFERENCES "TextbookFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
