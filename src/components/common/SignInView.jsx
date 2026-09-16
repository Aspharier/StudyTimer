import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';

export const SignInView = () => {
  const { signIn } = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async () => {
    try {
      await signIn();
    } catch {
      showToast("AUTH_FAIL: Local cache mode active");
    }
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '4px' }}>
          // ACCESS_GATEWAY
        </div>
        <div className="sign-in-logo">FOCUSLY.OS</div>
        <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>
          PERSONAL EXAM OPERATING SYSTEM
        </p>
        <p className="sign-in-subtitle">
          Retrieval practice, deterministic telemetry, and spaced revision engine.
        </p>
        <button className="btn btn-primary w-full" onClick={handleLogin} style={{ padding: '12px' }}>
          [ AUTHENTICATE WITH GOOGLE ]
        </button>
        <p className="sign-in-note">
          Telemetry &amp; syllabus tree synchronize automatically to Firestore cloud database.
        </p>
      </div>
    </div>
  );
};
