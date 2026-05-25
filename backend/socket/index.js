// socket/index.js
// Handles real-time collaboration: live code sync, cursor presence, chat

const jwt = require("jsonwebtoken");

module.exports = function initSocket(io) {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userName = decoded.name || "Anonymous";
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join a project room
    socket.on("join-project", (projectId) => {
      socket.join(projectId);
      socket.projectId = projectId;

      // Notify others someone joined
      socket.to(projectId).emit("user-joined", {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // Broadcast code changes to all others in the room
    socket.on("code-change", ({ projectId, fileId, content }) => {
      socket.to(projectId).emit("code-change", { fileId, content });
    });

    // Broadcast cursor position
    socket.on("cursor-move", ({ projectId, fileId, position }) => {
      socket.to(projectId).emit("cursor-move", {
        userId: socket.userId,
        userName: socket.userName,
        fileId,
        position,
      });
    });

    // Broadcast chat messages in real-time
    socket.on("chat-message", ({ projectId, text }) => {
      socket.to(projectId).emit("chat-message", {
        userId: socket.userId,
        userName: socket.userName,
        text,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      if (socket.projectId) {
        socket.to(socket.projectId).emit("user-left", {
          userId: socket.userId,
          userName: socket.userName,
        });
      }
    });
  });
};
