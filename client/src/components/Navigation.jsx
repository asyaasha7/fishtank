import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useBalances } from '../hooks/useBalances'

function Navigation() {
  const location = useLocation()
  const wallet = useWallet()
  const balances = useBalances(wallet.address)
  const usdcBalance = balances.getUSDCBalance()

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

  const walletSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginLeft: '2rem'
  }

  const connectButtonStyle = {
    background: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(0, 184, 148, 0.3)'
  }

  const walletInfoStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: '#e0e0e0'
  }

  const addressStyle = {
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.75rem'
  }

  const balanceStyle = {
    color: '#40e0d0',
    fontWeight: '500'
  }

  return (
    <nav style={navStyle}>
      <div style={navContainerStyle}>
        <Link to="/" style={logoStyle}>
          🌊 DeFi Current
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
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

          {/* Wallet Section */}
          <div style={walletSectionStyle}>
            {!wallet.isConnected ? (
              <button 
                onClick={wallet.connect} 
                disabled={wallet.isConnecting}
                style={connectButtonStyle}
                onMouseEnter={(e) => {
                  if (!wallet.isConnecting) {
                    e.target.style.transform = 'translateY(-1px)'
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 184, 148, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 2px 10px rgba(0, 184, 148, 0.3)'
                }}
              >
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div style={walletInfoStyle}>
                <div style={addressStyle}>🔗 {wallet.formatAddress}</div>
                {balances.isLoading ? (
                  <div style={balanceStyle}>Loading...</div>
                ) : usdcBalance ? (
                  <div style={balanceStyle}>
                    💰 ${parseFloat(usdcBalance.value).toFixed(2)} USDC
                  </div>
                ) : (
                  <div style={balanceStyle}>💰 $0.00 USDC</div>
                )}
              </div>
            )}
            {wallet.error && (
              <div style={{ color: '#ff6b6b', fontSize: '0.75rem' }}>
                ⚠️ {wallet.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
