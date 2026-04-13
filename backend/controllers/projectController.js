const Project = require("../models/Project");
const User = require("../models/User");

// Create Project
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ msg: "Project creation failed" });
  }
};

// Get Projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id })
      .populate("members.user", "name email");
    res.json(projects);
  } catch (error) {
    res.status(500).json({ msg: "Fetch failed" });
  }
};

// Get single project (for permissions page)
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("members.user", "name email");
    if (!project) return res.status(404).json({ msg: "Project not found" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ msg: "Fetch failed" });
  }
};

// Invite User
exports.inviteUser = async (req, res) => {
  try {
    const { email, projectId } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Check if already a member
    const already = project.members.find(m => m.user.toString() === user._id.toString());
    if (already) return res.status(400).json({ msg: "User is already a member" });

    project.members.push({ user: user._id, role: "member" });
    await project.save();

    res.json({ msg: "User invited successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Invite failed" });
  }
};

// Update member role (owner only)
exports.updateMemberRole = async (req, res) => {
  try {
    const { projectId, userId, role } = req.body;

    if (!["owner", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    // Only owner can change roles
    const requester = project.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== "owner") {
      return res.status(403).json({ msg: "Only the owner can change roles" });
    }

    const member = project.members.find(m => m.user.toString() === userId);
    if (!member) return res.status(404).json({ msg: "Member not found" });

    member.role = role;
    await project.save();

    res.json({ msg: "Role updated" });
  } catch (error) {
    res.status(500).json({ msg: "Update failed" });
  }
};

// Remove member (owner only)
exports.removeMember = async (req, res) => {
  try {
    const { projectId, userId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    const requester = project.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== "owner") {
      return res.status(403).json({ msg: "Only the owner can remove members" });
    }

    project.members = project.members.filter(m => m.user.toString() !== userId);
    await project.save();

    res.json({ msg: "Member removed" });
  } catch (error) {
    res.status(500).json({ msg: "Remove failed" });
  }
};

// Make Public
exports.makePublic = async (req, res) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, { isPublic: true });
    res.json({ msg: "Project is now public" });
  } catch (error) {
    res.status(500).json({ msg: "Failed" });
  }
};