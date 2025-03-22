# Lockin-O-Clock 🕒

A modern, user-friendly Pomodoro timer application built with React to boost your productivity. Stay focused and track your work sessions with this elegant and intuitive timer app.

## 🌟 Features

- **Pomodoro Timer**
  - 25-minute work sessions
  - 5-minute short breaks
  - 15-minute long breaks
  - Customizable timer settings

- **User Experience**
  - Clean, modern UI with dark theme
  - Visual progress indicator
  - Audio notifications for session completion
  - Motivational quotes that change based on timer state

- **Productivity Tools**
  - Session tracking
  - Statistics for daily, monthly, and yearly productivity
  - Persistent settings and preferences
  - Mobile-responsive design

## 🛠️ Technologies Used

- **Frontend Framework**
  - React.js
  - Create React App
  - CSS3 with modern styling features

- **Authentication**
  - Google OAuth integration
  - JWT token handling

- **State Management**
  - React Hooks (useState, useEffect, useCallback)

- **Deployment**
  - Vercel
  - GitHub Pages

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/huzaifakiani14/Lockin-O-Clock.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Lockin-O-Clock
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory and add your Google OAuth client ID:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

5. Start the development server:
   ```bash
   npm start
   ```

The app will open in your default browser at `http://localhost:3000`.

## 🔧 Configuration

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://lockin-o-clock.vercel.app` (for production)

## 📱 Usage

1. **Start a Work Session**
   - Click the play button to begin a 25-minute work session
   - Focus on your task until the timer completes

2. **Take Breaks**
   - After each work session, take a 5-minute break
   - Every 4 work sessions, take a longer 15-minute break

3. **Track Progress**
   - View your productivity statistics
   - Monitor your daily, monthly, and yearly progress

4. **Customize Settings**
   - Adjust timer durations
   - Modify break intervals
   - Change the number of sessions before long breaks

## 🌐 Live Demo

Visit [lockin-o-clock.vercel.app](https://lockin-o-clock.vercel.app) to try the app live!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

- **Huzaifa Kiani**
  - GitHub: [@huzaifakiani14](https://github.com/huzaifakiani14)
  - LinkedIn: [Huzaifa Kiani](https://www.linkedin.com/in/huzaifa-kiani-14/)

## 🙏 Acknowledgments

- React.js community for the amazing framework
- Vercel for the deployment platform
- Google for OAuth integration
