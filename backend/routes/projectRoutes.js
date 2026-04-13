const router = require("express").Router();
const {
  createProject,
  getProjects,
  getProject,
  inviteUser,
  updateMemberRole,
  removeMember,
  makePublic,
} = require("../controllers/projectController");

const auth = require("../middleware/authMiddleware");

router.post("/", auth, createProject);
router.get("/", auth, getProjects);
router.get("/:id", auth, getProject);

router.post("/invite", auth, inviteUser);
router.patch("/member/role", auth, updateMemberRole);
router.delete("/member/remove", auth, removeMember);
router.put("/public/:id", auth, makePublic);

module.exports = router;