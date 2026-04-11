
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const commitRoutes = require("./routes/commitRoutes");
const codeRoutes = require("./routes/codeRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

// Connect Database
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/commits", commitRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/messages", messageRoutes);
// Test Route
app.get("/", (req, res) => {
  res.send("API Running...");
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});