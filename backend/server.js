const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const initSocket = require("./socket");

// Routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const commitRoutes = require("./routes/commitRoutes");
const codeRoutes = require("./routes/codeRoutes");
const messageRoutes = require("./routes/messageRoutes");
const activityRoutes = require("./routes/activityRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

connectDB();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/commits", commitRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => res.send("API Running..."));

// Boot Socket.IO
initSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));