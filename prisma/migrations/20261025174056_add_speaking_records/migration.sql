-- CreateTable
CREATE TABLE "SpeakingRecord" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "audioData" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "transcript" TEXT,
    "pronunciationScore" DOUBLE PRECISION,
    "fluencyScore" DOUBLE PRECISION,
    "grammarScore" DOUBLE PRECISION,
    "vocabularyScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingRecord_submissionId_questionId_key" ON "SpeakingRecord"("submissionId", "questionId");

-- AddForeignKey
ALTER TABLE "SpeakingRecord" ADD CONSTRAINT "SpeakingRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingRecord" ADD CONSTRAINT "SpeakingRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
