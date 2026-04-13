const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const commitRoutes = require("./routes/commitRoutes");
const codeRoutes = require("./routes/codeRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/commits", commitRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => res.send("API Running..."));

// ================= SOCKET.IO =================
// Each project is its own "room"
// Events:
//   join-project    — client joins a project room
//   code-change     — client sends code changes, server broadcasts to others in room
//   file-selected   — broadcast which file a user opened (presence)
//   user-joined     — notify room when someone joins
//   user-left       — notify room when someone leaves
//   chat-message    — real-time chat without polling

const rooms = {}; // roomId -> Set of { socketId, email }

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join a project room
  socket.on("join-project", ({ projectId, email }) => {
    socket.join(projectId);

    if (!rooms[projectId]) rooms[projectId] = [];
    rooms[projectId] = rooms[projectId].filter(u => u.socketId !== socket.id);
    rooms[projectId].push({ socketId: socket.id, email });

    // Tell everyone else in the room
    socket.to(projectId).emit("user-joined", {
      email,
      users: rooms[projectId],
    });

    // Send current users list to the joining user
    socket.emit("room-users", rooms[projectId]);

    socket.data.projectId = projectId;
    socket.data.email = email;
  });

  // Broadcast code changes to everyone else in the room
  socket.on("code-change", ({ projectId, fileId, code }) => {
    socket.to(projectId).emit("code-change", { fileId, code });
  });

  // Broadcast which file a user selected (presence indicator)
  socket.on("file-selected", ({ projectId, fileId, fileName, email }) => {
    socket.to(projectId).emit("file-selected", { fileId, fileName, email });
  });

  // Real-time chat
  socket.on("chat-message", ({ projectId, text, email }) => {
    io.to(projectId).emit("chat-message", { text, email, time: Date.now() });
  });

  // Notify room when a file is created/deleted/renamed
  socket.on("files-changed", ({ projectId }) => {
    socket.to(projectId).emit("files-changed");
  });

  socket.on("disconnect", () => {
    const { projectId, email } = socket.data;
    if (projectId && rooms[projectId]) {
      rooms[projectId] = rooms[projectId].filter(u => u.socketId !== socket.id);
      socket.to(projectId).emit("user-left", {
        email,
        users: rooms[projectId],
      });
    }
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));