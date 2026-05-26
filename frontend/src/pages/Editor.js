import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";
import ToastContainer, { useToast } from "../components/Toast";
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

// Invite modal — replaces chained window.prompt() calls for role selection
function InviteModal({ onClose, onInvite }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await onInvite(email.trim(), role);
    setLoading(false);
    onClose();
  };

  const roleDesc = {
    owner:  "Full access — can invite, delete, and manage everything.",
    editor: "Can read, write, commit, and run code.",
    viewer: "Read-only access. Cannot edit or commit.",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Invite teammate</h3>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            autoFocus
            className="modal-input"
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Role</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {["owner", "editor", "viewer"].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`role-option${role === r ? " selected" : ""}`}
              >{r}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{roleDesc[role]}</p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} className="modal-cancel">Cancel</button>
          <button onClick={submit} disabled={loading} className="modal-confirm">
            {loading ? "Inviting..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className="ai-copy-btn" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function AIResponse({ text }) {
  const parts = [];
  const codeFence = /```([\w-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeFence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "code",
      language: match[1] || "code",
      value: match[2].trim(),
    });
    lastIndex = codeFence.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return (
    <div className="ai-response">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <div className="ai-code-block" key={index}>
              <div className="ai-code-toolbar">
                <span>{part.language}</span>
                <CopyButton text={part.value} />
              </div>
              <pre><code>{part.value}</code></pre>
            </div>
          );
        }

        return part.value
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`}>{paragraph.trim()}</p>
          ));
      })}
    </div>
  );
}

