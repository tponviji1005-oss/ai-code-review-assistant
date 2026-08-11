import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function reviewCode(codePatch) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are an experienced senior software engineer performing a GitHub code review.

Review ONLY the following code changes.

Give your response in this format:

## Summary
...

## Issues
- ...

## Suggestions
- ...

Code Changes:

${codePatch}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}