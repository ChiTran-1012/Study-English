import {
  Difficulty,
  ExerciseSource,
  PrismaClient,
  QuestionType,
  Role,
  Skill,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPassword = "Demo1234!";
const teacherEmail = "teacher.demo@example.test";
const studentEmails = Array.from(
  { length: 5 },
  (_, index) => `student${String(index + 1).padStart(2, "0")}.demo@example.test`
);

const exerciseTitle = "DEMO — Daily Activities Reading";
const assignmentTitle = "DEMO — Unit 1 Reading Practice";
const classCode = "DEMO6A26";

const questions = [
  {
    content: "What time does Anna get up?",
    correctAnswer: "B",
    explanation: "Anna gets up at 6:30.",
    options: [
      { label: "A", content: "At 6:00", isCorrect: false },
      { label: "B", content: "At 6:30", isCorrect: true },
      { label: "C", content: "At 7:00", isCorrect: false },
      { label: "D", content: "At 7:30", isCorrect: false },
    ],
  },
  {
    content: "What does Anna have for breakfast?",
    correctAnswer: "A",
    explanation: "She has bread and eggs for breakfast.",
    options: [
      { label: "A", content: "Bread and eggs", isCorrect: true },
      { label: "B", content: "Rice and fish", isCorrect: false },
      { label: "C", content: "Fruit and yogurt", isCorrect: false },
      { label: "D", content: "Noodles", isCorrect: false },
    ],
  },
  {
    content: "How does Anna go to school?",
    correctAnswer: "C",
    explanation: "Anna goes to school by bus.",
    options: [
      { label: "A", content: "By bike", isCorrect: false },
      { label: "B", content: "On foot", isCorrect: false },
      { label: "C", content: "By bus", isCorrect: true },
      { label: "D", content: "By car", isCorrect: false },
    ],
  },
  {
    content: "What does Anna do after school?",
    correctAnswer: "D",
    explanation: "She plays badminton after school.",
    options: [
      { label: "A", content: "She watches TV", isCorrect: false },
      { label: "B", content: "She reads a book", isCorrect: false },
      { label: "C", content: "She goes shopping", isCorrect: false },
      { label: "D", content: "She plays badminton", isCorrect: true },
    ],
  },
];

async function ensureUser(input: {
  email: string;
  name: string;
  role: Role;
}) {
  const password = await bcrypt.hash(demoPassword, 10);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      ...input,
      password,
    },
  });
}

