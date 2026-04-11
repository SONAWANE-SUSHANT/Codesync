const axios = require("axios");

exports.runCode = async (req, res) => {
  try {
    const { code, language_id } = req.body;

    // Submit code
    const submission = await axios.post(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=false",
      {
        source_code: code,
        language_id: Number(language_id),
      }
    );

    const token = submission.data.token;

    // Poll until result is ready (max 10 seconds)
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));

      const resp = await axios.get(
        `https://ce.judge0.com/submissions/${token}?base64_encoded=false`
      );

      // status id 1 = In Queue, 2 = Processing
      if (resp.data.status.id > 2) {
        result = resp.data;
        break;
      }
    }

    if (!result) return res.status(408).json({ msg: "Execution timed out" });

    res.json({
      output: result.stdout || result.stderr || result.compile_output || "No output",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Execution failed" });
  }
};