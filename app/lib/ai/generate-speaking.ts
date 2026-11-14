
import { openai } from "@/app/lib/open-ai";

export type SpeakingDifficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type SpeakingQuestionType =
  | "READ_ALOUD"
  | "SHORT_ANSWER"
  | "DESCRIPTION"
  | "ROLE_PLAY";

export type SpeakingQuestion = {
  content: string;
  type: SpeakingQuestionType;
  instructions: string;
  referenceAnswer: string;
  keywords: string[];
  preparationSeconds: number;
  speakingSeconds: number;
};

export type SpeakingExercise = {
  title: string;
  description: string;
  topic: string;
  questions: SpeakingQuestion[];
};

export type GenerateSpeakingInput = {
  grade: number;
  topic: string;
  difficulty: SpeakingDifficulty;
  questionCount: number;
};

export class SpeakingGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpeakingGenerationError";
  }
}

const QUESTION_TYPES: SpeakingQuestionType[] = [
  "READ_ALOUD",
  "SHORT_ANSWER",
  "DESCRIPTION",
  "ROLE_PLAY",
];

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getSpeakingRules(grade: number) {
  if (grade <= 2) {
    return {
      allowedTypes: [
        "READ_ALOUD",
        "SHORT_ANSWER",
      ] as SpeakingQuestionType[],
      minSpeakingSeconds: 10,
      maxSpeakingSeconds: 30,
      description:
        "Use familiar words, very short sentences, greetings, names, family, animals and school objects.",
    };
  }

  if (grade <= 5) {
    return {
      allowedTypes: [
        "READ_ALOUD",
        "SHORT_ANSWER",
        "DESCRIPTION",
      ] as SpeakingQuestionType[],
      minSpeakingSeconds: 15,
      maxSpeakingSeconds: 60,
      description:
        "Use simple everyday conversations, short descriptions and familiar situations.",
    };
  }

  return {
    allowedTypes: QUESTION_TYPES,
    minSpeakingSeconds: 30,
    maxSpeakingSeconds: 120,
    description:
      "Use age-appropriate conversations, descriptions, personal opinions and practical communication situations.",
  };
}

