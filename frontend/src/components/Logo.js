export default function Logo({ size = "default" }) {
  return (
    <div className={`logo${size === "lg" ? " logo-lg" : size === "sm" ? " logo-sm" : ""}`}>
      <div className="logo-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 8L3 11L7 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 8L19 11L15 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 5L9 17" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="logo-wordmark">
        <span className="logo-name">Code<span>Sync</span></span>
        {size !== "sm" && <span className="logo-tagline">Collaborative IDE</span>}
      </div>
    </div>
  );
}