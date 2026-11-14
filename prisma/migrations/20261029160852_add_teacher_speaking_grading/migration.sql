-- AlterTable
ALTER TABLE "SpeakingRecord" ADD COLUMN     "teacherFeedback" TEXT,
ADD COLUMN     "teacherFluencyScore" DOUBLE PRECISION,
ADD COLUMN     "teacherGradedAt" TIMESTAMP(3),
ADD COLUMN     "teacherGradedById" TEXT,
ADD COLUMN     "teacherGrammarScore" DOUBLE PRECISION,
ADD COLUMN     "teacherPronunciationScore" DOUBLE PRECISION,
ADD COLUMN     "teacherVocabularyScore" DOUBLE PRECISION;
