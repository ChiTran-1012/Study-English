
async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("Textbook:", typeof prisma.textbook);
    console.log("Unit:", typeof prisma.unit);
    console.log("Lesson:", typeof prisma.lesson);
    console.log("Vocabulary:", typeof prisma.vocabulary);
    console.log("GrammarPoint:", typeof prisma.grammarPoint);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
