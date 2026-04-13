import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Logo from "../components/Logo";
import ToastContainer, { useToast } from "../components/Toast";
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const toast = useToast();
  const token = localStorage.getItem("token");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/projects`, {
        headers: { Authorization: token },
      });
      setProjects(res.data);
    } catch {
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createProject = async () => {
    if (!name.trim()) return toast.error("Enter a project name");
    try {
      await axios.post(`${BASE_URL}/api/projects`, { name }, { headers: { Authorization: token } });
      setName("");
      toast.success(`Project "${name}" created`);
      fetchProjects();
    } catch {
      toast.error("Failed to create project");
    }
  };

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <div className="dashboard">
      <ToastContainer />

      <div className="dash-topbar">
        <Logo />
        <button className="create-btn" style={{ marginLeft: "auto" }} onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          window.location.href = "/";
        }}>
          Sign out
        </button>
      </div>

      <div className="dash-header">
        <h1>Dashboard</h1>
        <p>Manage your coding projects</p>
      </div>

      <div className="dash-top">
        <button className="create-btn" onClick={createProject}>+ Create Project</button>
        <input
          placeholder="Project name..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createProject()}
        />
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "32px 0" }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">📁</div>
          <p>No projects yet. Create one above to get started.</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div className="project-card" key={p._id}>
              <h3>{p.name}</h3>
              <p>
                {p.members?.length || 1} member{(p.members?.length || 1) !== 1 ? "s" : ""} ·{" "}
                {p.isPublic ? "Public" : "Private"}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => {
                  localStorage.setItem("projectId", p._id);
                  window.location.href = "/editor";
                }}>
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}