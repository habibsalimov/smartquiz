# Kahoot Clone - Smart Quiz Platform

Real-time interactive quiz platform built with Node.js, React, Socket.io, and Supabase.

## 🚀 Features

- Real-time multiplayer quiz games
- User authentication and profiles
- Quiz creation and management
- Live game hosting with PIN codes
- Player vs Host gameplay
- Real-time scoring and leaderboards
- Responsive web design

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- Socket.io for real-time communication
- Supabase (PostgreSQL database + Auth)
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React with TypeScript
- Socket.io-client
- React Router for navigation
- Context API for state management

## 📁 Project Structure

```
smartquiz2/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and Socket.io config
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Auth and error handling
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   ├── server.js           # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd smartquiz2
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Environment Setup

Backend (.env):
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

Frontend (.env):
```env
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

5. Database Setup

Create tables in Supabase using the SQL schema provided in the documentation.

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📋 Development Status

### ✅ Completed
- [x] Project structure setup
- [x] Backend dependencies and configuration
- [x] Frontend React app with TypeScript
- [x] Supabase configuration
- [x] Express server and Socket.io setup
- [x] Authentication system (register, login, JWT)
- [x] Socket.io context for frontend

### 🚧 In Progress
- [ ] Quiz creation API and UI
- [ ] Game session management
- [ ] Real-time game flow

### 📅 Planned
- [ ] Player and Host components
- [ ] Real-time scoring system
- [ ] Admin dashboard
- [ ] Game statistics and history

## 🧪 Testing

Backend tests:
```bash
cd backend
npm test
```

Frontend tests:
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Backend
- Configure production environment variables
- Deploy to platforms like Railway, Render, or DigitalOcean

### Frontend
- Build the app: `npm run build`
- Deploy to Vercel, Netlify, or similar platforms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation for detailed implementation guides

---

Built with ❤️ using modern web technologies