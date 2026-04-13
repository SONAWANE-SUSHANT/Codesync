import { useState } from "react";
import axios from "axios";
import Logo from "../components/Logo";
import BASE_URL from "../config/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!form.email || !form.password) return setError("Please fill in all fields");
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, form);
      localStorage.setItem("token", res.data.token);
      // Decode JWT to cache userId and userName locally (avoids extra API calls)
      const payload = JSON.parse(atob(res.data.token.split(".")[1]));
      if (payload.id)   localStorage.setItem("userId",   payload.id);
      if (payload.name) localStorage.setItem("userName", payload.name);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <div className="auth-logo"><Logo size="lg" /></div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your workspace</p>
        {error && <p className="auth-error">{error}</p>}
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <button onClick={login} disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <p>No account? <span onClick={() => window.location.href = "/register"}>Register</span></p>
        <p><span onClick={() => window.location.href = "/"} style={{ color: "var(--text-subtle)", fontSize: 11 }}>← Back to home</span></p>
      </div>
    </div>
  );
}