const Commit = require("../models/Commit");
const { log } = require("./activityController");

exports.createCommit = async (req, res) => {
  try {
    const commit = await Commit.create({
      projectId: req.body.projectId,
      message: req.body.message,
      changes: req.body.changes,
      createdBy: req.user.id,
    });

    await log({
      projectId: req.body.projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "committed",
      detail: req.body.message,
    });

    res.json(commit);
  } catch {
    res.status(500).json({ msg: "Commit failed" });
  }
};

exports.getCommits = async (req, res) => {
  try {
    const commits = await Commit.find({ projectId: req.params.projectId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(commits);
  } catch {
    res.status(500).json({ msg: "Fetch commits failed" });
  }
};