import { useEffect, useState } from "react";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";
import Logo from "../components/Logo";

export default function EditorPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState(63);
  const [commits, setCommits] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [running, setRunning] = useState(false);

  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token");
  const projectId = localStorage.getItem("projectId");

  // ================= FILES =================
  const fetchFiles = async () => {
    const res = await axios.get(`http://localhost:5000/api/files/${projectId}`, {
      headers: { Authorization: token },
    });
    setFiles(res.data);
  };

  const createFile = async (parentFolder = "root") => {
    const fileName = prompt("Enter file name (e.g. index.js)");
    if (!fileName) return;
    await axios.post(
      "http://localhost:5000/api/files",
      { projectId, fileName, parentFolder },
      { headers: { Authorization: token } }
    );
    fetchFiles();
  };

  const createFolder = async () => {
    const folderName = prompt("Enter folder name");
    if (!folderName) return;
    await axios.post(
      "http://localhost:5000/api/files/folder",
      { projectId, folderName },
      { headers: { Authorization: token } }
    );
    fetchFiles();
  };

  const selectFile = (file) => {
    if (file.isFolder) return;
    setSelectedFile(file);
    setContent(file.content || "");
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const saveFile = async () => {
    if (!selectedFile) return alert("Select a file first");
    await axios.put(
      `http://localhost:5000/api/files/${selectedFile._id}`,
      { content },
      { headers: { Authorization: token } }
    );
    alert("Saved");
  };

  // ================= RUN =================
  const runCode = async () => {
    if (!content.trim()) return;
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await axios.post("http://localhost:5000/api/code/run", {
        code: content,
        language_id: language,
      });
      setOutput(res.data.output || "No output");
    } catch {
      setOutput("Execution failed");
    } finally {
      setRunning(false);
    }
  };

  // ================= COMMITS =================
  const fetchCommits = async () => {
    const res = await axios.get(`http://localhost:5000/api/commits/${projectId}`, {
      headers: { Authorization: token },
    });
    setCommits(res.data);
  };

  const commitCode = async () => {
    const message = prompt("Enter commit message");
    if (!message) return;
    await axios.post(
      "http://localhost:5000/api/commits",
      { projectId, message, changes: content },
      { headers: { Authorization: token } }
    );
    fetchCommits();
  };

  // ================= INVITE =================
  const inviteUser = async () => {
    const email = prompt("Enter email address to invite");
    if (!email) return;
    try {
      await axios.post(
        "http://localhost:5000/api/projects/invite",
        { email, projectId },
        { headers: { Authorization: token } }
      );
      alert("User invited successfully");
    } catch (err) {
      alert(err.response?.data?.msg || "Invite failed");
    }
  };

  // ================= CHAT =================
  const fetchMessages = async () => {
    const res = await axios.get(`http://localhost:5000/api/messages/${projectId}`);
    setMessages(res.data);
  };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    await axios.post("http://localhost:5000/api/messages", { projectId, text: msg });
    setMsg("");
    fetchMessages();
  };

  useEffect(() => {
    fetchFiles();
    fetchCommits();
    fetchMessages();
  }, []);

  const getLanguage = () => {
    if (language == 63) return "javascript";
    if (language == 71) return "python";
    if (language == 54) return "cpp";
    if (language == 62) return "java";
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
  const getFilesInFolder = (folderName) =>
    files.filter(f => !f.isFolder && f.parentFolder === folderName);

  return (
    <div className="editor-layout">

      {/* SIDEBAR */}
      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-brand">
            <Logo size="sm" />
          </div>
          <div className="sidebar-files">
            <h4>Explorer</h4>
            <button onClick={() => createFile("root")}>+ New File</button>
            <button onClick={createFolder} style={{ marginTop: 4 }}>+ New Folder</button>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 1 }}>

              {/* ROOT FILES */}
              {rootFiles.map(f => (
                <div
                  key={f._id}
                  className={`sidebar-item${selectedFile?._id === f._id ? " active" : ""}`}
                  onClick={() => selectFile(f)}
                >
                  <span style={{ marginRight: 6, fontSize: 10, color: "var(--text-subtle)" }}>◦</span>
                  {f.fileName}
                </div>
              ))}

              {/* FOLDERS */}
              {folders.map(folder => (
                <div key={folder._id}>
                  {/* Folder row — click name to expand, click + to add file inside */}
                  <div
                    className="sidebar-item"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span
                      onClick={() => toggleFolder(folder._id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{
                        fontSize: 10,
                        color: "var(--text-subtle)",
                        display: "inline-block",
                        transform: expandedFolders[folder._id] ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s"
                      }}>▶</span>
                      {folder.fileName}
                    </span>
                    <span
                      onClick={() => createFile(folder.fileName)}
                      title={`Add file inside ${folder.fileName}`}
                      style={{
                        fontSize: 15,
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "0 4px",
                        lineHeight: 1,
                        borderRadius: 4,
                      }}
                    >+</span>
                  </div>

                  {/* Files inside this folder */}
                  {expandedFolders[folder._id] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {getFilesInFolder(folder.fileName).length === 0 && (
                        <div style={{ paddingLeft: 24, fontSize: 11, color: "var(--text-subtle)", padding: "4px 10px 4px 26px" }}>
                          Empty — click + to add a file
                        </div>
                      )}
                      {getFilesInFolder(folder.fileName).map(f => (
                        <div
                          key={f._id}
                          className={`sidebar-item${selectedFile?._id === f._id ? " active" : ""}`}
                          style={{ paddingLeft: 26 }}
                          onClick={() => selectFile(f)}
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

        {/* TOP BAR */}
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
            <button className="invite-btn" onClick={inviteUser}>+ Invite</button>
          </div>
        </div>

        {/* EDITOR */}
        <MonacoEditor
          height="350px"
          theme="vs-dark"
          language={getLanguage()}
          value={content}
          onChange={v => setContent(v || "")}
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
        />

        {/* OUTPUT */}
        <div className="output" style={{ margin: "12px 14px 0" }}>
          <h4>Output</h4>
          <pre>{output || "Run your code to see output here."}</pre>
        </div>

        {/* COMMITS */}
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

      {/* CHAT BUTTON */}
      <div className="chat-btn" onClick={() => setShowChat(!showChat)}>💬</div>

      {/* CHAT PANEL */}
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
            {messages.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                No messages yet
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="chat-msg">{m.text}</div>
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