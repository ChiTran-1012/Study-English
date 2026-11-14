export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "REORDER", "MATCHING"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionOption = { label: string; content: string; isCorrect: boolean };
export type GeneratedQuestion = {
  content: string;
  type: QuestionType;
  explanation: string;
  correctAnswer: string;
  options: QuestionOption[];
};
export type ReadingExercise = { title: string; description: string; content: string; questions: GeneratedQuestion[] };
export type ReadingRules = { minWords: number; maxWords: number; languageLevel: string };

export function getReadingRules(grade: number): ReadingRules {
  if (grade <= 2) return { minWords: 25, maxWords: 80, languageLevel: "Use very short, simple sentences and familiar basic vocabulary." };
  if (grade <= 5) return { minWords: 60, maxWords: 180, languageLevel: "Use simple, connected sentences and elementary grammar." };
  return { minWords: 120, maxWords: 300, languageLevel: "Use age-appropriate lower-secondary English, coherent paragraphs and accessible grammar." };
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function string(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
export function validateReadingExercise(
  input: unknown,
  questionCount: number,
  rules: ReadingRules,
  allowedTypes: readonly QuestionType[] = QUESTION_TYPES,
): { valid: boolean; errors: string[]; exercise?: ReadingExercise } {
  const errors: string[] = [];
  if (!record(input)) return { valid: false, errors: ["Exercise phải là object."] };
  const title = string(input.title);
  const description = string(input.description);
  const content = string(input.content);
  if (!title) errors.push("Thiếu tiêu đề.");
  if (!content) errors.push("Thiếu bài đọc.");
  const words = content.split(/\s+/).filter(Boolean).length;
  if (words < rules.minWords || words > rules.maxWords) errors.push(`Bài đọc có ${words} từ, yêu cầu ${rules.minWords}-${rules.maxWords}.`);
  const rawQuestions = input.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== questionCount) {
    errors.push(`Phải có đúng ${questionCount} câu hỏi.`);
    return { valid: false, errors };
  }
  const questions: GeneratedQuestion[] = [];
  rawQuestions.forEach((raw: unknown, index: number) => {
    const prefix = `Câu ${index + 1}`;
    if (!record(raw)) { errors.push(`${prefix}: không phải object.`); return; }
    const type = raw.type;
    if (typeof type !== "string" || !QUESTION_TYPES.includes(type as QuestionType) || !allowedTypes.includes(type as QuestionType)) {
      errors.push(`${prefix}: dạng câu hỏi không hợp lệ.`); return;
    }
    const questionType = type as QuestionType;
    const questionContent = string(raw.content);
    const explanation = string(raw.explanation);
    const correctAnswer = string(raw.correctAnswer);
    const options: QuestionOption[] = [];
    if (!questionContent) errors.push(`${prefix}: thiếu nội dung.`);
    if (!explanation) errors.push(`${prefix}: thiếu giải thích.`);
    if (!correctAnswer) errors.push(`${prefix}: thiếu correctAnswer.`);
    if (questionType === "MULTIPLE_CHOICE") {
      if (!Array.isArray(raw.options) || raw.options.length !== 4) errors.push(`${prefix}: cần đúng 4 lựa chọn.`);
      else {
        raw.options.forEach((o: unknown, j: number) => {
          if (!record(o) || o.label !== "ABCD"[j] || !string(o.content) || typeof o.isCorrect !== "boolean") {
            errors.push(`${prefix}: lựa chọn ${j + 1} không hợp lệ.`);
          } else options.push({ label: o.label as string, content: string(o.content), isCorrect: o.isCorrect as boolean });
        });
        if (options.length === 4 && (options.filter(o => o.isCorrect).length !== 1 || options.find(o => o.isCorrect)?.label !== correctAnswer)) errors.push(`${prefix}: correctAnswer phải là nhãn A/B/C/D đúng.`);
      }
    } else if (questionType === "TRUE_FALSE") {
      if (!["TRUE", "FALSE"].includes(correctAnswer.toUpperCase())) errors.push(`${prefix}: correctAnswer phải là TRUE hoặc FALSE.`);
    } else if (questionType === "FILL_BLANK") {
      if (!questionContent.includes("_____")) errors.push(`${prefix}: câu điền từ cần chứa _____.`);
      if (correctAnswer.includes("|")) errors.push(`${prefix}: chỉ chấp nhận một đáp án điền từ.`);
    } else if (questionType === "REORDER") {
      // Quy ước: content là các từ/cụm từ tách bởi |, correctAnswer là câu hoàn chỉnh.
      const pieces = questionContent.split("|").map(s => s.trim()).filter(Boolean);
      if (pieces.length < 3) errors.push(`${prefix}: cần ít nhất 3 mảnh tách bởi |.`);
      const tokenize = (s: string) => (s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).sort().join("|");
      if (pieces.length >= 3 && tokenize(pieces.join(" ")) !== tokenize(correctAnswer)) errors.push(`${prefix}: đáp án sắp xếp không khớp các từ đã cho.`);
    } else if (questionType === "MATCHING") {
      // content: "cat | dog | bird"; options: nhãn A/B/C chứa vế phải; correctAnswer: "1-B,2-C,3-A".
      const left = questionContent.split("|").map(s => s.trim()).filter(Boolean);
      if (left.length < 2 || left.length > 6) errors.push(`${prefix}: cần 2-6 mục bên trái, tách bởi |.`);
      if (!Array.isArray(raw.options) || raw.options.length !== left.length) errors.push(`${prefix}: số mục bên phải phải bằng bên trái.`);
      else raw.options.forEach((o: unknown, j: number) => {
        if (!record(o) || o.label !== "ABCDEF"[j] || !string(o.content)) errors.push(`${prefix}: mục ghép ${j + 1} không hợp lệ.`);
        else options.push({ label: o.label as string, content: string(o.content), isCorrect: false });
      });
      const pairs = correctAnswer.split(",").map(s => s.trim());
      const expected = new Set(left.map((_, i) => String(i + 1)));
      const targets = new Set<string>();
      for (const pair of pairs) {
        const match = pair.match(/^(\d+)-([A-F])$/);
        if (!match || !expected.delete(match[1]) || targets.has(match[2]) || !options.some(o => o.label === match[2])) { errors.push(`${prefix}: đáp án Matching không hợp lệ.`); break; }
        targets.add(match[2]);
      }
      if (pairs.length !== left.length || expected.size !== 0 || targets.size !== left.length) errors.push(`${prefix}: Matching phải ghép 1-1 đủ mọi mục.`);
    }
    questions.push({ content: questionContent, type: questionType, explanation, correctAnswer, options });
  });
  if (questions.length !== questionCount) errors.push("Số câu hỏi hợp lệ không đủ.");
  for (const t of allowedTypes) {
    if (questionCount >= allowedTypes.length && !questions.some(q => q.type === t)) errors.push(`Thiếu dạng ${t}.`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], exercise: { title, description, content, questions } };
}
