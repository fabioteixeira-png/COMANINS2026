const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  `function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  try {
    ai = new GoogleGenAI({`,
  `function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  const key = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY state:", key ? (key === "MY_GEMINI_API_KEY" ? "DEFAULT" : "PRESENT_AND_REAL") : "MISSING");
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  try {
    ai = new GoogleGenAI({`
);
fs.writeFileSync('server.ts', content);
