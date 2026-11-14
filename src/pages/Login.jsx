import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@orangeinterior.in');
  const [password, setPassword] = useState('Admin@123');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          ORANGE
          <br />
          <span>INTERIOR</span>
        </div>
        <p>
          Premium admin for categories, products, and BOQ billing — built for studio teams on
          mobile, tablet, and desktop.
        </p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h1>Sign in</h1>
          <p className="sub">Superadmin and staff access</p>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Enter console'}
          </button>
          <div className="hint">
            Demo: admin@orangeinterior.in / Admin@123
            <br />
            Staff: staff@orangeinterior.in / Staff@123
          </div>
        </form>
      </section>
    </div>
  );
}
