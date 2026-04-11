const Message = require("../models/Message");

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const msg = await Message.create(req.body);
    res.json(msg);
  } catch (error) {
    res.status(500).json({ msg: "Send failed", error });
  }
};

// Get messages
exports.getMessages = async (req, res) => {
  try {
    const msgs = await Message.find({ projectId: req.params.projectId })
      .sort({ createdAt: 1 });
    res.json(msgs);
  } catch (error) {
    res.status(500).json({ msg: "Fetch failed", error });
  }
};