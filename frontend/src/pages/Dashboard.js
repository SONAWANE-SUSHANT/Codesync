import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Logo from "../components/Logo";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");

  const token = localStorage.getItem("token");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/projects", {
        headers: { Authorization: token },
      });
      setProjects(res.data);
    } catch {
      window.location.href = "/";
    }
  }, [token]);

  const createProject = async () => {
    if (!name.trim()) return alert("Enter a project name");
    await axios.post(
      "http://localhost:5000/api/projects",
      { name },
      { headers: { Authorization: token } }
    );
    setName("");
    fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="dashboard">
      <div className="dash-topbar">
        <Logo />
        <button
          className="create-btn"
          style={{ marginLeft: "auto" }}
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
      </div>

      <div className="dash-header">
        <h1>Dashboard</h1>
        <p>Manage your coding projects</p>
      </div>

      <div className="dash-top">
        <button className="create-btn" onClick={createProject}>
          + Create Project
        </button>
        <input
          placeholder="Project name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createProject()}
        />
      </div>

      <div className="project-grid">
        {projects.map((p) => (
          <div className="project-card" key={p._id}>
            <h3>{p.name}</h3>
            <p>Click to open and start coding</p>
            <button
              onClick={() => {
                localStorage.setItem("projectId", p._id);
                window.location.href = "/editor";
              }}
            >
              Open →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}