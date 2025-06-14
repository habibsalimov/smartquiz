import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CreateQuiz from './components/quiz/CreateQuiz';
import QuizManager from './components/quiz/QuizManager';
import EditQuiz from './components/quiz/EditQuiz';
import HostDashboard from './components/game/HostDashboard';
import './App.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="flex justify-between items-center">
        <Link 
          to="/" 
          className="text-2xl font-bold hover:text-blue-200 transition duration-200 cursor-pointer"
        >
          SmartQuiz
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm">Hoş geldin, {user.username}!</span>
              <button
                onClick={logout}
                className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm transition duration-200"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <div className="space-x-2">
              <a
                href="/login"
                className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm transition duration-200"
              >
                Giriş Yap
              </a>
              <a
                href="/register"
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition duration-200"
              >
                Kayıt Ol
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function AppContent() {
  return (
    <div className="App">
      <Header />
      <main className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/manage-quizzes" element={<QuizManager />} />
          <Route path="/edit-quiz/:quizId" element={<EditQuiz />} />
          <Route path="/host" element={<HostDashboard onBack={() => window.history.back()} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
