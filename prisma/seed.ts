import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.create({
    data: {
      name: "Teacher Demo",
      email: "teacher@example.com",
      password: "123456",
      role: Role.TEACHER,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: "Student Demo",
      email: "student@example.com",
      password: "123456",
      role: Role.STUDENT,
    },
  });

  const englishGrade = await prisma.grade.create({
    data: {
      name: "Grade 6",
      description: "English curriculum for grade 6",
    },
  });

  const topic = await prisma.topic.create({
    data: {
      name: "Daily Activities",
      description: "Vocabulary and communication about daily activities",
      gradeId: englishGrade.id,
    },
  });

  const englishClass = await prisma.class.create({
    data: {
      name: "English 6A",
      code: "ENG6A",
      grade: 6,
      description: "Demo English class",
      teacherId: teacher.id,
    },
  });

  await prisma.classMember.create({
    data: {
      classId: englishClass.id,
      studentId: student.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Daily Activities",
      description: "Learn vocabulary about daily activities",
      gradeId: englishGrade.id,
      topicId: topic.id,
      content: "Wake up, have breakfast, go to school...",
    },
  });

  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());