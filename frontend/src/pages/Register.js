import { useState } from "react";
import axios from "axios";
import Logo from "../components/Logo";
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) return setError("Please fill in all fields");
    setError("");
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, form);
      window.location.href = "/login";
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <div className="auth-logo"><Logo size="lg" /></div>
        <h2>Create account</h2>
        <p className="auth-subtitle">Start coding with your team</p>
        {error && <p className="auth-error">{error}</p>}
        <div className="field">
          <label>Name</label>
          <input placeholder="Your name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleRegister()} />
        </div>
        <button onClick={handleRegister} disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
        <p>Already have an account? <span onClick={() => window.location.href = "/login"}>Sign in</span></p>
        <p><span onClick={() => window.location.href = "/"} style={{ color: "var(--text-subtle)", fontSize: 11 }}>← Back to home</span></p>
      </div>
    </div>
  );
}