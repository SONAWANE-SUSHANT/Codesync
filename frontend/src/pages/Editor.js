import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";

function Logo({ size }) {
  const isSm = size === "sm";
  return (
    <div className={`logo${isSm ? " logo-sm" : ""}`}>
      <div className="logo-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M7 8L3 11L7 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 8L19 11L15 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 5L9 17" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="logo-wordmark">
        <span className="logo-name">Code<span>Sync</span></span>
        {!isSm && <span className="logo-tagline">Collaborative IDE</span>}
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ── Context menu ─────────────────────────────────────────────
function ContextMenu({ x, y, item, onRename, onDelete, onClose }) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <div
        className="context-menu-item"
        onClick={() => { onRename(item); onClose(); }}
      >
        ✏️ Rename
      </div>
      <div
        className="context-menu-item danger"
        onClick={() => { onDelete(item); onClose(); }}
      >
        🗑️ Delete
      </div>
    </div>
  );
}

// ── Permissions modal ─────────────────────────────────────────
function PermissionsModal({ projectId, token, onClose, showToast }) {
  const [members, setMembers] = useState([]);

  const fetchMembers = useCallback(async () => {
    const res = await axios.get(`http://localhost:5000/api/projects/${projectId}`, {
      headers: { Authorization: token },
    });
    setMembers(res.data.members || []);
  }, [projectId, token]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const updateRole = async (userId, role) => {
    try {
      await axios.patch(
        "http://localhost:5000/api/projects/member/role",
        { projectId, userId, role },
        { headers: { Authorization: token } }
      );
      showToast("Role updated", "success");
      fetchMembers();
    } catch (err) {
      showToast(err.response?.data?.msg || "Failed", "error");
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await axios.delete(
        "http://localhost:5000/api/projects/member/remove",
        { data: { projectId, userId }, headers: { Authorization: token } }
      );
      showToast("Member removed", "success");
      fetchMembers();
    } catch (err) {
      showToast(err.response?.data?.msg || "Failed", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Project Members</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {members.map(m => (
          <div key={m._id} className="member-row">
            <div className="member-info">
              <div className="member-avatar">
                {m.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="member-name">{m.user?.name || "Unknown"}</div>
                <div className="member-email">{m.user?.email}</div>
              </div>
            </div>
            <div className="member-actions">
              <select
                className="role-select"
                value={m.role}
                onChange={e => updateRole(m.user._id, e.target.value)}
                disabled={m.role === "owner"}
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              {m.role !== "owner" && (
                <button className="remove-btn" onClick={() => removeMember(m.user._id)}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────
export default function EditorPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("63");
  const [commits, setCommits] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [running, setRunning] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");

  const socketRef = useRef(null);
  const isRemoteChange = useRef(false);

  const token = localStorage.getItem("token");
  const projectId = localStorage.getItem("projectId");
  const userEmail = localStorage.getItem("email") || "Anonymous";

  // ── Toast ──
  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg: message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Socket.io ──
  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.emit("join-project", { projectId, email: userEmail });

    socket.on("user-joined", ({ email, users }) => {
      showToast(`${email} joined`, "info");
      setActiveUsers(users);
    });

    socket.on("user-left", ({ email, users }) => {
      showToast(`${email} left`, "warning");
      setActiveUsers(users);
    });

    socket.on("room-users", (users) => setActiveUsers(users));

    socket.on("code-change", ({ fileId, code }) => {
      setSelectedFile(prev => {
        if (prev?._id === fileId) {
          isRemoteChange.current = true;
          setContent(code);
        }
        return prev;
      });
    });

    socket.on("files-changed", () => fetchFiles());

    socket.on("chat-message", ({ text, email, time }) => {
      setMessages(prev => [...prev, { text, email, time }]);
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Fetch ──
  const fetchFiles = useCallback(async () => {
    const res = await axios.get(`http://localhost:5000/api/files/${projectId}`, {
      headers: { Authorization: token },
    });
    setFiles(res.data);
  }, [projectId, token]);

  const fetchCommits = useCallback(async () => {
    const res = await axios.get(`http://localhost:5000/api/commits/${projectId}`, {
      headers: { Authorization: token },
    });
    setCommits(res.data);
  }, [projectId, token]);

  const fetchMessages = useCallback(async () => {
    const res = await axios.get(`http://localhost:5000/api/messages/${projectId}`);
    setMessages(res.data);
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
    fetchCommits();
    fetchMessages();
  }, [fetchFiles, fetchCommits, fetchMessages]);

  // ── File ops ──
  const createFile = async (parentFolder = "root") => {
    const fileName = prompt("File name (e.g. index.js)");
    if (!fileName) return;
    await axios.post(
      "http://localhost:5000/api/files",
      { projectId, fileName, parentFolder },
      { headers: { Authorization: token } }
    );
    showToast(`${fileName} created`, "success");
    fetchFiles();
    socketRef.current?.emit("files-changed", { projectId });
  };

  const createFolder = async () => {
    const folderName = prompt("Folder name");
    if (!folderName) return;
    await axios.post(
      "http://localhost:5000/api/files/folder",
      { projectId, folderName },
      { headers: { Authorization: token } }
    );
    showToast(`${folderName}/ created`, "success");
    fetchFiles();
    socketRef.current?.emit("files-changed", { projectId });
  };

  const renameItem = async (item) => {
    const newName = prompt("New name", item.fileName);
    if (!newName || newName === item.fileName) return;
    try {
      await axios.patch(
        `http://localhost:5000/api/files/${item._id}/rename`,
        { fileName: newName },
        { headers: { Authorization: token } }
      );
      showToast("Renamed", "success");
      if (selectedFile?._id === item._id) {
        setSelectedFile(prev => ({ ...prev, fileName: newName }));
      }
      fetchFiles();
      socketRef.current?.emit("files-changed", { projectId });
    } catch {
      showToast("Rename failed", "error");
    }
  };

  const deleteItem = async (item) => {
    const label = item.isFolder ? `folder "${item.fileName}" and all its files` : `"${item.fileName}"`;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/files/${item._id}`,
        { headers: { Authorization: token } }
      );
      showToast("Deleted", "success");
      if (selectedFile?._id === item._id) {
        setSelectedFile(null);
        setContent("");
      }
      fetchFiles();
      socketRef.current?.emit("files-changed", { projectId });
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const selectFile = (file) => {
    if (file.isFolder) return;
    setSelectedFile(file);
    setContent(file.content || "");
    socketRef.current?.emit("file-selected", {
      projectId, fileId: file._id, fileName: file.fileName, email: userEmail,
    });
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleCodeChange = (value) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setContent(value || "");
    socketRef.current?.emit("code-change", {
      projectId, fileId: selectedFile?._id, code: value,
    });
  };

  const saveFile = async () => {
    if (!selectedFile) return showToast("Select a file first", "warning");
    await axios.put(
      `http://localhost:5000/api/files/${selectedFile._id}`,
      { content },
      { headers: { Authorization: token } }
    );
    showToast("Saved", "success");
  };

  const runCode = async () => {
    if (!content.trim()) return;
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await axios.post("http://localhost:5000/api/code/run", {
        code: content, language_id: language,
      });
      setOutput(res.data.output || "No output");
    } catch {
      setOutput("Execution failed");
    } finally {
      setRunning(false);
    }
  };

  const commitCode = async () => {
    const message = prompt("Commit message");
    if (!message) return;
    await axios.post(
      "http://localhost:5000/api/commits",
      { projectId, message, changes: content },
      { headers: { Authorization: token } }
    );
    showToast("Committed", "success");
    fetchCommits();
  };

  const inviteUser = async () => {
    const email = prompt("Enter email to invite");
    if (!email) return;
    try {
      await axios.post(
        "http://localhost:5000/api/projects/invite",
        { email, projectId },
        { headers: { Authorization: token } }
      );
      showToast(`${email} invited`, "success");
    } catch (err) {
      showToast(err.response?.data?.msg || "Invite failed", "error");
    }
  };

  const sendMessage = () => {
    if (!msg.trim()) return;
    socketRef.current?.emit("chat-message", { projectId, text: msg, email: userEmail });
    setMsg("");
  };

  const getLanguage = () => {
    if (language === "63") return "javascript";
    if (language === "71") return "python";
    if (language === "54") return "cpp";
    if (language === "62") return "java";
    return "javascript";
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const folders = files.filter(f => f.isFolder);
  const rootFiles = files.filter(f => !f.isFolder && (f.parentFolder === "root" || !f.parentFolder));
  const getFilesInFolder = (folderName) => files.filter(f => !f.isFolder && f.parentFolder === folderName);

  return (
    <div className="editor-layout">

      <Toast toasts={toasts} />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onRename={renameItem}
          onDelete={deleteItem}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showPermissions && (
        <PermissionsModal
          projectId={projectId}
          token={token}
          onClose={() => setShowPermissions(false)}
          showToast={showToast}
        />
      )}

      {/* SIDEBAR */}
      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-brand">
            <Logo size="sm" />
          </div>

          {activeUsers.length > 0 && (
            <div className="sidebar-presence">
              <div className="sidebar-presence-label">Online — {activeUsers.length}</div>
              <div className="presence-avatars">
                {activeUsers.map((u, i) => (
                  <div key={i} className="presence-avatar" title={u.email}>
                    {u.email?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-files">
            <h4>Explorer</h4>
            <button onClick={() => createFile("root")}>+ New File</button>
            <button onClick={createFolder} style={{ marginTop: 4 }}>+ New Folder</button>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 1 }}>
              {rootFiles.map(f => (
                <div
                  key={f._id}
                  className={`sidebar-item${selectedFile?._id === f._id ? " active" : ""}`}
                  onClick={() => selectFile(f)}
                  onContextMenu={e => handleContextMenu(e, f)}
                >
                  <span style={{ marginRight: 6, fontSize: 10, color: "var(--text-subtle)" }}>◦</span>
                  {f.fileName}
                </div>
              ))}

              {folders.map(folder => (
                <div key={folder._id}>
                  <div
                    className="sidebar-item"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    onContextMenu={e => handleContextMenu(e, folder)}
                  >
                    <span onClick={() => toggleFolder(folder._id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 10, color: "var(--text-subtle)", display: "inline-block",
                        transform: expandedFolders[folder._id] ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                      }}>▶</span>
                      {folder.fileName}
                    </span>
                    <span
                      onClick={() => createFile(folder.fileName)}
                      title="Add file inside folder"
                      style={{ fontSize: 15, color: "var(--text-muted)", cursor: "pointer", padding: "0 4px" }}
                    >+</span>
                  </div>

                  {expandedFolders[folder._id] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {getFilesInFolder(folder.fileName).length === 0 && (
                        <div style={{ fontSize: 11, color: "var(--text-subtle)", padding: "4px 10px 4px 26px" }}>
                          Empty — click + to add
                        </div>
                      )}
                      {getFilesInFolder(folder.fileName).map(f => (
                        <div
                          key={f._id}
                          className={`sidebar-item${selectedFile?._id === f._id ? " active" : ""}`}
                          style={{ paddingLeft: 26 }}
                          onClick={() => selectFile(f)}
                          onContextMenu={e => handleContextMenu(e, f)}
                        >
                          <span style={{ marginRight: 6, fontSize: 10, color: "var(--text-subtle)" }}>◦</span>
                          {f.fileName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div className="editor-main">
        <div className="editor-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: "2px 6px" }}
            >☰</button>
            {!showSidebar && <Logo size="sm" />}
            <span>{selectedFile?.fileName || "No file selected"}</span>
          </div>

          <div className="editor-actions">
            <select onChange={e => setLanguage(e.target.value)} value={language}>
              <option value="63">JavaScript</option>
              <option value="71">Python</option>
              <option value="54">C++</option>
              <option value="62">Java</option>
            </select>
            <button onClick={saveFile}>Save</button>
            <button className="run-btn" onClick={runCode} disabled={running}>
              {running ? "Running..." : "▶ Run"}
            </button>
            <button onClick={commitCode}>Commit</button>
            <button className="members-btn" onClick={() => setShowPermissions(true)}>Members</button>
            <button className="invite-btn" onClick={inviteUser}>+ Invite</button>
          </div>
        </div>

        <MonacoEditor
          height="350px"
          theme="vs-dark"
          language={getLanguage()}
          value={content}
          onChange={handleCodeChange}
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
        />

        <div className="output" style={{ margin: "12px 14px 0" }}>
          <h4>Output</h4>
          <pre>{output || "Run your code to see output here."}</pre>
        </div>

        {commits.length > 0 && (
          <div className="commits" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8 }}>
              Recent Commits
            </div>
            {commits.slice(0, 5).map(c => (
              <div key={c._id} className="commit-card">
                <span className="commit-hash">{c._id.slice(-6)}</span>
                <span className="commit-msg">{c.message}</span>
                <span className="commit-time">{formatTime(c.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-btn" onClick={() => setShowChat(!showChat)}>💬</div>

      {showChat && (
        <div className="chat-fixed">
          <div className="chat-header">
            <div className="avatar">💬</div>
            <div>
              <div className="chat-title">Team Chat</div>
              <div className="chat-status">● {activeUsers.length} online</div>
            </div>
          </div>
          <div className="chat-body">
            {messages.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                No messages yet
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                {m.email && <div className="chat-sender">{m.email}</div>}
                <div className="chat-msg">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}