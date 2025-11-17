import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      // Navigate to login after successful password reset email
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <div className="auth-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551650888-5a515843f12b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="auth-card">
        <h2 className="auth-title">Şifre Sıfırla</h2>
        <p className="auth-subtitle">
          E-posta adresinizi girin; şifre sıfırlama bağlantısını gönderelim.
        </p>
        
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

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Şifrenizi hatırladınız mı? <Link to="/login">Giriş yapın</Link>
          </p>
          <Link to="/" className="back-link">← Ana sayfaya dön</Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ResetPassword;

