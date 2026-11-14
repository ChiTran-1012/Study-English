
import { openai } from "@/app/lib/open-ai";

export type ListeningDifficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type ListeningQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK";

export type ListeningOption = {
  label: string;
  content: string;
};

export type ListeningQuestion = {
  content: string;
  type: ListeningQuestionType;
  options: ListeningOption[];
  correctAnswer: string;
  explanation: string;
};

export type ListeningExercise = {
  title: string;
  description: string;
  transcript: string;
  questions: ListeningQuestion[];
};

export type GenerateListeningInput = {
  grade: number;
  topic: string;
  difficulty: ListeningDifficulty;
  questionCount: number;
};

export class ListeningGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListeningGenerationError";
  }
}

function getListeningRules(grade: number) {
  if (grade <= 2) {
    return {
      minWords: 20,
      maxWords: 65,
      description:
        "Use very short sentences, familiar vocabulary, and simple everyday situations.",
    };
  }

  if (grade <= 5) {
    return {
      minWords: 50,
      maxWords: 130,
      description:
        "Use short conversations or simple stories with clear everyday vocabulary.",
    };
  }

  return {
    minWords: 100,
    maxWords: 220,
    description:
      "Use age-appropriate conversations, announcements, or short informational passages.",
  };
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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

function validateListeningExercise(
  input: unknown,
  questionCount: number,
  grade: number
): ListeningExercise {
  if (!isObject(input)) {
    throw new ListeningGenerationError(
      "AI trả về dữ liệu không hợp lệ."
    );
  }

  const { title, description, transcript, questions } =
    input;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    typeof transcript !== "string" ||
    !transcript.trim() ||
    !Array.isArray(questions)
  ) {
    throw new ListeningGenerationError(
      "Bài Listening thiếu thông tin bắt buộc."
    );
  }

  const rules = getListeningRules(grade);
  const wordCount = countWords(transcript);

  if (
    wordCount < rules.minWords ||
    wordCount > rules.maxWords
  ) {
    throw new ListeningGenerationError(
      `Đoạn nghe phải có ${rules.minWords}-${rules.maxWords} từ. AI tạo ${wordCount} từ.`
    );
  }

  if (questions.length !== questionCount) {
    throw new ListeningGenerationError(
      `AI phải tạo đúng ${questionCount} câu hỏi.`
    );
  }

  const allowedTypes: ListeningQuestionType[] = [
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "FILL_BLANK",
  ];

  const validatedQuestions: ListeningQuestion[] =
    questions.map((rawQuestion, index) => {
      if (!isObject(rawQuestion)) {
        throw new ListeningGenerationError(
          `Câu ${index + 1} không hợp lệ.`
        );
      }

      const {
        content,
        type,
        options,
        correctAnswer,
        explanation,
      } = rawQuestion;

      if (
        typeof content !== "string" ||
        !content.trim() ||
        !allowedTypes.includes(
          type as ListeningQuestionType
        ) ||
        typeof correctAnswer !== "string" ||
        !correctAnswer.trim() ||
        typeof explanation !== "string" ||
        !Array.isArray(options)
      ) {
        throw new ListeningGenerationError(
          `Câu ${index + 1} thiếu dữ liệu.`
        );
      }

      const questionType =
        type as ListeningQuestionType;

      const parsedOptions: ListeningOption[] =
        options.map((option) => {
          if (
            !isObject(option) ||
            typeof option.label !== "string" ||
            typeof option.content !== "string"
          ) {
            throw new ListeningGenerationError(
              `Đáp án lựa chọn ở câu ${index + 1} không hợp lệ.`
            );
          }

          return {
            label: option.label,
            content: option.content,
          };
        });

      if (questionType === "MULTIPLE_CHOICE") {
        const labels = parsedOptions.map(
          (option) => option.label.toUpperCase()
        );

        if (
          parsedOptions.length !== 4 ||
          labels.join(",") !== "A,B,C,D" ||
          !["A", "B", "C", "D"].includes(
            correctAnswer.toUpperCase()
          )
        ) {
          throw new ListeningGenerationError(
            `Câu ${index + 1}: trắc nghiệm phải có 4 lựa chọn A-D.`
          );
        }
      }

      if (questionType === "TRUE_FALSE") {
        if (
          !["TRUE", "FALSE"].includes(
            correctAnswer.toUpperCase()
          )
        ) {
          throw new ListeningGenerationError(
            `Câu ${index + 1}: đáp án phải là TRUE hoặc FALSE.`
          );
        }
      }

      if (questionType === "FILL_BLANK") {
        if (!content.includes("_____")) {
          throw new ListeningGenerationError(
            `Câu ${index + 1}: câu điền từ phải có dấu _____.`
          );
        }
      }

      return {
        content,
        type: questionType,
        options: parsedOptions,
        correctAnswer,
        explanation,
      };
    });

  return {
    title,
    description,
    transcript,
    questions: validatedQuestions,
  };
}

