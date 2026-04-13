const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach full user so controllers can read name for activity logs
    const user = await User.findById(decoded.id).select("name email");
    if (!user) return res.status(401).json({ msg: "User not found" });
    req.user = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};