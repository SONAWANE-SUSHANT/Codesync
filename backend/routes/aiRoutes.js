const router = require("express").Router();
const { aiAssist } = require("../controllers/aiController");
const auth = require("../middleware/authMiddleware");

router.post("/assist", auth, aiAssist);

module.exports = router;