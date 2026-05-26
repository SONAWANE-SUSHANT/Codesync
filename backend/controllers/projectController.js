const Project = require("../models/Project");
const User = require("../models/User");
const File = require("../models/File");
const { log } = require("./activityController");

// Create Project
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });

    await log({
      projectId: project._id,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "created_project",
      detail: project.name,
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ msg: "Project creation failed" });
  }
};

// Get Projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id });
    res.json(projects);
  } catch {
    res.status(500).json({ msg: "Fetch failed" });
  }
};

// Invite User (with role)
exports.inviteUser = async (req, res) => {
  try {
    const { email, projectId, role = "editor" } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Prevent duplicate
    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(400).json({ msg: "User is already a member" });

    project.members.push({ user: user._id, role });
    await project.save();

    await log({
      projectId,
      userId: req.user.id,
      userName: req.user.name || "Someone",
      action: "invited",
      detail: `${email} as ${role}`,
    });

    res.json({ msg: "User added", role });
  } catch (err) {
    res.status(500).json({ msg: "Invite failed" });
  }
};

// Change a member's role
exports.changeRole = async (req, res) => {
  try {
    const { projectId, userId, role } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    const member = project.members.find(m => m.user.toString() === userId);
    if (!member) return res.status(404).json({ msg: "Member not found" });

    member.role = role;
    await project.save();

    res.json({ msg: "Role updated" });
  } catch {
    res.status(500).json({ msg: "Role change failed" });
  }
};

// Get members with roles
exports.getMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate("members.user", "name email");
    if (!project) return res.status(404).json({ msg: "Not found" });
    res.json(project.members);
  } catch {
    res.status(500).json({ msg: "Fetch failed" });
  }
};

// Make Public
exports.makePublic = async (req, res) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, { isPublic: true });
    res.json({ msg: "Project is now public" });
  } catch {
    res.status(500).json({ msg: "Failed" });
  }
};

// Rename Project
exports.renameProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, "members.user": req.user.id },
      { name: req.body.name },
      { new: true }
    );

    if (!project) return res.status(404).json({ msg: "Project not found" });
    res.json(project);
  } catch {
    res.status(500).json({ msg: "Rename failed" });
  }
};

// Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      "members.user": req.user.id,
    });

    if (!project) return res.status(404).json({ msg: "Project not found" });
    await File.deleteMany({ projectId: project._id });
    res.json({ msg: "Deleted" });
  } catch {
    res.status(500).json({ msg: "Delete failed" });
  }
};