function buildPrompt(
  input: GenerateListeningInput
): string {
  const rules = getListeningRules(input.grade);

  return `
You are an experienced English teacher creating
listening exercises for Vietnamese school students.

Create ONE English listening exercise.

STUDENT INFORMATION:
- Grade: ${input.grade}
- Topic: ${input.topic}
- Difficulty: ${input.difficulty}
- Number of questions: ${input.questionCount}

LISTENING PASSAGE RULES:
- ${rules.description}
- Transcript length: ${rules.minWords} to ${rules.maxWords} words.
- Use natural, grammatically correct English.
- Use vocabulary appropriate for grade ${input.grade}.
- The transcript will be converted into audio.
- Do not include markdown or pronunciation notes.
- Do not include sound effects or stage directions.
- The transcript must be understandable when read aloud.
- All answers must be supported by the transcript.

QUESTION RULES:
- Create exactly ${input.questionCount} questions.
- Allowed question types:
  MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK.
- Include a variety of question types.
- Questions must test listening comprehension.
- Do not require knowledge outside the transcript.

MULTIPLE_CHOICE:
- Provide exactly four options.
- Labels must be A, B, C, D.
- correctAnswer must be the correct option label.

TRUE_FALSE:
- options must be [].
- correctAnswer must be TRUE or FALSE.

FILL_BLANK:
- The question must contain "_____".
- options must be [].
- correctAnswer must be a word or short phrase
  explicitly present in the transcript.

OUTPUT:
Return ONLY valid JSON with this structure:

{
  "title": "Listening title",
  "description": "Short instructions",
  "transcript": "English listening passage",
  "questions": [
    {
      "content": "Question text",
      "type": "MULTIPLE_CHOICE",
      "options": [
        {"label": "A", "content": "Option A"},
        {"label": "B", "content": "Option B"},
        {"label": "C", "content": "Option C"},
        {"label": "D", "content": "Option D"}
      ],
      "correctAnswer": "A",
      "explanation": "Explanation in Vietnamese"
    }
  ]
}

IMPORTANT:
- Return JSON only.
- No markdown code fences.
- No text before or after the JSON.
- Do not reveal answers inside the description.
`;
}

export async function generateListeningExercise(
  input: GenerateListeningInput
): Promise<ListeningExercise> {
  if (
    !Number.isInteger(input.grade) ||
    input.grade < 1 ||
    input.grade > 9
  ) {
    throw new ListeningGenerationError(
      "Khối lớp phải từ 1 đến 9."
    );
  }

  if (
    typeof input.topic !== "string" ||
    !input.topic.trim() ||
    input.topic.length > 100
  ) {
    throw new ListeningGenerationError(
      "Chủ đề không hợp lệ."
    );
  }

  if (
    !["EASY", "MEDIUM", "HARD"].includes(
      input.difficulty
    )
  ) {
    throw new ListeningGenerationError(
      "Độ khó không hợp lệ."
    );
  }

  if (
    !Number.isInteger(input.questionCount) ||
    input.questionCount < 1 ||
    input.questionCount > 10
  ) {
    throw new ListeningGenerationError(
      "Số câu hỏi phải từ 1 đến 10."
    );
  }

  const prompt = buildPrompt(input);

  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "You generate educational English listening exercises. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const output = response.output_text?.trim();

      if (!output) {
        throw new ListeningGenerationError(
          "AI không trả về nội dung."
        );
      }

      const cleaned = output
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed: unknown = JSON.parse(cleaned);

      return validateListeningExercise(
        parsed,
        input.questionCount,
        input.grade
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định.";

      console.error(
        `LISTENING GENERATION ATTEMPT ${attempt}:`,
        lastError
      );
    }
  }

  throw new ListeningGenerationError(
    `Không thể tạo bài Listening hợp lệ sau 3 lần thử: ${lastError}`
  );
}
