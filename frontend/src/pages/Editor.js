import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";
import ToastContainer, { useToast } from "../components/Toast";

const BASE_URL = "https://codesync-1-fnv2.onrender.com";

function Logo({ size }) {
  const isLg = size === "lg";
  const isSm = size === "sm";
  return (
    <div className={`logo${isLg ? " logo-lg" : isSm ? " logo-sm" : ""}`}>
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

export default function EditorPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("63");
  const [commits, setCommits] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [activity, setActivity] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, file }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myRole, setMyRole] = useState("editor");

  const toast = useToast();
  const socketRef = useRef(null);
  const suppressRemote = useRef(false);

  const token = localStorage.getItem("token");
  const projectId = localStorage.getItem("projectId");

  // ── Socket.IO ──────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit("join-project", projectId);

    socket.on("code-change", ({ fileId, content: remoteContent }) => {
      if (selectedFile?._id === fileId) {
        suppressRemote.current = true;
        setContent(remoteContent);
      }
    });

    socket.on("chat-message", (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on("user-joined", ({ userName }) => {
      toast.info(`${userName} joined`);
      setOnlineUsers(prev => [...new Set([...prev, userName])]);
    });

    socket.on("user-left", ({ userName }) => {
      setOnlineUsers(prev => prev.filter(u => u !== userName));
    });

    return () => socket.disconnect();
    // eslint-disable-next-line
  }, [projectId, token]);

  // ── Files ───────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/files/${projectId}`, {
      headers: { Authorization: token },
    });
    setFiles(res.data);
  }, [projectId, token]);

  const createFile = async (parentFolder = "root") => {
    const fileName = prompt("File name (e.g. index.js)");
    if (!fileName) return;
    await axios.post(`${BASE_URL}/api/files`, { projectId, fileName, parentFolder }, { headers: { Authorization: token } });
    toast.success(`Created ${fileName}`);
    fetchFiles();
  };

  const createFolder = async () => {
    const folderName = prompt("Folder name");
    if (!folderName) return;
    await axios.post(`${BASE_URL}/api/files/folder`, { projectId, folderName }, { headers: { Authorization: token } });
    toast.success(`Folder ${folderName} created`);
    fetchFiles();
  };

  const renameFile = async (file) => {
    const newName = prompt("New name", file.fileName);
    if (!newName || newName === file.fileName) return;
    await axios.patch(`${BASE_URL}/api/files/${file._id}/rename`, { fileName: newName }, { headers: { Authorization: token } });
    toast.success(`Renamed to ${newName}`);
    if (selectedFile?._id === file._id) setSelectedFile(prev => ({ ...prev, fileName: newName }));
    fetchFiles();
  };

  const deleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.fileName}"?`)) return;
    await axios.delete(`${BASE_URL}/api/files/${file._id}`, { headers: { Authorization: token } });
    toast.success(`Deleted ${file.fileName}`);
    if (selectedFile?._id === file._id) { setSelectedFile(null); setContent(""); }
    fetchFiles();
  };

  const selectFile = (file) => {
    if (file.isFolder) return;
    setSelectedFile(file);
    setContent(file.content || "");
  };

  const toggleFolder = (folderId) => setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));

  const saveFile = async () => {
    if (!selectedFile) return toast.error("Select a file first");
    await axios.put(`${BASE_URL}/api/files/${selectedFile._id}`, { content }, { headers: { Authorization: token } });
    toast.success("Saved");
  };

  // ── Code change: broadcast to socket ───────────────────
  const handleCodeChange = (val) => {
    if (suppressRemote.current) { suppressRemote.current = false; return; }
    setContent(val || "");
    if (socketRef.current && selectedFile) {
      socketRef.current.emit("code-change", { projectId, fileId: selectedFile._id, content: val });
    }
  };

  // ── Run ────────────────────────────────────────────────
  const runCode = async () => {
    if (!content.trim()) return;
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await axios.post(`${BASE_URL}/api/code/run`, { code: content, language_id: language });
      setOutput(res.data.output || "No output");
    } catch {
      setOutput("Execution failed");
      toast.error("Execution failed");
    } finally {
      setRunning(false);
    }
  };

  // ── Commits ────────────────────────────────────────────
  const fetchCommits = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/commits/${projectId}`, { headers: { Authorization: token } });
    setCommits(res.data);
  }, [projectId, token]);

  const commitCode = async () => {
    const message = prompt("Commit message");
    if (!message) return;
    await axios.post(`${BASE_URL}/api/commits`, { projectId, message, changes: content }, { headers: { Authorization: token } });
    toast.success("Committed");
    fetchCommits();
  };

  // ── Invite ─────────────────────────────────────────────
  const inviteUser = async () => {
    const email = prompt("Email to invite");
    if (!email) return;
    const role = prompt("Role: owner / editor / viewer", "editor");
    if (!role) return;
    try {
      await axios.post(`${BASE_URL}/api/projects/invite`, { email, projectId, role }, { headers: { Authorization: token } });
      toast.success(`Invited ${email} as ${role}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invite failed");
    }
  };

  // ── Chat ───────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/messages/${projectId}`);
    setMessages(res.data);
  }, [projectId]);

  const sendMessage = async () => {
    if (!msg.trim()) return;
    socketRef.current?.emit("chat-message", { projectId, text: msg });
    await axios.post(`${BASE_URL}/api/messages`, { projectId, text: msg });
    setMsg("");
  };

  // ── Activity ───────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    const res = await axios.get(`${BASE_URL}/api/activity/${projectId}`, { headers: { Authorization: token } });
    setActivity(res.data);
  }, [projectId, token]);

  // ── My role ────────────────────────────────────────────
  const fetchMyRole = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/projects/${projectId}/members`, { headers: { Authorization: token } });
      const me = res.data.find(m => m.user?._id === localStorage.getItem("userId"));
      if (me) setMyRole(me.role);
    } catch { /* ignore */ }
  }, [projectId, token]);

  useEffect(() => {
    fetchFiles();
    fetchCommits();
    fetchMessages();
    fetchActivity();
    fetchMyRole();
  }, [fetchFiles, fetchCommits, fetchMessages, fetchActivity, fetchMyRole]);

  // Close context menu on click away
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const getLanguage = () => ({ "63": "javascript", "71": "python", "54": "cpp", "62": "java" }[language] || "javascript");

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const actionIcon = (action) => {
    const map = { saved: "💾", committed: "📌", invited: "👤", created_file: "📄", deleted_file: "🗑", renamed_file: "✏️", created_project: "🚀" };
    return map[action] || "•";
  };

  const folders = files.filter(f => f.isFolder);
  const rootFiles = files.filter(f => !f.isFolder && (f.parentFolder === "root" || !f.parentFolder));
  const getFilesInFolder = (folderName) => files.filter(f => !f.isFolder && f.parentFolder === folderName);
  const isReadOnly = myRole === "viewer";

  const SidebarItem = ({ file, indent = false }) => (
    <div
      className={`sidebar-item${selectedFile?._id === file._id ? " active" : ""}`}
      style={{ paddingLeft: indent ? 26 : undefined }}
      onClick={() => selectFile(file)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
    >
      <span style={{ marginRight: 6, fontSize: 10, color: "var(--text-subtle)" }}>◦</span>
      {file.fileName}
    </div>
  );

  return (
    <div className="editor-layout">
      <ToastContainer />

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="context-item" onClick={() => { renameFile(contextMenu.file); setContextMenu(null); }}>✏️ Rename</div>
          <div className="context-item danger" onClick={() => { deleteFile(contextMenu.file); setContextMenu(null); }}>🗑 Delete</div>
        </div>
      )}

      {/* SIDEBAR */}
      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-brand"><Logo size="sm" /></div>
          <div className="sidebar-files">
            <h4>Explorer</h4>
            {!isReadOnly && <>
              <button onClick={() => createFile("root")}>+ New File</button>
              <button onClick={createFolder} style={{ marginTop: 4 }}>+ New Folder</button>
            </>}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 1 }}>
              {rootFiles.map(f => <SidebarItem key={f._id} file={f} />)}
              {folders.map(folder => (
                <div key={folder._id}>
                  <div className="sidebar-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span onClick={() => toggleFolder(folder._id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--text-subtle)", display: "inline-block", transform: expandedFolders[folder._id] ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
                      {folder.fileName}
                    </span>
                    {!isReadOnly && (
                      <span onClick={() => createFile(folder.fileName)} title="Add file" style={{ fontSize: 15, color: "var(--text-muted)", cursor: "pointer", padding: "0 4px" }}>+</span>
                    )}
                  </div>
                  {expandedFolders[folder._id] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {getFilesInFolder(folder.fileName).length === 0 && (
                        <div style={{ fontSize: 11, color: "var(--text-subtle)", padding: "4px 10px 4px 26px" }}>Empty — click + to add</div>
                      )}
                      {getFilesInFolder(folder.fileName).map(f => <SidebarItem key={f._id} file={f} indent />)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div style={{ marginTop: "auto", padding: "10px 0 4px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 6 }}>Online</div>
                {onlineUsers.map(u => (
                  <div key={u} style={{ fontSize: 11, color: "var(--green)", display: "flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                    {u}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div className="editor-main">
        <div className="editor-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: "2px 6px" }}>☰</button>
            {!showSidebar && <Logo size="sm" />}
            <span>{selectedFile?.fileName || "No file selected"}</span>
            {myRole && <span className={`role-badge role-${myRole}`}>{myRole}</span>}
          </div>
          <div className="editor-actions">
            <select onChange={e => setLanguage(e.target.value)} value={language}>
              <option value="63">JavaScript</option>
              <option value="71">Python</option>
              <option value="54">C++</option>
              <option value="62">Java</option>
            </select>
            {!isReadOnly && <button onClick={saveFile}>Save</button>}
            <button className="run-btn" onClick={runCode} disabled={running}>{running ? "Running..." : "▶ Run"}</button>
            {!isReadOnly && <button onClick={commitCode}>Commit</button>}
            <button className="invite-btn" onClick={inviteUser}>+ Invite</button>
            <button onClick={() => { setShowActivity(!showActivity); if (!showActivity) fetchActivity(); }} className={showActivity ? "active-tab-btn" : ""}>Log</button>
          </div>
        </div>

        <MonacoEditor
          height="350px"
          theme="vs-dark"
          language={getLanguage()}
          value={content}
          onChange={handleCodeChange}
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, readOnly: isReadOnly }}
        />

        <div className="output" style={{ margin: "12px 14px 0" }}>
          <h4>Output</h4>
          <pre>{output || "Run your code to see output here."}</pre>
        </div>

        {/* Activity log panel */}
        {showActivity && (
          <div className="activity-panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8 }}>Activity Log</div>
            {activity.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No activity yet.</div>}
            {activity.map(a => (
              <div key={a._id} className="activity-item">
                <span className="activity-icon">{actionIcon(a.action)}</span>
                <span className="activity-user">{a.userName}</span>
                <span className="activity-action">{a.action.replace(/_/g, " ")}</span>
                {a.detail && <span className="activity-detail">"{a.detail}"</span>}
                <span className="activity-time">{formatTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {commits.length > 0 && (
          <div className="commits" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8 }}>Recent Commits</div>
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
              <div className="chat-status">● Online</div>
            </div>
          </div>
          <div className="chat-body">
            {messages.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 20 }}>No messages yet</div>}
            {messages.map((m, i) => (
              <div key={i} className="chat-msg">
                {m.userName && <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 2 }}>{m.userName}</span>}
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && sendMessage()} />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}