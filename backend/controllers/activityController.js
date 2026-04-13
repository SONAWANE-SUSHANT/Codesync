const Activity = require("../models/Activity");

// Log an action (called internally from other controllers)
exports.log = async ({ projectId, userId, userName, action, detail = "" }) => {
  try {
    await Activity.create({ projectId, userId, userName, action, detail });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};

// Get activity timeline for a project
exports.getActivity = async (req, res) => {
  try {
    const activities = await Activity.find({ projectId: req.params.projectId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch activity" });
  }
}; 