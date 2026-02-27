import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Your Path to Stability Starts Here</h1>
          <p>YellowBrickRoad connects people experiencing homelessness with the resources, agencies, and support they need to rebuild their lives.</p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary">Get Started Free</Link>
                <Link to="/map" className="btn-outline">View Resource Map</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">8+</span>
            <span className="stat-label">Partner Agencies</span>
          </div>
          <div className="stat">
            <span className="stat-number">10+</span>
            <span className="stat-label">Resource Locations</span>
          </div>
          <div className="stat">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Info Available</span>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Everything You Need in One Place</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Assessment</h3>
            <p>Answer a few questions and get personalized recommendations for your situation.</p>
            <Link to={user ? '/assessment' : '/register'} className="feature-link">Start Assessment →</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Resource Map</h3>
            <p>Find shelters, food banks, clinics, and services near you on an interactive map.</p>
            <Link to="/map" className="feature-link">View Map →</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏢</div>
            <h3>Agency Directory</h3>
            <p>Browse Las Vegas agencies and apply for services directly through the platform.</p>
            <Link to="/agencies" className="feature-link">Browse Agencies →</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Track Progress</h3>
            <p>Keep track of your applications and recommendations all in one dashboard.</p>
            <Link to={user ? '/dashboard' : '/register'} className="feature-link">View Dashboard →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
