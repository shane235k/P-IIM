"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, LogOut, User, LogIn } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <nav className="navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      height: '64px',
      backgroundColor: 'rgba(9, 9, 11, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Brand Logo - Left */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '15px',
          textDecoration: 'none',
          letterSpacing: '-0.02em'
        }}>
          <Shield size={16} style={{ color: '#818cf8' }} />
          P-IIM
        </Link>
      </div>

      {/* Center Nav Pill - Styled like the Reference Image */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '9999px',
        padding: '3px',
        gap: '2px',
        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)'
      }}>
        <Link 
          href="/" 
          style={{
            padding: '6px 18px',
            fontSize: '12.5px',
            fontWeight: pathname === '/' ? 600 : 500,
            borderRadius: '9999px',
            color: pathname === '/' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: pathname === '/' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            border: pathname === '/' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={e => {
            if (pathname !== '/') {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }
          }}
          onMouseLeave={e => {
            if (pathname !== '/') {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          Home
        </Link>
        <Link 
          href="/dashboard" 
          style={{
            padding: '6px 18px',
            fontSize: '12.5px',
            fontWeight: pathname === '/dashboard' ? 600 : 500,
            borderRadius: '9999px',
            color: pathname === '/dashboard' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: pathname === '/dashboard' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            border: pathname === '/dashboard' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={e => {
            if (pathname !== '/dashboard') {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }
          }}
          onMouseLeave={e => {
            if (pathname !== '/dashboard') {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          Analyze
        </Link>
        <Link 
          href="/history" 
          style={{
            padding: '6px 18px',
            fontSize: '12.5px',
            fontWeight: pathname === '/history' ? 600 : 500,
            borderRadius: '9999px',
            color: pathname === '/history' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: pathname === '/history' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            border: pathname === '/history' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={e => {
            if (pathname !== '/history') {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }
          }}
          onMouseLeave={e => {
            if (pathname !== '/history') {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          Past Reports
        </Link>
      </div>

      {/* User Actions - Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!loading && (
          user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <User size={12} style={{ color: '#818cf8' }} />
                </div>
                <span style={{ fontWeight: 500 }}>{user.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link 
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '13px',
                  padding: '6px 12px',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                <LogIn size={13} />
                Sign In
              </Link>
              <Link 
                href="/register"
                className="btn btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  textDecoration: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Register
              </Link>
            </div>
          )
        )}
      </div>
    </nav>
  );
}
