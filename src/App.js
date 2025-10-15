import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config/googleAuth';
import { jwtDecode } from 'jwt-decode';

// Motivational quotes for different timer states
const QUOTES = {
  focus: [
    "Stay focused, you've got this!",
    "One session at a time.",
    "Deep work mode activated.",
    "Focus is your superpower.",
    "Make every minute count."
  ],
  break: [
    "Time for a well-deserved break.",
    "Rest and recharge.",
    "Step away from the screen.",
    "Fresh air and fresh perspective.",
    "Break time - you earned it!"
  ],
  motivation: [
    "Consistency beats perfection.",
    "Small steps lead to big results.",
    "Your future self will thank you.",
    "Progress over perfection.",
    "Every session builds momentum."
  ]
};

// Key for storing user settings in localStorage
const SETTINGS_STORAGE_KEY = 'lockin_settings';

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

  // Skip to next session
  const skipSession = () => {
    setIsRunning(false);
    if (isWorkMode) {
      const newCycles = cycles + 1;
      setCycles(newCycles);
      setIsWorkMode(false);
      setCurrentSession(prev => (prev % totalSessions) + 1);
      setTimeLeft(newCycles % settings.cyclesBeforeLongBreak === 0 ? 
        settings.longBreakTime : settings.breakTime);
    } else {
      setIsWorkMode(true);
      setTimeLeft(settings.workTime);
    }
    stopAlarm();
  };

  // Handle successful Google login
  const onGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      setIsLoggedIn(true);
      setUserName(decoded.name || decoded.email);
    } catch (error) {
      console.error('Error decoding JWT:', error);
    }
  };

  // Handle Google login failure
  const onError = () => {
    console.log('Google Login Failed');
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
  const playAlarm = useCallback(() => {
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
  }, [audioContext, alarmSound, isAlarmPlaying]);

  // Function to stop alarm sound
  const stopAlarm = useCallback(() => {
    if (audioContext && isAlarmPlaying) {
      audioContext.close();
      setIsAlarmPlaying(false);
    }
  }, [audioContext, isAlarmPlaying]);

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
  }, [isRunning, timeLeft, isWorkMode, cycles, settings, totalSessions, playAlarm]);

  // Stop alarm when timer is reset or paused
  useEffect(() => {
    if (!isRunning) {
      stopAlarm();
    }
  }, [isRunning, stopAlarm]);

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

  // Login Screen Component - handles user authentication
  const LoginScreen = () => (
    <div className="login-screen">
      <div className="login-content">
        <h1>Lockin O'Clock</h1>
        <p className="tagline">Focus better, work smarter</p>
        
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
          <div className="skip-login">
            <button 
              className="skip-btn"
              onClick={() => setIsLoggedIn(true)}
            >
              Continue without signing in
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Main App Component - contains the timer and settings interface
  const MainApp = () => (
    <div className="App">
      {/* Top navigation bar */}
      <div className="top-nav">
        <div className="nav-left">
          <h1 className="app-title">Lockin O'Clock</h1>
          {userName && <span className="user-greeting">Welcome, {userName}</span>}
        </div>
        <div className="nav-right">
          <button 
            className="nav-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="nav-btn"
            onClick={toggleSpotify}
            title="Music"
          >
            🎵
          </button>
          {!isLoggedIn && (
            <div className="google-signin-nav">
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={onError}
                theme="outline"
                shape="pill"
                size="small"
                text="signin_with"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main timer area */}
      <div className="main-content">
        {!showSettings ? (
          <div className="timer-container">
            <div className="mode-indicator">
              {isWorkMode ? "Focus" : "Break"}
            </div>
            
            <div className="timer-circle">
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
                  stopAlarm();
                }}
                title="Reset"
              >
                ↺
              </button>
              <button 
                className={`control-btn main-btn ${isRunning ? 'pause-btn' : 'start-btn'}`}
                onClick={() => {
                  setIsRunning(!isRunning);
                  if (!isRunning) {
                    stopAlarm();
                  }
                }}
              >
                {isRunning ? '⏸' : '▶'}
              </button>
              <button 
                className="control-btn skip-btn"
                onClick={skipSession}
                title="Skip"
              >
                ⏭
              </button>
            </div>
            
            {/* Quote display */}
            <div className="quote-display">
              <p className="quote">{currentQuote}</p>
            </div>
          </div>
        ) : (
          <div className="settings-panel">
            <h2>Settings</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Work Time (minutes)</label>
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
                <label>Break Time (minutes)</label>
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
                <label>Long Break Time (minutes)</label>
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
                <label>Sessions until Long Break</label>
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
          </div>
        )}
      </div>

      {/* Spotify player */}
      {showSpotify && (
        <div
          className="spotify-player"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div className="spotify-header">
            <span>Lofi Beats</span>
            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleSpotify();
              }}
            >
              ×
            </button>
          </div>
          <div
            className="spotify-iframe-container"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <iframe
              title="Spotify Player"
              src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator"
              width="300"
              height="380"
              frameBorder="0"
              allowtransparency="true"
              allow="encrypted-media"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Stats modal */}
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
