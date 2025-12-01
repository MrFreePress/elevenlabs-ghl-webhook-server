const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function extractAiData(transcript) {
  const prompt = `
Extract the following fields from this phone call transcript:

Transcript:
"""
${transcript}
"""

Return JSON only with this structure:

{
  "firstName": "",
  "lastName": "",
  "email": "",
  "businessName": "",
  "summary": ""
}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",  // or gpt-4.1
    messages: [
      { role: "system", content: "You extract structured data from transcripts." },
      { role: "user", content: prompt }
    ]
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    console.error("AI JSON parse error:", e);
    return null;
  }
}

module.exports = { extractAiData };
