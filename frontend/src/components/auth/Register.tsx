import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.email) {
      errors.push('E-posta gerekli');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('E-posta geçersiz');
    }

    if (!formData.username) {
      errors.push('Kullanıcı adı gerekli');
    } else if (formData.username.length < 3) {
      errors.push('Kullanıcı adı en az 3 karakter olmalı');
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      errors.push('Kullanıcı adı sadece harf ve rakam içerebilir');
    }

    if (!formData.password) {
      errors.push('Şifre gerekli');
    } else if (formData.password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalı');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Şifreler eşleşmiyor');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }

    const success = await register(formData.email, formData.username, formData.password);
    if (success) {
      navigate('/');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Akıllı Quiz'e Katıl</h1>
          <p className="text-gray-600">Quiz yönetmeye başlamak için hesabınızı oluşturun</p>
        </div>

        {(error || validationErrors.length > 0) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error && <div className="mb-2">{error}</div>}
            {validationErrors.map((err, index) => (
              <div key={index} className="text-sm">• {err}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-posta Adresi
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="E-posta adresinizi girin"
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="Bir kullanıcı adı seçin"
              required
            />
            <p className="text-xs text-gray-500 mt-1">3-30 karakter, sadece harf ve rakam</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="Bir şifre oluşturun"
              required
            />
            <p className="text-xs text-gray-500 mt-1">En az 6 karakter</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre Onayla
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="Şifrenizi onaylayın"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email || !formData.username || !formData.password || !formData.confirmPassword}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-lg"
          >
            {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-800 font-medium">
              Buradan giriş yapın
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link 
            to="/" 
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;