"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const QUOTES = [
  { text: "In investing, what is comfortable is rarely profitable. Validate assumptions, audit bias, and seek facts.", author: "Robert Arnott", isDark: true },
  { text: "The individual investor should act consistently as an investor and not as a speculator. Test your thesis.", author: "Benjamin Graham", isDark: false },
  { text: "Risk comes from not knowing what you are doing. Adversarial stress-testing proves what you actually know.", author: "Warren Buffett", isDark: true },
  { text: "It is the mark of an educated mind to be able to entertain a thought without accepting it. Stress-test it.", author: "Aristotle", isDark: false },
  { text: "The three most dangerous words in business and investing are 'Ego', 'Bias', and 'Overconfidence'. Audit first.", author: "Howard Marks", isDark: true },
  { text: "In a state of stress, the weak points of any investment thesis or balance sheet will always crack first.", author: "Risk Principle", isDark: false },
];

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Robust circular slide state variables
  const [quotes, setQuotes] = useState(QUOTES);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentOriginalIdx, setCurrentOriginalIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentOriginalIdx((prev) => (prev + 1) % QUOTES.length);

      setTimeout(() => {
        setQuotes((prev) => [...prev.slice(1), prev[0]]);
        setIsTransitioning(false);
      }, 650); // transition time: 600ms
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const jumpToQuote = (targetIdx: number) => {
    if (isTransitioning) return;
    setError('');

    // Calculate distance
    const diff = (targetIdx - currentOriginalIdx + QUOTES.length) % QUOTES.length;
    if (diff === 0) return;

    setIsTransitioning(true);
    setCurrentOriginalIdx(targetIdx);

    setTimeout(() => {
      setQuotes((prev) => {
        const cycled = [...prev.slice(diff), ...prev.slice(0, diff)];
        return cycled;
      });
      setIsTransitioning(false);
    }, 650);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (isRegistering && !agreeTerms) {
      setError("You must agree to the terms and conditions.");
      return;
    }

    setError('');
    setLoading(true);

    const url = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setError('');
    setIsRegistering(!isRegistering);
  };

  return (
    <div className="auth-wrapper">
      <Link href="/" className="back-to-home-link">
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>
      {/* Parent Black Container with Thin Distinctive Zinc Border */}
      <div className="auth-box">

        {/* First Half: Sliding Component (Covering 100% height and width) */}
        <div className="spline-side">
          <div className="carousel-container">
            <div
              className="carousel-track"
              style={{
                transform: isTransitioning ? 'translateX(-100%)' : 'translateX(0)',
                transition: isTransitioning ? 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
              }}
            >
              <div className="quote-slide-wrapper">
                <div className={`quote-card ${quotes[0].isDark ? 'card-dark' : 'card-light'}`}>
                  <div className="quote-content-middle">
                    <p className="quote-text">"{quotes[0].text}"</p>
                    <p className="quote-author">— {quotes[0].author}</p>
                  </div>
                </div>
              </div>
              <div className="quote-slide-wrapper">
                <div className={`quote-card ${quotes[1].isDark ? 'card-dark' : 'card-light'}`}>
                  <div className="quote-content-middle">
                    <p className="quote-text">"{quotes[1].text}"</p>
                    <p className="quote-author">— {quotes[1].author}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel indicators absolute positioned inside */}
          <div className="carousel-indicators">
            {QUOTES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => jumpToQuote(idx)}
                className={`indicator-dot ${currentOriginalIdx === idx ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Second Half: Login / Register Form */}
        <div className="form-side">
          <div className="form-container">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                {isRegistering ? "Create an account" : "Sign in to P-IIM"}
              </h2>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                {isRegistering ? "Start auditing investment thesis statements" : "Access the investment audit and reasoning database"}
              </p>
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#ef4444',
                fontSize: '12.5px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isRegistering && (
                <div className="fade-in-field">
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ededed',
                    marginBottom: '6px'
                  }}>
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={isRegistering}
                    className="zinc-input"
                  />
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ededed',
                  marginBottom: '6px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="zinc-input"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ededed',
                  marginBottom: '6px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter a password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="zinc-input"
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#71717a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  id="auth-checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="zinc-checkbox"
                />
                <label htmlFor="auth-checkbox" style={{ fontSize: '12px', color: '#a1a1aa', cursor: 'pointer', userSelect: 'none' }}>
                  {isRegistering ? (
                    <>
                      I agree to all the <span style={{ textDecoration: 'underline', color: '#ffffff' }}>terms and conditions</span>
                    </>
                  ) : (
                    "Remember my session details"
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="zinc-button"
              >
                {loading ? (isRegistering ? "Creating Account..." : "Authenticating...") : (isRegistering ? "Sign up" : "Sign in")}
                {!loading && <ArrowRight size={14} style={{ marginLeft: '6px' }} />}
              </button>
            </form>

            <div style={{
              marginTop: '24px',
              borderTop: '1px solid #27272a',
              paddingTop: '16px',
              textAlign: 'center',
              fontSize: '12.5px',
              color: '#a1a1aa'
            }}>
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={handleToggle}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12.5px',
                  fontFamily: 'inherit'
                }}
              >
                {isRegistering ? "Sign in" : "Create an account"}
              </button>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        html, body {
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background-color: #000000 !important;
        }
        .container {
          padding: 0 !important;
          max-width: 100% !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100vh !important;
          background-color: #000000 !important;
        }
        .auth-wrapper {
          display: flex;
          height: 100vh;
          width: 100vw;
          background-color: #000000;
          color: #ffffff;
          justify-content: center;
          align-items: center;
          padding: 32px 48px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }
        .back-to-home-link {
          position: absolute;
          top: 32px;
          left: 48px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #a1a1aa;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          z-index: 100;
          transition: color 0.2s ease;
        }
        .back-to-home-link:hover {
          color: #ffffff;
        }
        .auth-box {
          display: flex;
          width: 100%;
          max-width: 1280px;
          height: calc(100vh - 64px);
          min-height: 520px;
          background-color: #000000;
          border: 1px solid #27272a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
        }
        .spline-side {
          flex: 1;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .carousel-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }
        .carousel-track {
          display: flex;
          width: 100%;
          height: 100%;
        }
        .quote-slide-wrapper {
          width: 100%;
          height: 100%;
          flex-shrink: 0;
        }
        .quote-card {
          width: 100%;
          height: 100%;
          padding: 80px 60px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          border: none !important;
          outline: none !important;
          border-radius: 0 !important;
        }
        .card-dark {
          background-color: #000000ff !important;
          color: #ffffff !important;
        }
        .card-light {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        .quote-content-middle {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 20px;
          height: 100%;
        }
        .quote-text {
          font-size: 34px;
          font-weight: 800;
          line-height: 1.35;
          margin: 0;
          letter-spacing: -0.03em;
        }
        .quote-author {
          font-size: 14px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          opacity: 0.75;
          margin: 0;
        }
        .carousel-indicators {
          position: absolute;
          bottom: 36px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 10;
        }
        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          padding: 0;
          cursor: pointer;
          background-color: #27272a;
          transition: background-color 0.25s ease, transform 0.25s ease;
        }
        .indicator-dot.active {
          background-color: #ffffff;
          transform: scale(1.3);
        }
        .form-side {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          border-left: 1px solid #27272a !important;
          background-color: #000000;
        }
        .form-container {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          animation: authFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .zinc-input {
          width: 100%;
          padding: 14px 18px;
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .zinc-input:focus {
          border-color: #3f3f46;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
        }
        .zinc-input::placeholder {
          color: #71717a;
        }
        .zinc-checkbox {
          appearance: none;
          width: 15px;
          height: 15px;
          border: 1px solid #27272a;
          border-radius: 4px;
          background-color: #18181b;
          outline: none;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justifyContent: center;
          margin: 0;
        }
        .zinc-checkbox:checked {
          background-color: #ffffff;
          border-color: #ffffff;
        }
        .zinc-checkbox:checked::after {
          content: "";
          width: 4px;
          height: 8px;
          border: solid #000000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-1px, -1px);
        }
        .zinc-button {
          width: 100%;
          padding: 14px;
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 8px;
          color: #ffffff;
          font-weight: 600;
          font-size: 14.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justifyContent: center;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          box-sizing: border-box;
          margin-top: 10px;
        }
        .zinc-button:hover:not(:disabled) {
          background-color: #27272a;
          border-color: #3f3f46;
        }
        .zinc-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .fade-in-field {
          animation: slideDownIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; overflow: hidden; margin-bottom: -10px; }
          to { opacity: 1; transform: translateY(0); max-height: 80px; margin-bottom: 0; }
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .auth-box {
            height: auto;
            flex-direction: column;
          }
          .spline-side {
            height: 320px;
          }
          .form-side {
            border-left: none !important;
            border-top: 1px solid #27272a !important;
            padding: 40px 24px;
          }
        }
      `}</style>
    </div>
  );
}
