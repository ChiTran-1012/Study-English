
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Tạo bộ sách
  const textbook = await prisma.textbook.upsert({
    where: {
      name: "Global Success",
    },
    update: {},
    create: {
      name: "Global Success",
      publisher: "NXB Giáo dục Việt Nam",
    },
  });

  // 2. Tạo Unit 1 - Hello cho lớp 3
  const unit = await prisma.unit.upsert({
    where: {
      textbookId_grade_number: {
        textbookId: textbook.id,
        grade: 3,
        number: 1,
      },
    },
    update: {
      title: "Hello",
    },
    create: {
      textbookId: textbook.id,
      grade: 3,
      number: 1,
      title: "Hello",
      description:
        "Greetings and simple self-introductions",
    },
  });

  // 3. Tạo Lesson mẫu
  const lesson = await prisma.lesson.upsert({
    where: {
      unitId_number: {
        unitId: unit.id,
        number: 1,
      },
    },
    update: {
      title: "Greetings and introductions",
      objectives:
        "Students can greet others and introduce themselves.",
      sourceNote:
        "Demo data; verify against the selected textbook edition.",
    },
    create: {
      unitId: unit.id,
      number: 1,
      title: "Greetings and introductions",
      objectives:
        "Students can greet others and introduce themselves.",
      sourceNote:
        "Demo data; verify against the selected textbook edition.",
    },
  });

  // 4. Tạo từ vựng
  const vocabularyData = [
    { word: "hello", meaning: "xin chào" },
    { word: "hi", meaning: "chào" },
    { word: "name", meaning: "tên" },
    { word: "friend", meaning: "bạn bè" },
  ];

  for (const item of vocabularyData) {
    await prisma.vocabulary.upsert({
      where: {
        lessonId_word: {
          lessonId: lesson.id,
          word: item.word,
        },
      },
      update: {
        meaning: item.meaning,
      },
      create: {
        lessonId: lesson.id,
        word: item.word,
        meaning: item.meaning,
      },
    });
  }

  // 5. Tạo ngữ pháp
  const grammarData = [
    {
      structure: "Hello. I'm ...",
      explanation: "Chào hỏi và giới thiệu bản thân",
      example: "Hello. I'm Nam.",
    },
    {
      structure: "What's your name?",
      explanation: "Hỏi tên người khác",
      example: "What's your name? - My name is Mai.",
    },
  ];

  // Đồng bộ dữ liệu mẫu để chạy seed nhiều lần
  // không tạo thêm các dòng ngữ pháp trùng lặp.
  await prisma.grammarPoint.deleteMany({
    where: { lessonId: lesson.id },
  });

  await prisma.grammarPoint.createMany({
    data: grammarData.map((item) => ({
      lessonId: lesson.id,
      ...item,
    })),
  });

  console.log("Đã tạo dữ liệu chương trình mẫu:");
  console.log("Textbook:", textbook.name);
  console.log("Unit:", unit.title);
  console.log("Lesson:", lesson.title);
}

main()
  .catch((error) => {
    console.error("CURRICULUM SEED ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
