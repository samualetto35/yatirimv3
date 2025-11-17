import { NavLink } from 'react-router-dom';

const navStyle = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  background: '#ffffff', borderTop: '1px solid #e9ecef',
  display: 'flex', justifyContent: 'space-around', padding: '10px 8px',
  zIndex: 40
};

const linkStyle = (active) => ({
  padding: '8px 12px', borderRadius: 999,
  color: active ? '#ffffff' : '#4169e1',
  background: active ? '#4169e1' : '#ffffff',
  border: '1.5px solid #4169e1', fontWeight: 700,
  fontSize: 12
});

const BottomNav = () => {
  return (
    <nav style={navStyle} className="mobile-only">
      <NavLink to="/dashboard" end className={({ isActive }) => ''} style={({ isActive }) => linkStyle(isActive)}>Home</NavLink>
      <NavLink to="/dashboard/portfolio" className={({ isActive }) => ''} style={({ isActive }) => linkStyle(isActive)}>Portfolio</NavLink>
      <NavLink to="/dashboard/leaderboard" className={({ isActive }) => ''} style={({ isActive }) => linkStyle(isActive)}>Leaders</NavLink>
    </nav>
  );
};

export default BottomNav;


