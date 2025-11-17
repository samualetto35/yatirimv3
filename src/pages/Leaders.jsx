import Leaderboard from '../components/Leaderboard';
import MarketOverview from '../components/MarketOverview';

const Leaders = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="info-cards">
          <Leaderboard />
          <MarketOverview />
        </div>
      </div>
    </div>
  );
};

export default Leaders;


