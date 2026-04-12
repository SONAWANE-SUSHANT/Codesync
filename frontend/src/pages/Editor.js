import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";

// ✅ Backend URL
const BASE_URL = "https://codesync-1-fnv2.onrender.com";

export default function EditorPage() {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState(63);

  const token = localStorage.getItem("token");
  const projectId = localStorage.getItem("projectId");

  // ✅ Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      await axios.get(`${BASE_URL}/api/files/${projectId}`, {
        headers: { Authorization: token },
      });
    } catch (err) {
      console.log(err);
    }
  }, [projectId, token]);

  // ✅ Fetch commits
  const fetchCommits = useCallback(async () => {
    try {
      await axios.get(`${BASE_URL}/api/commits/${projectId}`, {
        headers: { Authorization: token },
      });
    } catch (err) {
      console.log(err);
    }
  }, [projectId, token]);

  // ✅ Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      await axios.get(`${BASE_URL}/api/messages/${projectId}`);
    } catch (err) {
      console.log(err);
    }
  }, [projectId]);

  // ✅ useEffect
  useEffect(() => {
    fetchFiles();
    fetchCommits();
    fetchMessages();
  }, [fetchFiles, fetchCommits, fetchMessages]);

  // ✅ Language mapping
  const getLanguage = () => {
    if (language === 63) return "javascript";
    if (language === 71) return "python";
    if (language === 54) return "cpp";
    if (language === 62) return "java";
    return "javascript";
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>CodeSync Editor</h2>

      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(Number(e.target.value))}
        style={{ marginBottom: "10px" }}
      >
        <option value="63">JavaScript</option>
        <option value="71">Python</option>
        <option value="54">C++</option>
        <option value="62">Java</option>
      </select>

      {/* Editor */}
      <MonacoEditor
        height="400px"
        theme="vs-dark"
        language={getLanguage()}
        value={content}
        onChange={(value) => setContent(value || "")}
      />
    </div>
  );
}