import Logo from "../components/Logo";

export default function Landing() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <Logo />
        <div className="landing-nav-links">
          <button className="landing-nav-link" onClick={() => window.location.href = "/login"}>Sign in</button>
          <button className="landing-cta-btn" onClick={() => window.location.href = "/register"}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-badge">Now with real-time collaboration</div>
        <h1 className="landing-headline">
          Code together,<br />ship faster.
        </h1>
        <p className="landing-sub">
          CodeSync is a collaborative IDE in your browser. Write, run, and review
          code with your team — in real time.
        </p>
        <div className="landing-hero-btns">
          <button className="landing-cta-btn lg" onClick={() => window.location.href = "/register"}>
            Start for free
          </button>
          <button className="landing-ghost-btn" onClick={() => window.location.href = "/login"}>
            Sign in →
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features">
        {FEATURES.map(f => (
          <div className="landing-feature-card" key={f.title}>
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <Logo size="sm" />
        <span>© {new Date().getFullYear()} CodeSync. Built for developers.</span>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-time editing",
    desc: "See your teammates' changes instantly. No refresh, no conflicts — just flow.",
  },
  {
    icon: "🔒",
    title: "Granular permissions",
    desc: "Assign owner, editor, or viewer roles per project. You control who does what.",
  },
  {
    icon: "▶",
    title: "Run code in-browser",
    desc: "Execute JavaScript, Python, C++, and Java without leaving the editor.",
  },
  {
    icon: "📜",
    title: "Commit history",
    desc: "Snapshot your work with meaningful commit messages and browse past versions.",
  },
  {
    icon: "📋",
    title: "Activity log",
    desc: "A full timeline of every save, commit, invite, and file change in your project.",
  },
  {
    icon: "💬",
    title: "Team chat",
    desc: "Built-in project chat so the conversation stays next to the code.",
  },
];