const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// SEND MESSAGE
router.post("/", async (req, res) => {
  const { projectId, text } = req.body;

  const msg = await Message.create({
    projectId,
    text,
  });

  res.json(msg);
});

// GET MESSAGES
router.get("/:projectId", async (req, res) => {
  const msgs = await Message.find({
    projectId: req.params.projectId,
  });

  res.json(msgs);
});

module.exports = router;