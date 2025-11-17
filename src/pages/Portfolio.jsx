import PortfolioHistory from '../components/PortfolioHistory';
import UserAllocations from '../components/UserAllocations';

const Portfolio = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="info-cards">
          <PortfolioHistory />
          <UserAllocations />
        </div>
      </div>
    </div>
  );
};

export default Portfolio;


