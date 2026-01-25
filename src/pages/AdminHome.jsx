import { Link } from 'react-router-dom';
import './Admin.css';

const AdminHome = () => {
  const cards = [
    {
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcıları görüntüle, detaylarını incele ve yönet',
      icon: '👥',
      link: '/admin/users',
      color: '#3b82f6'
    },
    {
      title: 'Performans Analizi',
      description: 'KPI\'lar, istatistikler ve detaylı analizler',
      icon: '📊',
      link: '/admin/performance',
      color: '#10b981'
    },
    {
      title: 'Actions',
      description: 'Hafta yönetimi, piyasa verileri ve hesaplamalar',
      icon: '⚙️',
      link: '/admin/actions',
      color: '#f59e0b'
    },
    {
      title: 'Logs',
      description: 'Sistem logları ve olay geçmişi',
      icon: '📝',
      link: '/admin/logs',
      color: '#8b5cf6'
    },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Panel</h1>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
            Hoş Geldiniz
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            Admin paneline hoş geldiniz. Aşağıdaki bölümlere erişebilirsiniz.
          </p>
        </div>

        <div className="admin-actions-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {cards.map((card) => (
            <Link
              key={card.link}
              to={card.link}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="admin-action-card"
                style={{
                  borderColor: card.color + '40',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>{card.icon}</span>
                  <h3 className="admin-action-card-title" style={{ margin: 0 }}>{card.title}</h3>
                </div>
                <p className="admin-action-card-desc" style={{ flex: 1 }}>{card.description}</p>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.8125rem', color: card.color, fontWeight: '600' }}>
                    Git →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