export default function EditorPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [content, setContent] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("63");
  const [commits, setCommits] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [activity, setActivity] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myRole, setMyRole] = useState("editor");
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const toast = useToast();
  const socketRef = useRef(null);
  const suppressRemote = useRef(false);
  const chatBodyRef = useRef(null);
  const selectedFileRef = useRef(null); // mirror of selectedFile for socket closure

  const token = localStorage.getItem("token");
  const projectId = localStorage.getItem("projectId");
  const myUserId = localStorage.getItem("userId") || "";
  const myName = localStorage.getItem("userName") || "Me";

  // Keep ref in sync so socket handler always sees latest selectedFile
  useEffect(() => { selectedFileRef.current = selectedFile; }, [selectedFile]);

  // ── Socket.IO ──────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit("join-project", projectId);

    socket.on("code-change", ({ fileId, content: remoteContent }) => {
      setOpenFiles(prev => prev.map(file => (
        file._id === fileId ? { ...file, content: remoteContent } : file
      )));
      if (selectedFileRef.current?._id === fileId) {
        suppressRemote.current = true;
        setContent(remoteContent);
      }
    });

    // Only receives messages from OTHER users — our own are added optimistically
    socket.on("chat-message", (data) => {
      setMessages(prev => [...prev, { ...data, _mine: false }]);
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

  // Auto-scroll chat to bottom on new messages or when chat opens
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  // ── Files ───────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/files/${projectId}`, { headers: { Authorization: token } });
      setFiles(res.data);
      setOpenFiles(prev => prev
        .map(openFile => {
          const latest = res.data.find(file => file._id === openFile._id);
          return latest ? { ...latest, content: openFile.content } : null;
        })
        .filter(Boolean)
      );
    } catch { /* silent */ }
  }, [projectId, token]);

  const createFile = async (parentFolder = "root") => {
    const fileName = prompt("File name (e.g. index.js)");
    if (!fileName) return;
    try {
      await axios.post(`${BASE_URL}/api/files`, { projectId, fileName, parentFolder }, { headers: { Authorization: token } });
      toast.success(`Created "${fileName}"`);
      fetchFiles();
    } catch { toast.error("Could not create file"); }
  };

  const createFolder = async () => {
    const folderName = prompt("Folder name");
    if (!folderName) return;
    try {
      await axios.post(`${BASE_URL}/api/files/folder`, { projectId, folderName }, { headers: { Authorization: token } });
      toast.success(`Folder "${folderName}" created`);
      fetchFiles();
    } catch { toast.error("Could not create folder"); }
  };

  const renameFile = async (file) => {
    const newName = prompt(file.isFolder ? "New folder name" : "New name", file.fileName);
    if (!newName || newName === file.fileName) return;
    try {
      await axios.patch(`${BASE_URL}/api/files/${file._id}/rename`, { fileName: newName }, { headers: { Authorization: token } });
      toast.success(`Renamed to "${newName}"`);
      setOpenFiles(prev => prev.map(openFile => (
        openFile._id === file._id ? { ...openFile, fileName: newName } : openFile
      )));
      if (selectedFile?._id === file._id) setSelectedFile(prev => ({ ...prev, fileName: newName }));
      fetchFiles();
    } catch { toast.error("Rename failed"); }
  };

  const deleteFile = async (file) => {
    const message = file.isFolder
      ? `Delete folder "${file.fileName}" and all files inside it?`
      : `Delete "${file.fileName}"?`;
    if (!window.confirm(message)) return;
    try {
      await axios.delete(`${BASE_URL}/api/files/${file._id}`, { headers: { Authorization: token } });
      toast.success(`Deleted "${file.fileName}"`);
      const removedIds = new Set(
        file.isFolder
          ? files.filter(f => f._id === file._id || f.parentFolder === file.fileName).map(f => f._id)
          : [file._id]
      );
      setOpenFiles(prev => prev.filter(openFile => !removedIds.has(openFile._id)));
      if (selectedFile && removedIds.has(selectedFile._id)) {
        setSelectedFile(null);
        setContent("");
      }
      fetchFiles();
    } catch { toast.error("Delete failed"); }
  };

  const selectFile = (file) => {
    if (file.isFolder) return;
    const openFile = openFiles.find(item => item._id === file._id);
    const nextFile = openFile || file;
    setSelectedFile(nextFile);
    setContent(nextFile.content || "");
    setOpenFiles(prev => {
      if (prev.some(openFile => openFile._id === file._id)) return prev;
      return [...prev, file];
    });
  };

  const closeOpenFile = (fileId, event) => {
    event.stopPropagation();
    setOpenFiles(prev => {
      const nextOpenFiles = prev.filter(file => file._id !== fileId);
      if (selectedFile?._id === fileId) {
        const closingIndex = prev.findIndex(file => file._id === fileId);
        const nextSelected = nextOpenFiles[closingIndex] || nextOpenFiles[closingIndex - 1] || null;
        setSelectedFile(nextSelected);
        setContent(nextSelected?.content || "");
      }
      return nextOpenFiles;
    });
  };

  const toggleFolder = (id) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));

  const saveFile = async () => {
    if (!selectedFile) return toast.error("Select a file first");
    try {
      const res = await axios.put(`${BASE_URL}/api/files/${selectedFile._id}`, { content }, { headers: { Authorization: token } });
      setOpenFiles(prev => prev.map(file => (
        file._id === selectedFile._id ? { ...file, content: res.data.content } : file
      )));
      toast.success("Saved");
    } catch { toast.error("Save failed"); }
  };

  const handleCodeChange = (val) => {
    if (suppressRemote.current) { suppressRemote.current = false; return; }
    setContent(val || "");
    setOpenFiles(prev => prev.map(file => (
      file._id === selectedFile?._id ? { ...file, content: val || "" } : file
    )));
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
    try {
      const res = await axios.get(`${BASE_URL}/api/commits/${projectId}`, { headers: { Authorization: token } });
      setCommits(res.data);
    } catch { /* silent */ }
  }, [projectId, token]);

  const commitCode = async () => {
    const message = prompt("Commit message");
    if (!message) return;
    try {
      await axios.post(`${BASE_URL}/api/commits`, { projectId, message, changes: content }, { headers: { Authorization: token } });
      toast.success("Committed");
      fetchCommits();
    } catch { toast.error("Commit failed"); }
  };

  // ── Invite ─────────────────────────────────────────────
  const handleInvite = async (email, role) => {
    try {
      await axios.post(`${BASE_URL}/api/projects/invite`, { email, projectId, role }, { headers: { Authorization: token } });
      toast.success(`Invited ${email} as ${role}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invite failed");
    }
  };

  // ── Chat ───────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/messages/${projectId}`, { headers: { Authorization: token } });
      setMessages(res.data.map(m => ({
        ...m,
        _mine: String(m.userId || "") === String(myUserId),
      })));
    } catch { /* silent */ }
  }, [projectId, token, myUserId]);

  const sendMessage = async () => {
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg(""); // clear input immediately

    // Add own message to UI immediately (optimistic, styled as "me")
    setMessages(prev => [...prev, { text, userName: myName, createdAt: new Date().toISOString(), _mine: true }]);

    // Broadcast to others in the room via socket
    socketRef.current?.emit("chat-message", { projectId, text });

    // Persist to DB (fire and forget — already in UI)
    try {
      await axios.post(`${BASE_URL}/api/messages`, { projectId, text }, { headers: { Authorization: token } });
    } catch {
      toast.error("Message failed to send");
    }
  };

  // ── Activity ───────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/activity/${projectId}`, { headers: { Authorization: token } });
      setActivity(res.data);
    } catch { /* silent */ }
  }, [projectId, token]);

  // ── My role ────────────────────────────────────────────
  // FIX: always compare as strings — Mongoose ObjectId !== plain string with ===
  const fetchMyRole = useCallback(async () => {
    if (!myUserId) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/projects/${projectId}/members`, { headers: { Authorization: token } });
      const me = res.data.find(m => String(m.user?._id) === String(myUserId));
      if (me) setMyRole(me.role);
    } catch { /* default stays "editor" */ }
  }, [projectId, token, myUserId]);

  useEffect(() => {
    fetchFiles();
    fetchCommits();
    fetchMessages();
    fetchActivity();
    fetchMyRole();
  }, [fetchFiles, fetchCommits, fetchMessages, fetchActivity, fetchMyRole]);

  // Close context menu on click-away
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

  // ── AI Assist ─────────────────────────────────────────
  const askAI = async (mode) => {
    if (!content.trim() && mode !== "free") return toast.error("Open a file first");
    if (mode === "free" && !aiPrompt.trim()) return toast.error("Enter a prompt");
    setAiLoading(true);
    setAiResult("");
    try {
      const langName = getLanguage();
      const res = await axios.post(
        `${BASE_URL}/api/ai/assist`,
        { code: content, language: langName, prompt: aiPrompt, mode },
        { headers: { Authorization: token } }
      );
      setAiResult(res.data.result);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.msg || "AI request failed");
    } finally {
      setAiLoading(false);
    }
  };

  const actionIcon = (action) => ({ saved: "💾", committed: "📌", invited: "👤", created_file: "📄", deleted_file: "🗑", renamed_file: "✏️", created_project: "🚀" }[action] || "•");

  const folders = files.filter(f => f.isFolder);
  const rootFiles = files.filter(f => !f.isFolder && (f.parentFolder === "root" || !f.parentFolder));
  const getFilesInFolder = (fn) => files.filter(f => !f.isFolder && f.parentFolder === fn);
  const isReadOnly = myRole === "viewer";
  const getMessageSender = (message) => {
    if (message._mine) return myName;
    return message.userName || "Someone";
  };

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

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />}

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="context-item" onClick={() => { renameFile(contextMenu.file); setContextMenu(null); }}>✏️ Rename</div>
          <div className="context-item danger" onClick={() => { deleteFile(contextMenu.file); setContextMenu(null); }}>🗑 Delete</div>
        </div>
      )}

      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-brand"><Logo size="sm" /></div>
          <div className="sidebar-files">
            <h4>Explorer</h4>
            {!isReadOnly && (
              <>
                <button onClick={() => createFile("root")}>+ New File</button>
                <button onClick={createFolder} style={{ marginTop: 4 }}>+ New Folder</button>
              </>
            )}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 1 }}>
              {rootFiles.map(f => <SidebarItem key={f._id} file={f} />)}
              {folders.map(folder => (
                <div key={folder._id}>
                  <div
                    className="sidebar-item"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file: folder }); }}
                  >
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
            {onlineUsers.length > 0 && (
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
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

      <div className="editor-main">
        <div className="editor-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowSidebar(p => !p)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: "2px 6px" }}>☰</button>
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
            <button className="invite-btn" onClick={() => setShowInvite(true)}>+ Invite</button>
            <button onClick={() => { setShowActivity(p => !p); if (!showActivity) fetchActivity(); }} className={showActivity ? "active-tab-btn" : ""}>Log</button>
            <button className="ai-btn" onClick={() => setShowAI(p => !p)}>✦ AI</button>
          </div>
        </div>

        {openFiles.length > 0 && (
          <div className="editor-tabs">
            {openFiles.map(file => (
              <button
                type="button"
                key={file._id}
                className={`editor-tab${selectedFile?._id === file._id ? " active" : ""}`}
                onClick={() => selectFile(file)}
                title={file.fileName}
              >
                <span>{file.fileName}</span>
                <span className="editor-tab-close" onClick={(event) => closeOpenFile(file._id, event)}>x</span>
              </button>
            ))}
          </div>
        )}

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

        {showActivity && (
          <div className="activity-panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8 }}>Activity Log</div>
            {activity.length === 0
              ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No activity yet.</div>
              : activity.map(a => (
                <div key={a._id} className="activity-item">
                  <span className="activity-icon">{actionIcon(a.action)}</span>
                  <span className="activity-user">{a.userName}</span>
                  <span className="activity-action">{a.action.replace(/_/g, " ")}</span>
                  {a.detail && <span className="activity-detail">"{a.detail}"</span>}
                  <span className="activity-time">{formatTime(a.createdAt)}</span>
                </div>
              ))
            }
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

      {showAI && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <span>✦ AI Assistant</span>
            <button onClick={() => setShowAI(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <div className="ai-quick-btns">
            <button onClick={() => askAI("explain")} disabled={aiLoading}>Explain</button>
            <button onClick={() => askAI("fix")} disabled={aiLoading}>Fix bugs</button>
            <button onClick={() => askAI("improve")} disabled={aiLoading}>Improve</button>
          </div>
          <div className="ai-freeform">
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ask anything about your code..."
              onKeyDown={e => e.key === "Enter" && askAI("free")}
            />
            <button onClick={() => askAI("free")} disabled={aiLoading}>Ask</button>
          </div>
          <div className="ai-result">
            {aiLoading && <div className="ai-thinking">✦ Thinking...</div>}
            {!aiLoading && aiResult && <AIResponse text={aiResult} />}
            {!aiLoading && !aiResult && <div className="ai-placeholder">Select a quick action or type a question above.</div>}
          </div>
        </div>
      )}

      <div className="chat-btn" onClick={() => setShowChat(p => !p)}>💬</div>

      {showChat && (
        <div className="chat-fixed">
          <div className="chat-header">
            <div className="avatar">💬</div>
            <div>
              <div className="chat-title">Team Chat</div>
              <div className="chat-status">● Online</div>
            </div>
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {messages.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 20 }}>No messages yet</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg${m._mine ? " me" : ""}`}>
                <span className="chat-msg-author">{getMessageSender(m)}</span>
                {m.text}
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
