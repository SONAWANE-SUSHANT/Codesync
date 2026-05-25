const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const auth = require("../middleware/authMiddleware");

// SEND MESSAGE
router.post("/", auth, async (req, res) => {
  const { projectId, text } = req.body;

  if (!projectId || !text?.trim()) {
    return res.status(400).json({ msg: "Project and message text are required" });
  }

  const msg = await Message.create({
    projectId,
    userId: req.user.id,
    userName: req.user.name || "Someone",
    text: text.trim(),
  });

  res.json(msg);
});

// GET MESSAGES
router.get("/:projectId", auth, async (req, res) => {
  const msgs = await Message.find({
    projectId: req.params.projectId,
  }).sort({ createdAt: 1 });

  res.json(msgs);
});

module.exports = router;
