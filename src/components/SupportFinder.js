import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Clock, Star, Globe } from 'lucide-react';
import './SupportFinder.css';

const SupportFinder = () => {
  const [location, setLocation] = useState('Hyderabad');
  const [resourceType, setResourceType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);

  // Get user's geolocation on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          console.log('User location obtained:', position.coords);
        },
        (error) => {
          console.log('Location permission denied or error:', error);
        }
      );
    }
  }, []);

  const resourceTypes = [
    { id: 'all', label: 'All Services' },
    { id: 'healthcare', label: 'Healthcare Providers' },
    { id: 'education', label: 'Educational Support' },
    { id: 'community', label: 'Support Groups' },
    { id: 'therapy', label: 'Speech & Occupational Therapy' }
  ];

  const handleSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/search-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          resourceType: resourceType,
          userLat: userLocation?.lat || null,
          userLon: userLocation?.lon || null
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      
      setResults(data.results || []);
      
      if (data.results.length === 0) {
        setError('No resources found. Try a different location or service type.');
      }
      
    } catch (error) {
      console.error('Error searching resources:', error);
      setError('Failed to search resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const ResourceCard = ({ resource }) => (
    <div className="resource-card">
      <div className="resource-header">
        <div className="resource-main-info">
          <div className="resource-title-row">
            <h3 className="resource-name">{resource.name}</h3>
            {resource.verified && (
              <span className="verified-badge">✓ Verified</span>
            )}
          </div>
          
          <div className="resource-details">
            <div className="resource-detail">
              <MapPin size={16} />
              <span>{resource.address || 'Address not available'}</span>
            </div>
            
            <div className="resource-detail">
              <Phone size={16} />
              <span>{resource.phone || 'N/A'}</span>
            </div>
            
            {resource.hours && (
              <div className="resource-detail">
                <Clock size={16} />
                <span>{resource.hours}</span>
              </div>
            )}
            
            {resource.website && resource.website !== 'N/A' && resource.website !== '' && (
              <div className="resource-detail">
                <Globe size={16} />
                <a 
                  href={resource.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="website-link"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="resource-rating">
          {resource.rating && resource.rating > 0 && (
            <div className="rating-display">
              <Star size={20} fill="#fbbf24" color="#fbbf24" />
              <span className="rating-score">{resource.rating}</span>
            </div>
          )}
          {resource.distance && (
            <span className="distance-badge">{resource.distance}</span>
          )}
        </div>
      </div>
      
      {resource.services && resource.services.length > 0 && (
        <div className="services-container">
          {resource.services.map((service, index) => (
            <span key={index} className="service-tag">
              {service}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="support-finder-wrapper">
      <div className="support-finder-container">
        {/* Header */}
        <div className="finder-header">
          <div className="header-content">
            <div className="header-icon">
              <MapPin size={32} />
            </div>
            <div>
              <h1 className="finder-title">Find Support Near You</h1>
              <p className="finder-subtitle">Locate autism and dyslexia support resources in your area</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Enter your location (e.g., Hyderabad, Madhapur)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
            </div>
            <button 
              onClick={handleSearch} 
              className="search-button"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="filter-container">
            {resourceTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setResourceType(type.id)}
                className={`filter-button ${resourceType === type.id ? 'active' : ''}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Finding resources near you...</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="results-section">
            {results.length > 0 ? (
              <>
                <div className="results-header">
                  <h2>Found {results.length} resource{results.length !== 1 ? 's' : ''}</h2>
                </div>
                <div className="results-grid">
                  {results.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </>
            ) : (
              !error && location && (
                <div className="empty-state">
                  <MapPin size={64} className="empty-icon" />
                  <p className="empty-text">Enter a location and click Search to find resources</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportFinder;
