-- Remove models no longer used by the application.
ALTER TABLE "Lesson"
  DROP CONSTRAINT "Lesson_gradeId_fkey",
  DROP CONSTRAINT "Lesson_topicId_fkey",
  DROP COLUMN "gradeId",
  DROP COLUMN "topicId";

ALTER TABLE "Topic"
  DROP CONSTRAINT "Topic_gradeId_fkey";

DROP TABLE "AIGeneration";
DROP TABLE "LearningProgress";
DROP TABLE "Topic";
DROP TABLE "Grade";
