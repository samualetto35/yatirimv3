import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import './Dashboard.css';
import WeekStatus from '../components/WeekStatus';
import PortfolioHistory from '../components/PortfolioHistory';
import MarketOverview from '../components/MarketOverview';
import Ranking from '../components/Ranking';
import UserAllocations from '../components/UserAllocations';
import TopGainersLosers from '../components/TopGainersLosers';
import NewsFeed from '../components/NewsFeed';
import TVEconomicCalendar from '../components/TVEconomicCalendar';
import KPIBar from '../components/KPIBar';
import TopTabs from '../components/TopTabs';
import InlineAllocationBox from '../components/InlineAllocationBox';
import TVTickerTape from '../components/TVTickerTape';
import Announcements from './Announcements';
import History from './History';
import Market from './Market';
import Profile from './Profile';

const Dashboard = () => {
  const { currentUser, userDoc } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  // Static overview order (drag/drop removed for simplicity)

  // Extra security check on mount and when currentUser changes
  useEffect(() => {
    const firebaseUser = auth.currentUser;
    
    // If no user or user not verified, redirect immediately
    if (!firebaseUser || !firebaseUser.emailVerified) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  

  return (
    <div className="dashboard-container">

      <div className="dashboard-content">
        <KPIBar />
        <TVTickerTape />
        <InlineAllocationBox />
        <TopTabs active={activeTab} onChange={setActiveTab} />
                {activeTab === 'overview' && (
                  <div className="overview-grid">
                    <div className="overview-left">
                      <div className="info-cards overview-left-stack">
                        <UserAllocations />
                        <div id="portfolio-history-anchor"><PortfolioHistory /></div>
                        <TopGainersLosers limit={5} />
                        <MarketOverview />
                      </div>
                    </div>
                    <div className="overview-right">
                      <TVEconomicCalendar />
                      <NewsFeed limit={10} />
                    </div>
                  </div>
                )}
        {activeTab === 'announcements' && <Announcements />}
        {activeTab === 'history' && <History />}
        {activeTab === 'market' && <Market />}
        {activeTab === 'leaderboard' && (
          <div className="leaderboard-wrap">
            <Ranking />
          </div>
        )}
        {activeTab === 'profile' && <Profile />}
      </div>

      <footer className="dashboard-footer">
        <div className="dashboard-footer-inner">
          © {new Date().getFullYear()} YatirimV3 · Tüm hakları saklıdır
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

