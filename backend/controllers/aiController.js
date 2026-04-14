const axios = require("axios");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

exports.aiAssist = async (req, res) => {
  const { code, language, prompt, mode } = req.body;

  // Build the prompt based on mode
  let userPrompt = "";
  if (mode === "explain") {
    userPrompt = `Explain this ${language} code clearly and concisely:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (mode === "fix") {
    userPrompt = `Find and fix bugs in this ${language} code. Show the fixed code and briefly explain what was wrong:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (mode === "improve") {
    userPrompt = `Suggest improvements for this ${language} code (performance, readability, best practices). Show improved version:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else {
    // freeform
    userPrompt = prompt + (code ? `\n\nHere is the code context:\n\`\`\`${language}\n${code}\n\`\`\`` : "");
  }

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
    res.json({ result: text });
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);
    res.status(500).json({ msg: "AI request failed" });
  }
};