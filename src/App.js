import React, { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config/googleAuth';
import { jwtDecode } from 'jwt-decode';

// Collection of witty quotes to keep users entertained while they work (or pretend to)
const QUOTES = {
  focus: [
    "Oh look, you're actually going to work now! 👏",
    "Time to pretend you're productive! 💪",
    "Your procrastination ends here... maybe. 🤔",
    "Focus mode: Because TikTok will still be there later. 📱",
    "You've got this! (No pressure, but really, you better.) 😤"
  ],
  break: [
    "Break time! As if you weren't already browsing Instagram. 📸",
    "Quick, pretend you're stretching when someone walks by! 🧘‍♂️",
    "Time to rest those hardworking scrolling fingers. 👆",
    "Coffee break #247 of the day. ☕",
    "Your phone misses you. Go ahead, check it. 📱"
  ],
  motivation: [
    "You're not procrastinating, you're letting your ideas marinate. 🧠",
    "Success is just failure that got tired of winning. 🏆",
    "Your future self is watching you through time... No pressure! 👀",
    "Lockin or you're not getting that internship anytime soon",
    "You're not lazy, you're conserving energy. Very eco-friendly! 🌱"
  ]
};

// Key for storing user stats in localStorage
const STATS_STORAGE_KEY = 'lockin_stats';

function App() {
  // Timer settings - all times in seconds
  const [settings, setSettings] = useState({
    workTime: 25 * 60,        // 25 minutes
    breakTime: 5 * 60,        // 5 minutes
    longBreakTime: 15 * 60,   // 15 minutes
    cyclesBeforeLongBreak: 4  // Number of work sessions before a long break
  });

  // Core timer states
  const [timeLeft, setTimeLeft] = useState(settings.workTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);
  const [cycles, setCycles] = useState(0);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions] = useState(4);
  const [showSettings, setShowSettings] = useState(false);
  
  // User authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Spotify player state - persists across sessions
  const [showSpotify, setShowSpotify] = useState(() => {
    const saved = localStorage.getItem('showSpotify');
    return saved ? JSON.parse(saved) : false;
  });

  // Save Spotify visibility state to localStorage
  useEffect(() => {
    localStorage.setItem('showSpotify', JSON.stringify(showSpotify));
  }, [showSpotify]);

  // Toggle Spotify player visibility
  const toggleSpotify = () => {
    setShowSpotify(prev => !prev);
  };

  // Manual login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle manual login submission
  const handleManualLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      setUserName(email.split('@')[0]); // Use email username as display name
    }
  };

  // Handle successful Google login
  const onGoogleSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setIsLoggedIn(true);
    setUserName(decoded.name);
  };

  // Handle Google login failure
  const onError = () => {
    console.log('Login Failed');
  };

  // Format seconds into MM:SS display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Audio context and alarm sound
  const [audioContext, setAudioContext] = useState(null);
  const [alarmSound, setAlarmSound] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Initialize audio context and load alarm sound
  useEffect(() => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);

    // Create a simple alarm sound using oscillators
    const createAlarmSound = () => {
      const oscillator1 = context.createOscillator();
      const oscillator2 = context.createOscillator();
      const gainNode = context.createGain();

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      oscillator1.frequency.setValueAtTime(880, context.currentTime); // A5 note
      oscillator2.frequency.setValueAtTime(1108.73, context.currentTime); // C#6 note

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(context.destination);

      // Create a pulsing effect
      const pulseInterval = 0.5; // seconds
      const pulseDuration = 0.1; // seconds
      let time = context.currentTime;

      const pulse = () => {
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.5, time + pulseDuration);
        gainNode.gain.linearRampToValueAtTime(0, time + pulseDuration * 2);
        time += pulseInterval;
      };

      // Start pulsing
      for (let i = 0; i < 10; i++) {
        pulse();
      }

      oscillator1.start();
      oscillator2.start();

      return { oscillator1, oscillator2, gainNode };
    };

    setAlarmSound(createAlarmSound);
  }, []);

  // Function to play alarm sound
  const playAlarm = () => {
    if (audioContext && alarmSound && !isAlarmPlaying) {
      setIsAlarmPlaying(true);
      const sound = alarmSound();
      
      // Stop the alarm after 5 seconds
      setTimeout(() => {
        sound.oscillator1.stop();
        sound.oscillator2.stop();
        setIsAlarmPlaying(false);
      }, 5000);
    }
  };

  // Function to stop alarm sound
  const stopAlarm = () => {
    if (audioContext && isAlarmPlaying) {
      audioContext.close();
      setIsAlarmPlaying(false);
    }
  };

  // Main timer logic - handles countdown and session transitions
  useEffect(() => {
    let timerInterval;
    if (isRunning && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Play alarm when timer completes
            playAlarm();
            
            if (isWorkMode) {
              const newCycles = cycles + 1;
              setCycles(newCycles);
              setIsWorkMode(false);
              setCurrentSession(prev => (prev % totalSessions) + 1);
              return newCycles % settings.cyclesBeforeLongBreak === 0 ? 
                settings.longBreakTime : settings.breakTime;
            } else {
              setIsWorkMode(true);
              return settings.workTime;
            }
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isRunning, timeLeft, isWorkMode, cycles, settings, totalSessions]);

  // Stop alarm when timer is reset or paused
  useEffect(() => {
    if (!isRunning) {
      stopAlarm();
    }
  }, [isRunning]);

  // Handle timer setting changes
  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseInt(value) * 60
    }));
  };

  // Quote display states
  const [currentQuote, setCurrentQuote] = useState('');
  const [quoteType, setQuoteType] = useState('motivation');

  // Update displayed quote every 30 seconds
  useEffect(() => {
    const updateQuote = () => {
      const quotes = QUOTES[quoteType];
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(quotes[randomIndex]);
    };

    updateQuote();
    const quoteInterval = setInterval(updateQuote, 30000);
    return () => clearInterval(quoteInterval);
  }, [quoteType]);

  // Update quote type based on current timer state
  useEffect(() => {
    if (isRunning) {
      setQuoteType(isWorkMode ? 'focus' : 'break');
    } else {
      setQuoteType('motivation');
    }
  }, [isRunning, isWorkMode]);

  // Statistics tracking states
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      daily: 0,
      monthly: 0,
      yearly: 0,
      lastUpdate: new Date().toISOString()
    };
  });

  // Update statistics when a work session completes
  useEffect(() => {
    if (!isRunning && timeLeft === settings.workTime && isWorkMode) {
      const now = new Date();
      const lastUpdate = new Date(stats.lastUpdate);
      
      // Reset counters if we're in a new time period
      if (now.getDate() !== lastUpdate.getDate()) {
        setStats(prev => ({ ...prev, daily: 0 }));
      }
      if (now.getMonth() !== lastUpdate.getMonth()) {
        setStats(prev => ({ ...prev, monthly: 0 }));
      }
      if (now.getFullYear() !== lastUpdate.getFullYear()) {
        setStats(prev => ({ ...prev, yearly: 0 }));
      }

      // Add completed session time to all relevant counters
      const workTimeInMinutes = settings.workTime / 60;
      setStats(prev => ({
        ...prev,
        daily: prev.daily + workTimeInMinutes,
        monthly: prev.monthly + workTimeInMinutes,
        yearly: prev.yearly + workTimeInMinutes,
        lastUpdate: now.toISOString()
      }));
    }
  }, [isRunning, timeLeft, isWorkMode, settings.workTime, stats.lastUpdate]);

  // Save statistics to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  // Format time for statistics display (hours and minutes)
  const formatStatsTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Statistics Modal Component - shows user's focus time stats
  const StatsModal = () => (
    <div className="stats-modal">
      <div className="stats-content">
        <div className="stats-header">
          <h2>Your Lockin Stats</h2>
          <button className="close-btn" onClick={() => setShowStats(false)}>×</button>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Today's Focus</span>
            <span className="stat-value">{formatStatsTime(stats.daily)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">This Month</span>
            <span className="stat-value">{formatStatsTime(stats.monthly)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">This Year</span>
            <span className="stat-value">{formatStatsTime(stats.yearly)}</span>
          </div>
        </div>
        <div className="stats-motivation">
          <p>{QUOTES.motivation[Math.floor(Math.random() * QUOTES.motivation.length)]}</p>
        </div>
      </div>
    </div>
  );

  // Login Screen Component - handles user authentication
  const LoginScreen = () => (
    <div className="login-screen">
      <div className="login-content">
        <h1>Lockin O'Clock</h1>
        <p className="tagline">You gotta login in order to lock in! 😉</p>
        <div className="features">
          <div className="feature-item">
            <span>⏱️</span>
            <p>Time Management<br /></p>
          </div>
          <div className="feature-item">
            <span>🎵</span>
            <p>Lofi Beats<br /></p>
          </div>
          <div className="feature-item">
            <span>🎯</span>
            <p>Focus Mode<br /></p>
          </div>
        </div>
        <div className="login-options">
          <div className="google-login">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={onError}
              useOneTap
              theme="filled_black"
              shape="pill"
              size="large"
              text="continue_with"
            />
          </div>
          <div className="divider">
            <span>or</span>
          </div>
          <div className="manual-login">
            <h3>Login</h3>
            <form onSubmit={handleManualLogin}>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lockinorstayjobless@work.com"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="login-btn">
                Let's Pretend to Work!
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Main App Component - contains the timer and settings interface
  const MainApp = () => (
    <div className="App">
      <div className="sidebar">
        <div className="logo">
          <span>Lockin O'clock</span>
        </div>
        <nav>
          <button className="nav-item active" onClick={() => setShowSettings(false)}>
            <span>⏱️</span>
            <span>Timer</span>
          </button>
          <button className="nav-item" onClick={() => setShowSettings(true)}>
            <span>⚙️</span>
            <span>Settings</span>
          </button>
          <button 
            className="nav-item user-info"
            onClick={() => setShowStats(true)}
          >
            <span>👤</span>
            <span>{userName}</span>
          </button>
        </nav>
        <div className="quote-container">
          <p className="quote">{currentQuote}</p>
        </div>
      </div>

      <div className="main-content">
        {!showSettings ? (
          <div className="timer-container">
            <div className="mode-indicator">
              {isWorkMode ? "FOCUS TIME (For Real This Time!)" : "BREAK TIME (Like You Needed Permission)"}
            </div>
            <div className="progress-circle">
              <div className="time-display">{formatTime(timeLeft)}</div>
              <div className="session-info">
                Session {currentSession} of {totalSessions}
              </div>
            </div>
            <div className="controls">
              <button 
                className="control-btn reset-btn"
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(settings.workTime);
                  setIsWorkMode(true);
                  setCycles(0);
                  stopAlarm(); // Stop alarm when resetting
                }}
              >
                ↺
              </button>
              <button 
                className={`control-btn ${isRunning ? 'pause-btn' : 'start-btn'}`}
                onClick={() => {
                  setIsRunning(!isRunning);
                  if (!isRunning) {
                    stopAlarm(); // Stop alarm when starting
                  }
                }}
              >
                {isRunning ? '⏸' : '▶'}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-panel">
            <h2>Customize Your Procrastination</h2>
            <div className="setting-item">
              <label>Work Time (minutes of intended focus)</label>
              <input
                type="number"
                name="workTime"
                value={settings.workTime / 60}
                onChange={handleSettingChange}
                min="1"
                max="60"
              />
            </div>
            <div className="setting-item">
              <label>Break Time (minutes of guilt-free scrolling)</label>
              <input
                type="number"
                name="breakTime"
                value={settings.breakTime / 60}
                onChange={handleSettingChange}
                min="1"
                max="30"
              />
            </div>
            <div className="setting-item">
              <label>Long Break Time (the real break you were waiting for)</label>
              <input
                type="number"
                name="longBreakTime"
                value={settings.longBreakTime / 60}
                onChange={handleSettingChange}
                min="1"
                max="60"
              />
            </div>
            <div className="setting-item">
              <label>Sessions until Long Break (your reward for pretending)</label>
              <input
                type="number"
                name="cyclesBeforeLongBreak"
                value={settings.cyclesBeforeLongBreak}
                onChange={handleSettingChange}
                min="1"
                max="10"
              />
            </div>
          </div>
        )}
      </div>

      <button 
        className={`music-btn ${showSpotify ? 'active' : ''}`}
        onClick={toggleSpotify}
      >
        🎵
      </button>

      {showSpotify && (
        <div className="spotify-player">
          <div className="spotify-header">
            <span>Lofi Beats to Procrastinate To</span>
            <button className="close-btn" onClick={toggleSpotify}>×</button>
          </div>
          <iframe
            title="Spotify Player"
            src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator"
            width="300"
            height="380"
            frameBorder="0"
            allowtransparency="true"
            allow="encrypted-media"
          />
        </div>
      )}

      {showStats && <StatsModal />}
    </div>
  );

  // Render either login screen or main app based on authentication state
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {!isLoggedIn ? <LoginScreen /> : <MainApp />}
    </GoogleOAuthProvider>
  );
}

export default App;
