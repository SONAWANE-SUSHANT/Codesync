const router = require("express").Router();
const { getActivity } = require("../controllers/activityController");
const auth = require("../middleware/authMiddleware");

router.get("/:projectId", auth, getActivity);

module.exports = router;