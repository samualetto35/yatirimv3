import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

const Badge = ({ children, tone = 'gray' }) => (
  <span className={`lp-badge lp-badge-${tone}`}>{children}</span>
);

const Landing = () => {
  const { currentUser } = useAuth();

  const isAuthed = Boolean(currentUser && currentUser.emailVerified);

  return (
    <div className="landing">
      {/* Header */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">Yatırım Oyun</div>
          <div className="lp-header-right">
            <nav className="lp-header-links">
              <a href="#top">Ana Sayfa</a>
              <Link to="/dashboard/leaderboard">Sıralama</Link>
              <Link to="/register">Kayıt</Link>
              <Link to="/login">Giriş</Link>
            </nav>
            <a href="mailto:info@yatirimv3.app" className="lp-contact">İletişim</a>
          </div>
        </div>
      </header>
      {/* Background blobs */}
      <div className="lp-bg">
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 - 151.5px)', top: 279, background: 'rgba(193,192,255,0.12)' }} />
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 + 156.5px)', top: 88, background: 'rgba(252,192,255,0.12)' }} />
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 + 113.5px)', top: 414, background: 'rgba(192,255,209,0.12)' }} />
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 - 130.5px)', top: 749, background: 'rgba(192,192,255,0.12)' }} />
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 - 87.5px)', top: 0, background: 'rgba(255,242,192,0.12)' }} />
        <span className="lp-blob" style={{ left: 'calc(50% - 171px/2 + 0.5px)', top: 206, background: 'rgba(192,232,255,0.12)' }} />
        {/* extras */}
        <span className="lp-blob" style={{ left: '10%', top: 560, background: 'rgba(255,210,210,0.12)' }} />
        <span className="lp-blob" style={{ right: '12%', top: 680, background: 'rgba(210,255,230,0.12)' }} />
        <span className="lp-blob" style={{ left: '22%', top: 120, background: 'rgba(210,230,255,0.12)' }} />
      </div>
      {/* Hero - simplified per design */}
      <section className="lp-hero-simple">
        <div className="lp-hero-simple-inner">
          <div className="lp-green-chip"><span className="lp-chip-dot" />Aktif</div>
          <h1 className="lp-hero-title">Her hafta portföy oluşturarak yarışabileceğiniz <span className="lp-gradient">Yatırım Oyununa</span> hoşgeldiniz</h1>
          <div className="lp-cta-row">
            {isAuthed ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ minWidth: 140, borderRadius: 18 }}>Dashboard'a Git →</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-lg" style={{ minWidth: 116, borderRadius: 14 }}>Oturum Aç</Link>
                <Link to="/register" className="btn btn-dark btn-lg" style={{ minWidth: 116, borderRadius: 18 }}>Kayıt Ol</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Scrolling banner */}
      <div className="lp-ticker">
        <div className="lp-ticker-inner">
          <div className="lp-ticker-track">
            <span className="lp-ticker-item">Borsa İstanbul (BIST)</span>
            <span className="lp-ticker-item">Para Piyasası Fonu</span>
            <span className="lp-ticker-item">Borçlanma Araçları Fonu</span>
            <span className="lp-ticker-item">İstatistiksel Arbitraj Fonu</span>
            <span className="lp-ticker-item">Altın</span>
            <span className="lp-ticker-item">Gümüş</span>
            <span className="lp-ticker-item">USD</span>
            <span className="lp-ticker-item">EURO</span>
            <span className="lp-ticker-item">BTC</span>
            <span className="lp-ticker-item">ETH</span>
            <span className="lp-ticker-item">XRP</span>
            <span className="lp-ticker-item">Eurobond Fonu</span>
            <span className="lp-ticker-item">Döviz Fonu</span>
            <span className="lp-ticker-item">ABD Hisse Fonu</span>
            <span className="lp-ticker-item">Avrupa Hisse Fonu</span>
            {/* duplicate for seamless loop */}
            <span className="lp-ticker-item">Borsa İstanbul (BIST)</span>
            <span className="lp-ticker-item">Para Piyasası Fonu</span>
            <span className="lp-ticker-item">Borçlanma Araçları Fonu</span>
            <span className="lp-ticker-item">İstatistiksel Arbitraj Fonu</span>
            <span className="lp-ticker-item">Altın</span>
            <span className="lp-ticker-item">Gümüş</span>
            <span className="lp-ticker-item">USD</span>
            <span className="lp-ticker-item">EURO</span>
            <span className="lp-ticker-item">BTC</span>
            <span className="lp-ticker-item">ETH</span>
            <span className="lp-ticker-item">XRP</span>
            <span className="lp-ticker-item">Eurobond Fonu</span>
            <span className="lp-ticker-item">Döviz Fonu</span>
            <span className="lp-ticker-item">ABD Hisse Fonu</span>
            <span className="lp-ticker-item">Avrupa Hisse Fonu</span>
          </div>
        </div>
      </div>

      {/* Benefits section (6 cards) */}
      <section className="lp-benefits">
        <div className="lp-benefits-grid">
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Gerçek Piyasa Verileri</h3>
            <p>Canlı piyasa verileriyle stratejinizi kurgulayın, kararlarınızın etkisini görün.</p>
          </div>
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Haftalık Yarışmalar</h3>
            <p>Diğer yatırımcılarla yarışın, en iyi performansı sergileyin.</p>
          </div>
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2940)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Stratejinizi Geliştirin</h3>
            <p>Risk almadan farklı yatırım araçlarını test edin ve öğrenin.</p>
          </div>
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Hem Öğrenin Hem Uygulayın</h3>
            <p>Haftalık gelişmeleri yorumlayın ve yeni yatırım tercihi yapın.</p>
          </div>
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://plus.unsplash.com/premium_photo-1681469490209-c2f9f8f5c0a2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2083)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Detaylı Analiz</h3>
            <p>Performansınızı değerlendirin ve geliştirin.</p>
          </div>
          <div className="lp-benefit-card">
            <div className="benefit-media" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1645226880663-81561dcab0ae?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h3>Mobil Uyumlu ve Güvenli Platform</h3>
            <p>Portföyünüzü her yerden yönetin. Verileriniz Firebase güvenliği ile korunsun.</p>
          </div>
        </div>
      </section>

      {/* Feature highlights removed */}
      {/* How it works removed */}

      {/* Teaser */}
      <section id="leaders" className="lp-teaser">
        <div className="lp-teaser-card">
          <div>
            <h2>Tasarruf, Yatırım ve Ekonomik Özgürlüğe Yolculuk</h2>
            <br />
            <p>Gerçek piyasa verileri ile yatırım stratejilerinizi geliştirin</p>
          </div>
          <div className="lp-teaser-cta" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-dark">Şimdi Katılın →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner footer-grid">
          <div className="footer-col">
            <h4>Yatırım Oyunu</h4>
            <p>Yatırım dünyasını keşfedin ve stratejilerinizi geliştirin</p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/register">Kayıt Ol</Link></li>
              <li><Link to="/login">Giriş Yap</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Destek</h4>
            <ul>
              <li><a href="#">Yardım</a></li>
              <li><a href="mailto:info@yatirimv3.app">İletişim</a></li>
            </ul>
        </div>
      </div>
        <div className="lp-footer-copy">© {new Date().getFullYear()} Yatırım Oyunu. Tüm hakları saklıdır.</div>
      </footer>
    </div>
  );
};

export default Landing;

