import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';

export const SignInView = () => {
  const { signIn, loginAsGuest } = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async () => {
    try {
      await signIn();
    } catch {
      showToast("Authentication Failed: Switching to offline mode");
    }
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="chip chip-yellow" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
            Focusly Planner
          </span>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.76rem', fontWeight: 600 }}>
            Paper Edition
          </span>
        </div>

        <div className="sign-in-logo">Focusly</div>
        
        <p style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ink-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
          Aesthetic Digital Study Planner &amp; Exam OS
        </p>

        <p className="sign-in-subtitle">
          Dual-page open notebook spread, daily time-blocked missions, syllabus mastery tree, and realtime Google cloud sync.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary w-full" onClick={handleLogin} style={{ padding: '12px 18px', fontSize: '0.9rem' }}>
            <span style={{ fontSize: '1.1rem' }}>G</span>
            <span>Sign in with Google Account</span>
          </button>
          
          <button 
            className="btn btn-secondary w-full" 
            onClick={loginAsGuest} 
            style={{ padding: '11px 18px', fontSize: '0.86rem' }}
          >
            Enter Offline Demo Session
          </button>
        </div>

        <p className="sign-in-note">
          Your syllabus tree and missions automatically synchronize to Google Firebase Cloud with end-to-end multi-device persistence.
        </p>
      </div>
    </div>
  );
};
