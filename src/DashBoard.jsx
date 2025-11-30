import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './DashBoard.css';

// Import icons
import { 
  Brain, 
  BookOpen, 
  MessageSquare, 
  Activity, 
  CheckCircle, 
  User, 
  Gamepad,
  Eye,
  Headphones,
  Type,
  MapPin,
  TrendingUp,
  Heart,
  Sparkles
} from 'lucide-react';

const progressData = [
  { name: 'Week 1', progress: 20 },
  { name: 'Week 2', progress: 35 },
  { name: 'Week 3', progress: 50 },
  { name: 'Week 4', progress: 65 },
];

const DashBoard = () => {
  const [currentMode, setCurrentMode] = useState('visual');
  const [activeTab, setActiveTab] = useState('upcoming');
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f1f5f9 0%, #f8fafc 100%)' }}>
      {/* HERO SECTION */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '4rem 2rem 3rem',
        marginBottom: '3rem',
        position: 'relative'
      }}>
        {/* Hero Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto 2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '50px',
            color: 'white',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={16} />
            <span>Your Personalized Support Hub</span>
          </div>
          
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Welcome to Your Dashboard
          </h1>
          
          <p style={{
            fontSize: '1.25rem',
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Empowering your journey with autism and dyslexia support tools
          </p>
        </div>

        {/* HERO STATS - FULL WIDTH GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Stat Card 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white', lineHeight: 1 }}>65%</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Progress</div>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Heart size={20} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white', lineHeight: 1 }}>8</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Active Days</div>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Gamepad size={20} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white', lineHeight: 1 }}>12</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Games Played</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        
        {/* VIRTUAL FRIEND FEATURED CARD */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            cursor: 'pointer',
            transition: 'transform 0.3s ease',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
          }}
          onClick={() => navigate('/virtualfriend')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <User size={48} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>
                Your Virtual Friend
              </h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1.5rem' }}>
                Have a natural conversation with an AI friend who understands and responds to your emotions in real-time
              </p>
              <button style={{
                background: 'white',
                color: '#6366f1',
                padding: '0.875rem 1.75rem',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                Start Conversation
                <MessageSquare size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION HEADER */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Quick Actions</h3>
          <p style={{ color: '#64748b' }}>Get started with these essential tools</p>
        </div>

        {/* QUICK ACTIONS GRID - 4 COLUMNS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Action Card 1 */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => navigate('/testform')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#a5b4fc';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Brain size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Self-Assessment</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Take a comprehensive test</p>
          </div>

          {/* Action Card 2 */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => navigate('/games')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#a5b4fc';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Gamepad size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Games Zone</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Play learning games</p>
          </div>

          {/* Action Card 3 */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => navigate('/support-finder')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#a5b4fc';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <MapPin size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Find Support</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Local resources near you</p>
          </div>

          {/* Action Card 4 - UPDATED TO NAVIGATE TO DOCUMENT CHAT */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => navigate('/document-chat')} // CHANGED: Now navigates to document-chat
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#a5b4fc';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <BookOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Smart Chat Assistant</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Multimodal AI Assistant</p>
          </div>
        </div>

        {/* Rest of the dashboard content... */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Mode buttons and chart cards go here - keeping your existing structure */}
        </div>
      </div>
    </div>
  );
};

export default DashBoard;