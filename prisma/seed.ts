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
    },
  });

  await prisma.lesson.upsert({
    where: {
      unitId_number: {
        unitId: unit.id,
        number: 1,
      },
    },
    update: {
      title: "Daily Activities",
      objectives: "Learn vocabulary about daily activities.",
    },
    create: {
      unitId: unit.id,
      number: 1,
      title: "Daily Activities",
      objectives: "Learn vocabulary about daily activities.",
    },
  });

  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