async function main() {
  const teacher = await ensureUser({
    email: teacherEmail,
    name: "Giáo viên Demo",
    role: Role.TEACHER,
  });

  const students = await Promise.all(
    studentEmails.map((email, index) =>
      ensureUser({
        email,
        name: `Học sinh Demo ${index + 1}`,
        role: Role.STUDENT,
      })
    )
  );

  const existingClass = await prisma.class.findUnique({
    where: { code: classCode },
  });

  if (existingClass && existingClass.teacherId !== teacher.id) {
    throw new Error(`Class code ${classCode} is already in use.`);
  }

  const englishClass =
    existingClass ??
    (await prisma.class.create({
      data: {
        name: "Lớp tiếng Anh Demo 6A",
        code: classCode,
        grade: 6,
        description: "Lớp mẫu để thử luồng giáo viên và học sinh.",
        teacherId: teacher.id,
      },
    }));

  await Promise.all(
    students.map((student) =>
      prisma.classMember.upsert({
        where: {
          classId_studentId: {
            classId: englishClass.id,
            studentId: student.id,
          },
        },
        update: {},
        create: {
          classId: englishClass.id,
          studentId: student.id,
        },
      })
    )
  );

  const textbook = await prisma.textbook.upsert({
    where: { name: "Demo English Curriculum" },
    update: {},
    create: {
      name: "Demo English Curriculum",
      publisher: "Demo data",
    },
  });

  const unit = await prisma.unit.upsert({
    where: {
      textbookId_grade_number: {
        textbookId: textbook.id,
        grade: 6,
        number: 1,
      },
    },
    update: { title: "Daily Activities" },
    create: {
      textbookId: textbook.id,
      grade: 6,
      number: 1,
      title: "Daily Activities",
      description: "Daily routines and after-school activities.",
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: {
      unitId_number: {
        unitId: unit.id,
        number: 1,
      },
    },
    update: {
      title: "Daily Activities",
      objectives: "Read about daily routines and identify key details.",
    },
    create: {
      unitId: unit.id,
      number: 1,
      title: "Daily Activities",
      objectives: "Read about daily routines and identify key details.",
    },
  });

  const vocabulary = [
    { word: "get up", meaning: "thức dậy", example: "I get up at six." },
    { word: "breakfast", meaning: "bữa sáng", example: "We have breakfast at home." },
    { word: "by bus", meaning: "bằng xe buýt", example: "She goes to school by bus." },
    { word: "after school", meaning: "sau giờ học", example: "I play football after school." },
  ];

  await Promise.all(
    vocabulary.map((item) =>
      prisma.vocabulary.upsert({
        where: {
          lessonId_word: {
            lessonId: lesson.id,
            word: item.word,
          },
        },
        update: {
          meaning: item.meaning,
          example: item.example,
        },
        create: {
          lessonId: lesson.id,
          ...item,
        },
      })
    )
  );

  let exercise = await prisma.exercise.findFirst({
    where: {
      teacherId: teacher.id,
      title: exerciseTitle,
    },
    select: { id: true },
  });

  if (!exercise) {
    exercise = await prisma.exercise.create({
      data: {
        title: exerciseTitle,
        description: "Đọc đoạn văn và chọn đáp án đúng.",
        content:
          "Anna gets up at 6:30 every morning. She has bread and eggs for breakfast. She goes to school by bus. After school, she plays badminton with her friends.",
        skill: Skill.READING,
        difficulty: Difficulty.EASY,
        source: ExerciseSource.MANUAL,
        teacherId: teacher.id,
        lessonId: lesson.id,
        questions: {
          create: questions.map((question, index) => ({
            type: QuestionType.MULTIPLE_CHOICE,
            content: question.content,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order: index + 1,
            options: {
              create: question.options,
            },
          })),
        },
      },
      select: { id: true },
    });
  }

  let assignment = await prisma.assignment.findFirst({
    where: {
      classId: englishClass.id,
      exerciseId: exercise.id,
      teacherId: teacher.id,
      title: assignmentTitle,
    },
    select: { id: true },
  });

  if (!assignment) {
    assignment = await prisma.assignment.create({
      data: {
        title: assignmentTitle,
        description: "Bài đọc mẫu gồm 4 câu trắc nghiệm.",
        startAt: new Date(),
        dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        classId: englishClass.id,
        exerciseId: exercise.id,
        teacherId: teacher.id,
      },
      select: { id: true },
    });
  }

  const questionRows = await prisma.question.findMany({
    where: { exerciseId: exercise.id },
    orderBy: { order: "asc" },
    select: { id: true, correctAnswer: true },
  });

  const sampleSubmissions = [
    {
      student: students[0],
      answers: ["B", "A", "C", "D"],
      score: 100,
      submitted: true,
    },
    {
      student: students[1],
      answers: ["B", "A", "B", "D"],
      score: 75,
      submitted: true,
    },
    {
      student: students[2],
      answers: ["B"],
      score: null,
      submitted: false,
    },
  ];

  for (const sample of sampleSubmissions) {
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: sample.student.id,
        },
      },
      update: {
        score: sample.score,
        submittedAt: sample.submitted ? new Date() : null,
      },
      create: {
        assignmentId: assignment.id,
        studentId: sample.student.id,
        score: sample.score,
        submittedAt: sample.submitted ? new Date() : null,
      },
      select: { id: true },
    });

    for (const [index, answer] of sample.answers.entries()) {
      const question = questionRows[index];
      if (!question) continue;

      const isCorrect = answer === question.correctAnswer;

      const existingAnswer = await prisma.answer.findFirst({
        where: {
          submissionId: submission.id,
          questionId: question.id,
        },
        select: { id: true },
      });

      const answerData = {
        answer,
        isCorrect,
        score: isCorrect ? 25 : 0,
      };

      if (existingAnswer) {
        await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: answerData,
        });
      } else {
        await prisma.answer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            ...answerData,
          },
        });
      }
    }
  }

  console.log("Demo data is ready.");
  console.log(`Teacher: ${teacherEmail}`);
  console.log(`Students: ${studentEmails.join(", ")}`);
  console.log(`Password for new demo accounts: ${demoPassword}`);
  console.log(`Class code: ${classCode}`);
  console.log(`Assignment: ${assignmentTitle} (${questionRows.length} questions)`);
  console.log("Sample submissions: 2 submitted, 1 in progress.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
