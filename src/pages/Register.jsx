import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!username || !email || !password || !confirmPassword) {
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor. Lütfen aynı şifreyi girin.');
      toast.error('Şifreler eşleşmiyor. Lütfen aynı şifreyi girin.');
      return;
    }

    try {
      setLoading(true);
      await register(email, password, username);
      // Navigate to login after successful registration
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
        <div className="auth-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1445400729573-1f666abb9447?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="auth-card">
        <h2 className="auth-title">Kayıt Ol</h2>
        <p className="auth-subtitle">Aramıza katılın! Başlamak için bilgilerinizi doldurun.</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Kullanıcı adı</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              required
              minLength={3}
            />
          </div>

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
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Şifreyi Onaylayın</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError && password === e.target.value) {
                  setPasswordError('');
                }
              }}
              placeholder="Şifrenizi tekrar girin"
              required
              minLength={6}
              style={{ borderColor: passwordError ? '#dc3545' : undefined }}
            />
            {passwordError && (
              <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {passwordError}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
          </p>
          <Link to="/" className="back-link">← Ana sayfaya dön</Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Register;

