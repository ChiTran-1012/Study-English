-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "skill" "Skill" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "topic" TEXT NOT NULL,
    "exercise" JSONB NOT NULL,
    "answers" JSONB,
    "score" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSession_studentId_idx" ON "PracticeSession"("studentId");

-- CreateIndex
CREATE INDEX "PracticeSession_studentId_createdAt_idx" ON "PracticeSession"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
