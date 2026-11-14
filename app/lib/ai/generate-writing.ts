
import { openai } from "@/app/lib/open-ai";

export type WritingDifficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type WritingQuestionType =
  | "WORD_WRITING"
  | "SENTENCE_WRITING"
  | "PARAGRAPH_WRITING"
  | "GUIDED_WRITING";

export type WritingQuestion = {
  content: string;
  type: WritingQuestionType;
  instructions: string;
  hints: string[];
  referenceAnswer: string;
  minWords: number;
  maxWords: number;
};

export type WritingExercise = {
  title: string;
  description: string;
  topic: string;
  questions: WritingQuestion[];
};

export type GenerateWritingInput = {
  grade: number;
  topic: string;
  difficulty: WritingDifficulty;
  questionCount: number;
};

export class WritingGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritingGenerationError";
  }
}

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getWritingRules(grade: number) {
  if (grade <= 2) {
    return {
      allowedTypes: [
        "WORD_WRITING",
        "SENTENCE_WRITING",
      ] as WritingQuestionType[],
      minWords: 1,
      maxWords: 20,
      description:
        "Use familiar vocabulary, basic spelling, short phrases and very simple sentences.",
    };
  }

  if (grade <= 5) {
    return {
      allowedTypes: [
        "SENTENCE_WRITING",
        "PARAGRAPH_WRITING",
        "GUIDED_WRITING",
      ] as WritingQuestionType[],
      minWords: 5,
      maxWords: 100,
      description:
        "Use simple sentences and short paragraphs about familiar topics, with clear writing prompts.",
    };
  }

  return {
    allowedTypes: [
      "SENTENCE_WRITING",
      "PARAGRAPH_WRITING",
      "GUIDED_WRITING",
    ] as WritingQuestionType[],
    minWords: 10,
    maxWords: 200,
    description:
      "Use age-appropriate writing tasks involving descriptions, opinions, experiences and short compositions.",
  };
}

function validateWritingExercise(
  value: unknown,
  input: GenerateWritingInput
): WritingExercise {
  if (!isObject(value)) {
    throw new WritingGenerationError(
      "AI trả về dữ liệu không hợp lệ."
    );
  }

  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.description !== "string" ||
    !Array.isArray(value.questions) ||
    value.questions.length !== input.questionCount
  ) {
    throw new WritingGenerationError(
      "Bài Writing không đúng cấu trúc."
    );
  }

  const rules = getWritingRules(input.grade);

  const questions: WritingQuestion[] =
    value.questions.map((rawQuestion, index) => {
      if (!isObject(rawQuestion)) {
        throw new WritingGenerationError(
          `Câu ${index + 1} không hợp lệ.`
        );
      }

      const {
        content,
        type,
        instructions,
        hints,
        referenceAnswer,
        minWords,
        maxWords,
      } = rawQuestion;

      if (
        typeof content !== "string" ||
        !content.trim() ||
        typeof type !== "string" ||
        !rules.allowedTypes.includes(
          type as WritingQuestionType
        ) ||
        typeof instructions !== "string" ||
        !instructions.trim() ||
        !Array.isArray(hints) ||
        hints.length > 8 ||
        !hints.every(
          (hint) =>
            typeof hint === "string" &&
            hint.trim().length > 0
        ) ||
        typeof referenceAnswer !== "string" ||
        !referenceAnswer.trim() ||
        !Number.isInteger(minWords) ||
        !Number.isInteger(maxWords) ||
        (minWords as number) < rules.minWords ||
        (maxWords as number) > rules.maxWords ||
        (minWords as number) > (maxWords as number)
      ) {
        throw new WritingGenerationError(
          `Câu Writing ${index + 1} không hợp lệ.`
        );
      }

      return {
        content,
        type: type as WritingQuestionType,
        instructions,
        hints: hints as string[],
        referenceAnswer,
        minWords: minWords as number,
        maxWords: maxWords as number,
      };
    });

  return {
    title: value.title,
    description: value.description,
    topic: input.topic,
    questions,
  };
}

