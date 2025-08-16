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
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '1rem 2rem'
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
    color: 'white',
    textDecoration: 'none'
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
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }

  return (
    <nav style={navStyle}>
      <div style={navContainerStyle}>
        <Link to="/" style={logoStyle}>
        The Fishtank: MEV Hunter
        </Link>
        
        <ul style={navLinksStyle}>
          <li>
            <Link 
              to="/" 
              style={location.pathname === '/' ? activeLinkStyle : linkStyle}
              onMouseEnter={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'transparent'
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
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/explore') {
                  e.target.style.background = 'transparent'
                }
              }}
            >
              Explore
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
