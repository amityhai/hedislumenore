import { createContext, useContext, useCallback, useState, useRef } from 'react';
import './Toast.css';

const ToastContext = createContext(() => {});

// useToast() returns a function: toast({ type, message }) — type: success|error|info
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type = 'info', message, duration = 3200 }) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, type, message }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
