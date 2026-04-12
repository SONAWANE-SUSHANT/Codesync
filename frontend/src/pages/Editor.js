import { useEffect, useState, useCallback } from "react";
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

  const getLanguage = () => {
    if (language === 63) return "javascript";
    if (language === 71) return "python";
    if (language === 54) return "cpp";
    if (language === 62) return "java";
    return "javascript";
  };

  return (
    <div>
      <h2>Editor Loaded Successfully</h2>
      <MonacoEditor
        height="400px"
        theme="vs-dark"
        language={getLanguage()}
        value={content}
        onChange={(v) => setContent(v || "")}
      />
    </div>
  );
}