function buildPrompt(
  input: GenerateWritingInput
): string {
  const rules = getWritingRules(input.grade);

  return `
You are an experienced English writing teacher
for Vietnamese students in grades 1 to 9.

Create ONE English writing practice exercise.

STUDENT INFORMATION:
Grade: ${input.grade}
Topic: ${JSON.stringify(input.topic)}
Difficulty: ${input.difficulty}
Number of questions: ${input.questionCount}

LANGUAGE REQUIREMENTS:
${rules.description}

ALLOWED QUESTION TYPES:
${rules.allowedTypes.join(", ")}

QUESTION TYPE DEFINITIONS:

WORD_WRITING:
- Ask students to write an English word or phrase.
- Give a clear Vietnamese instruction.
- Example: Write the English word for "con mèo".
- Provide a correct reference answer.

SENTENCE_WRITING:
- Ask students to write one or more English sentences.
- Example: Write two sentences about your family.
- Provide useful vocabulary hints.

PARAGRAPH_WRITING:
- Ask students to write a short paragraph.
- Example: Write about your best friend.
- Provide a sample paragraph.

GUIDED_WRITING:
- Ask students to write using guiding questions.
- Example: What is your hobby?
  When do you do it? Why do you like it?
- Provide clear prompts and a sample answer.

FOR EACH QUESTION:
- content: English writing prompt.
- type: one allowed question type.
- instructions: Vietnamese instructions.
- hints: 2 to 5 useful English words or phrases.
- referenceAnswer: an age-appropriate example answer.
- minWords: integer >= ${rules.minWords}.
- maxWords: integer <= ${rules.maxWords}.
- minWords must not exceed maxWords.

IMPORTANT RULES:
1. Create exactly ${input.questionCount} questions.
2. Match vocabulary and grammar to the grade.
3. Keep writing tasks appropriate for children.
4. Avoid sensitive or inappropriate content.
5. Use a variety of allowed question types.
6. Reference answers are examples, except for
   tasks with one objectively correct word.
7. Keep word limits realistic for each task.
8. Return valid JSON only.
9. Do not include markdown.

OUTPUT JSON STRUCTURE:

{
  "title": "Writing Practice",
  "description": "Mô tả ngắn bằng tiếng Việt",
  "topic": "Family",
  "questions": [
    {
      "content": "Write three sentences about your family.",
      "type": "SENTENCE_WRITING",
      "instructions": "Viết ba câu tiếng Anh về gia đình.",
      "hints": [
        "father",
        "mother",
        "family"
      ],
      "referenceAnswer": "I have a small family. My father is a teacher. I love my family.",
      "minWords": 10,
      "maxWords": 40
    }
  ]
}
`;
}

export async function generateWritingExercise(
  input: GenerateWritingInput
): Promise<WritingExercise> {
  // 1. Kiểm tra khối lớp
  if (
    !Number.isInteger(input.grade) ||
    input.grade < 1 ||
    input.grade > 9
  ) {
    throw new WritingGenerationError(
      "Khối lớp phải từ 1 đến 9."
    );
  }

  // 2. Kiểm tra chủ đề
  if (
    typeof input.topic !== "string" ||
    !input.topic.trim() ||
    input.topic.trim().length > 100
  ) {
    throw new WritingGenerationError(
      "Chủ đề phải có từ 1 đến 100 ký tự."
    );
  }

  // 3. Kiểm tra độ khó
  if (
    !["EASY", "MEDIUM", "HARD"].includes(
      input.difficulty
    )
  ) {
    throw new WritingGenerationError(
      "Độ khó không hợp lệ."
    );
  }

  // 4. Kiểm tra số câu hỏi
  if (
    !Number.isInteger(input.questionCount) ||
    input.questionCount < 1 ||
    input.questionCount > 10
  ) {
    throw new WritingGenerationError(
      "Số câu hỏi phải từ 1 đến 10."
    );
  }

  const normalizedInput: GenerateWritingInput = {
    ...input,
    topic: input.topic.trim(),
  };

  const prompt = buildPrompt(normalizedInput);

  let lastError = "";

  // 5. Gọi AI và kiểm tra dữ liệu
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "You generate safe, age-appropriate English writing exercises. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const output = response.output_text?.trim();

      if (!output) {
        throw new WritingGenerationError(
          "AI không trả về nội dung."
        );
      }

      const cleaned = output
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed: unknown = JSON.parse(cleaned);

      return validateWritingExercise(
        parsed,
        normalizedInput
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định.";

      console.error(
        `WRITING GENERATION ATTEMPT ${attempt}:`,
        lastError
      );
    }
  }

  throw new WritingGenerationError(
    `Không thể tạo bài Writing hợp lệ sau 3 lần thử: ${lastError}`
  );
}
