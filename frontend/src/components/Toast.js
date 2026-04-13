import { useEffect, useState } from "react";

// Usage: import { useToast } from "../components/Toast"
// const toast = useToast();
// toast.success("Saved!") / toast.error("Failed") / toast.info("Note")

let _setToasts = null;
let _id = 0;

export function useToast() {
  return {
    success: (msg) => _add("success", msg),
    error:   (msg) => _add("error",   msg),
    info:    (msg) => _add("info",    msg),
  };
}

function _add(type, msg) {
  if (!_setToasts) return;
  const id = ++_id;
  _setToasts(prev => [...prev, { id, type, msg }]);
  setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 3200);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}