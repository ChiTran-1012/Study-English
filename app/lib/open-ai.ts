import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY chưa được cấu hình trong file .env"
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});