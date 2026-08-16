const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  if (process.env.NODE_ENV !== "production") {`;
const replace = `
  app.post("/api/parse-field-service-image", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided." });
      }

      const aiClient = getGeminiClient();
      if (!aiClient) {
        return res.status(503).json({ error: "Gemini API key is missing or invalid." });
      }

      // Prepare image for Gemini Vision
      const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
      
      const prompt = \`
You are an expert data entry assistant. Analyze this image of a handwritten or printed field service form/certificate.
Extract the following information and return ONLY a JSON object with these keys (no markdown formatting, just pure JSON). If a field is not found or unreadable, set its value to an empty string.

Required JSON format:
{
  "tag": "String - Equipment Tag/ID",
  "description": "String - Description of equipment",
  "serialNumber": "String - Serial number",
  "certificate": "String - Certificate number (very important)",
  "interventionDate": "String - Date of intervention (DD/MM/YYYY if possible)",
  "technician": "String - Name of technician",
  "status": "String - e.g. Aprovado, Reprovado",
  "notes": "String - Any additional handwritten notes"
}
\`;

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ] 
          }
        ],
        config: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      });

      const textOutput = response.text();
      let parsedData = {};
      try {
          parsedData = JSON.parse(textOutput);
      } catch (e) {
          // Fallback if there is a problem parsing
          const jsonMatch = textOutput.match(/\\{.*\\}/s);
          if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0]);
          } else {
              throw new Error("Could not parse AI response as JSON");
          }
      }

      res.json(parsedData);
    } catch (err: any) {
      console.error("Error processing field service image:", err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {`;

if (!code.includes('/api/parse-field-service-image')) {
  code = code.replace(target, replace);
  fs.writeFileSync('server.ts', code);
  console.log('Endpoint added.');
} else {
  console.log('Endpoint already exists.');
}
