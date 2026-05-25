const axios = require("axios");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

exports.aiAssist = async (req, res) => {
  const { code, language, prompt, mode } = req.body;
  const responseStyle = "\n\nWhen you include code, always wrap it in fenced markdown code blocks with the language name so the editor can show it as copyable code.";

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ msg: "Gemini API key is missing" });
  }

  // Build the prompt based on mode
  let userPrompt = "";
  if (mode === "explain") {
    userPrompt = `Explain this ${language} code clearly and concisely:${responseStyle}\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (mode === "fix") {
    userPrompt = `Find and fix bugs in this ${language} code. Show the fixed code and briefly explain what was wrong:${responseStyle}\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (mode === "improve") {
    userPrompt = `Suggest improvements for this ${language} code (performance, readability, best practices). Show improved version:${responseStyle}\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else {
    // freeform
    userPrompt = prompt + responseStyle + (code ? `\n\nHere is the code context:\n\`\`\`${language}\n${code}\n\`\`\`` : "");
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
    const apiMessage =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message;

    console.error("Gemini error:", apiMessage);
    res.status(err.response?.status || 500).json({
      msg: "AI request failed",
      error: apiMessage,
    });
  }
};