function validateSpeakingExercise(
  value: unknown,
  input: GenerateSpeakingInput
): SpeakingExercise {
  if (!isObject(value)) {
    throw new SpeakingGenerationError(
      "AI trả về dữ liệu không hợp lệ."
    );
  }

  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.description !== "string" ||
    !Array.isArray(value.questions)
  ) {
    throw new SpeakingGenerationError(
      "Bài Speaking thiếu thông tin bắt buộc."
    );
  }

  if (value.questions.length !== input.questionCount) {
    throw new SpeakingGenerationError(
      `AI phải tạo đúng ${input.questionCount} câu hỏi.`
    );
  }

  const rules = getSpeakingRules(input.grade);

  const questions: SpeakingQuestion[] =
    value.questions.map((rawQuestion, index) => {
      if (!isObject(rawQuestion)) {
        throw new SpeakingGenerationError(
          `Câu ${index + 1} không hợp lệ.`
        );
      }

      const {
        content,
        type,
        instructions,
        referenceAnswer,
        keywords,
        preparationSeconds,
        speakingSeconds,
      } = rawQuestion;

      if (
        typeof content !== "string" ||
        !content.trim() ||
        typeof type !== "string" ||
        !rules.allowedTypes.includes(
          type as SpeakingQuestionType
        ) ||
        typeof instructions !== "string" ||
        !instructions.trim() ||
        typeof referenceAnswer !== "string" ||
        !referenceAnswer.trim() ||
        !Array.isArray(keywords) ||
        keywords.length === 0 ||
        keywords.length > 10 ||
        !keywords.every(
          (keyword) =>
            typeof keyword === "string" &&
            keyword.trim().length > 0
        ) ||
        typeof preparationSeconds !== "number" ||
        !Number.isInteger(preparationSeconds) ||
        preparationSeconds < 0 ||
        preparationSeconds > 120 ||
        typeof speakingSeconds !== "number" ||
        !Number.isInteger(speakingSeconds) ||
        speakingSeconds < rules.minSpeakingSeconds ||
        speakingSeconds > rules.maxSpeakingSeconds
      ) {
        throw new SpeakingGenerationError(
          `Câu Speaking ${index + 1} không đúng cấu trúc hoặc độ khó.`
        );
      }

      return {
        content,
        type: type as SpeakingQuestionType,
        instructions,
        referenceAnswer,
        keywords: keywords as string[],
        preparationSeconds,
        speakingSeconds,
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
  input: GenerateSpeakingInput
): string {
  const rules = getSpeakingRules(input.grade);

  return `
You are an experienced English speaking teacher
for Vietnamese students from grade 1 to grade 9.

Create ONE English speaking practice exercise.

STUDENT INFORMATION:
Grade: ${input.grade}
Topic: ${input.topic}
Difficulty: ${input.difficulty}
Number of questions: ${input.questionCount}

LANGUAGE REQUIREMENTS:
- ${rules.description}
- Use clear and natural English.
- All questions must be age-appropriate.
- Avoid sensitive or inappropriate topics.
- Avoid complex vocabulary for young students.
- Make each question possible to answer by speaking.

ALLOWED QUESTION TYPES:
${rules.allowedTypes.join(", ")}

QUESTION TYPE DEFINITIONS:

READ_ALOUD:
- Ask the student to read a short sentence aloud.
- The content must be the exact sentence to read.
- The referenceAnswer must match that sentence.

SHORT_ANSWER:
- Ask a simple spoken question.
- Example: What is your favorite animal?
- Provide one sample reference answer.
- Accept that students may have different valid answers.

DESCRIPTION:
- Ask students to describe a familiar topic.
- Example: Describe your classroom.
- Do not require an image.
- Provide an age-appropriate reference answer.

ROLE_PLAY:
- Present a short communication situation.
- Example: You are ordering food at a restaurant.
- Ask the student to respond naturally.
- Provide a sample response.

FOR EACH QUESTION:
- content: English question or sentence.
- type: one allowed type.
- instructions: short Vietnamese instructions.
- referenceAnswer: example English answer.
- keywords: 2 to 6 useful English words.
- preparationSeconds: integer from 0 to 120.
- speakingSeconds: integer from
  ${rules.minSpeakingSeconds} to
  ${rules.maxSpeakingSeconds}.

IMPORTANT:
- Create exactly ${input.questionCount} questions.
- Include a variety of allowed types.
- Do not include audio files or URLs.
- Do not include markdown.
- Return valid JSON only.

OUTPUT JSON FORMAT:

{
  "title": "Speaking Practice",
  "description": "Short Vietnamese description",
  "topic": "${input.topic}",
  "questions": [
    {
      "content": "What is your favorite animal?",
      "type": "SHORT_ANSWER",
      "instructions": "Hãy trả lời bằng tiếng Anh.",
      "referenceAnswer": "My favorite animal is a cat.",
      "keywords": ["favorite", "animal", "cat"],
      "preparationSeconds": 15,
      "speakingSeconds": 30
    }
  ]
}
`;
}

export async function generateSpeakingExercise(
  input: GenerateSpeakingInput
): Promise<SpeakingExercise> {
  // 1. Kiểm tra khối lớp
  if (
    !Number.isInteger(input.grade) ||
    input.grade < 1 ||
    input.grade > 9
  ) {
    throw new SpeakingGenerationError(
      "Khối lớp phải từ 1 đến 9."
    );
  }

  // 2. Kiểm tra chủ đề
  if (
    typeof input.topic !== "string" ||
    !input.topic.trim() ||
    input.topic.trim().length > 100
  ) {
    throw new SpeakingGenerationError(
      "Chủ đề phải có từ 1 đến 100 ký tự."
    );
  }

  // 3. Kiểm tra độ khó
  if (
    !["EASY", "MEDIUM", "HARD"].includes(
      input.difficulty
    )
  ) {
    throw new SpeakingGenerationError(
      "Độ khó không hợp lệ."
    );
  }

  // 4. Kiểm tra số câu
  if (
    !Number.isInteger(input.questionCount) ||
    input.questionCount < 1 ||
    input.questionCount > 10
  ) {
    throw new SpeakingGenerationError(
      "Số câu hỏi phải từ 1 đến 10."
    );
  }

  const normalizedInput = {
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
              "You create safe, age-appropriate English speaking exercises. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const output = response.output_text?.trim();

      if (!output) {
        throw new SpeakingGenerationError(
          "AI không trả về nội dung."
        );
      }

      const cleaned = output
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed: unknown = JSON.parse(cleaned);

      return validateSpeakingExercise(
        parsed,
        normalizedInput
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định.";

      console.error(
        `SPEAKING GENERATION ATTEMPT ${attempt}:`,
        lastError
      );
    }
  }

  throw new SpeakingGenerationError(
    `Không thể tạo bài Speaking hợp lệ sau 3 lần thử: ${lastError}`
  );
}
