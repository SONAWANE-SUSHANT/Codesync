import { useState } from "react";
import axios from "axios";
import Logo from "../components/Logo";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!form.email || !form.password) return setError("Please fill in all fields");
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
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
        <div className="auth-logo">
          <Logo size="lg" />
        </div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your workspace</p>

        {error && <p className="auth-error">{error}</p>}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === "Enter" && login()}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && login()}
          />
        </div>

        <button onClick={login} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p>No account? <span onClick={() => window.location.href = "/register"}>Register</span></p>
      </div>
    </div>
  );
}