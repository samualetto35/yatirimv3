import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
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
  const { currentUser, userDoc, userDocLoading, ensureUserDocLoaded } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const loadingStartTimeRef = useRef(null);
  const hasCheckedFirstLoginRef = useRef(false);
  const isFirstLoginRef = useRef(false);
  // Static overview order (drag/drop removed for simplicity)

  // Extra security check on mount and when currentUser changes
  useEffect(() => {
    const firebaseUser = auth.currentUser;
    
    // If no user or user not verified, redirect immediately
    if (!firebaseUser || !firebaseUser.emailVerified) {
      navigate('/login', { replace: true });
      return;
    }

    // Check if this is first login (user doesn't exist in DB)
    if (currentUser && !hasCheckedFirstLoginRef.current) {
      const firstLoginKey = `firstLogin_${currentUser.uid}`;
      const isFirstLoginFlag = localStorage.getItem(firstLoginKey);
      
      if (isFirstLoginFlag === 'true') {
        isFirstLoginRef.current = true;
        setIsFirstLogin(true);
        hasCheckedFirstLoginRef.current = true;
      }
    }

    // Ensure user document exists in Firestore
    // If userDoc doesn't exist, we need to create it and show modal
    if (currentUser && !userDoc && !userDocLoading) {
      // Start initialization and set loading start time
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now();
      }
      setIsInitializing(true);
      
      ensureUserDocLoaded(currentUser).then((result) => {
        // Check if this was a new user creation (DB'de yoktu)
        if (result?._isNewUser) {
          isFirstLoginRef.current = true;
          setIsFirstLogin(true);
        }
        
        // If DB'de yoktu (first login), show modal for 5-6 seconds
        // If DB'de vardı, show modal for minimum 1.5 seconds
        const minDisplayTime = isFirstLoginRef.current ? 5500 : 1500;
        const elapsed = Date.now() - (loadingStartTimeRef.current || Date.now());
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        setTimeout(() => {
          setIsInitializing(false);
          loadingStartTimeRef.current = null;
          
          // If first login, refresh the page after modal closes
          if (isFirstLoginRef.current) {
            setTimeout(() => {
              window.location.reload();
            }, 300);
          }
        }, remaining);
      }).catch(() => {
        setIsInitializing(false);
        loadingStartTimeRef.current = null;
      });
    } else if (currentUser && userDoc) {
      // User doc is loaded - check if we need to show first login modal
      if (isFirstLoginRef.current && !loadingStartTimeRef.current) {
        // First login detected, show modal for 5-6 seconds
        loadingStartTimeRef.current = Date.now();
        setIsInitializing(true);
        
        setTimeout(() => {
          setIsInitializing(false);
          loadingStartTimeRef.current = null;
          
          // Refresh the page after modal closes
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }, 5500);
      } else if (loadingStartTimeRef.current) {
        // Modal is already showing, wait for it to finish
        const minDisplayTime = isFirstLoginRef.current ? 5500 : 1500;
        const elapsed = Date.now() - loadingStartTimeRef.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        setTimeout(() => {
          setIsInitializing(false);
          loadingStartTimeRef.current = null;
          
          // If first login, refresh the page after modal closes
          if (isFirstLoginRef.current) {
            setTimeout(() => {
              window.location.reload();
            }, 300);
          }
        }, remaining);
      } else {
        // User doc exists and no modal needed
        // But wait a bit to ensure balance and other data loads
        if (!loadingStartTimeRef.current) {
          // Give a small delay for balance data to load
          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        }
      }
    } else if (!currentUser) {
      setIsInitializing(false);
      loadingStartTimeRef.current = null;
      hasCheckedFirstLoginRef.current = false;
      isFirstLoginRef.current = false;
      setIsFirstLogin(false);
    }
  }, [currentUser, userDoc, userDocLoading, navigate, ensureUserDocLoaded]);

  // Show loading state while user document is being created/loaded
  // CRITICAL: Don't show dashboard until userDoc is loaded and ready
  // Show modal if: initializing, userDoc is loading, or userDoc doesn't exist yet
  const showLoading = isInitializing || 
                      (currentUser && !userDoc) || 
                      (currentUser && userDocLoading);

  // CRITICAL: Never render dashboard if userDoc is not loaded
  // This prevents showing "User" and "₺0" before data is ready
  if (showLoading || (currentUser && !userDoc)) {
    return (
      <>
        <div className="dashboard-container" style={{ opacity: 0.3, pointerEvents: 'none' }}>
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
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 3000,
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              padding: '2.5rem 3rem', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', 
              minWidth: '320px', 
              maxWidth: '400px',
              textAlign: 'center',
              animation: 'slideUp 0.4s ease-out'
            }}
          >
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                margin: '0 auto 1.5rem', 
                border: '5px solid #e9ecef', 
                borderTopColor: '#0d6efd', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} 
            />
            <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#212529' }}>
              Profiliniz Oluşturuluyor
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Hesabınız hazırlanıyor, lütfen bekleyin...
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#adb5bd' }}>
              Bu işlem birkaç saniye sürebilir
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </>
    );
  }

  

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

