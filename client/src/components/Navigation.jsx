import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  const navStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.9) 0%, rgba(0, 20, 40, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
    padding: '1rem 2rem',
    boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)'
  }

  const navContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto'
  }

  const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#00ffff',
    textDecoration: 'none',
    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
  }

  const navLinksStyle = {
    display: 'flex',
    gap: '2rem',
    listStyle: 'none',
    margin: 0,
    padding: 0
  }

  const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
    border: '1px solid transparent'
  }

  const activeLinkStyle = {
    ...linkStyle,
    background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 150, 255, 0.2) 100%)',
    border: '1px solid rgba(0, 255, 255, 0.4)',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
  }

  return (
    <nav style={navStyle}>
      <div style={navContainerStyle}>
        <Link to="/" style={logoStyle}>
          🌊 Fishtank: Liquidity Hunter
        </Link>
        
        <ul style={navLinksStyle}>
          <li>
            <Link 
              to="/" 
              style={location.pathname === '/' ? activeLinkStyle : linkStyle}
              onMouseEnter={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'rgba(0, 255, 255, 0.1)'
                  e.target.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'transparent'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              Play
            </Link>
          </li>
          <li>
            <Link 
              to="/explore" 
              style={location.pathname === '/explore' ? activeLinkStyle : linkStyle}
              onMouseEnter={(e) => {
                if (location.pathname !== '/explore') {
                  e.target.style.background = 'rgba(0, 255, 255, 0.1)'
                  e.target.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/explore') {
                  e.target.style.background = 'transparent'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              Explore
            </Link>
          </li>
          <li>
            <Link 
              to="/profile" 
              style={location.pathname === '/profile' ? activeLinkStyle : linkStyle}
              onMouseEnter={(e) => {
                if (location.pathname !== '/profile') {
                  e.target.style.background = 'rgba(0, 255, 255, 0.1)'
                  e.target.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/profile') {
                  e.target.style.background = 'transparent'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              Profile
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
