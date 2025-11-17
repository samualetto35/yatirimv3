import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <div className="auth-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1553316045-e56f8b09f0ed?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=3087)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="auth-card">
        <h2 className="auth-title">Giriş Yap</h2>
        <p className="auth-subtitle">Tekrar hoş geldiniz. Lütfen hesabınıza giriş yapın.</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresinizi girin"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              required
            />
          </div>

          <div className="form-footer">
            <Link to="/reset-password" className="forgot-password">
              Şifremi unuttum
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
          </p>
          <Link to="/" className="back-link">← Ana sayfaya dön</Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;

