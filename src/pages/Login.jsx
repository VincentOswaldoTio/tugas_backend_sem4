import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Login.css';
import '../styles/Animations.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validasi input
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username/Email dan Password harus diisi');
      setIsLoading(false);
      return;
    }

    try {
      // Hit backend API untuk login
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'Login gagal');
        setIsLoading(false);
        return;
      }

      // Simpan data user yang login ke sessionStorage
      const userData = result.data;

      // Simpan ke sessionStorage
      sessionStorage.setItem('authToken', 'dummy-token-' + Date.now());
      sessionStorage.setItem('userData', JSON.stringify(userData));
      sessionStorage.setItem('currentUser', JSON.stringify(userData));

      // Tambahkan timestamp login
      sessionStorage.setItem('loginTime', Date.now().toString());

      // Reset form
      setFormData({
        username: '',
        password: ''
      });

      // Tampilkan success message
      setSuccess(`Login berhasil! Selamat datang ${userData.username}`);

      // Kirim custom event untuk memberi tahu komponen lain
      window.dispatchEvent(new Event('userLoggedIn'));

      // Redirect ke halaman profile
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login - actually perform login
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      // First try to login
      let response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'demo_user',
          password: 'demo123'
        })
      });

      let result = await response.json();

      // If login fails (user doesn't exist), register first
      if (!response.ok || !result.success) {
        const regResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'demo_user',
            email: 'demo@example.com',
            password: 'demo123'
          })
        });

        const regResult = await regResponse.json();

        if (!regResponse.ok || !regResult.success) {
          setError(regResult.message || 'Gagal membuat demo user');
          setIsLoading(false);
          return;
        }

        // Now login with demo credentials
        response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'demo_user',
            password: 'demo123'
          })
        });

        result = await response.json();
      }

      if (!response.ok || !result.success) {
        setError(result.message || 'Demo login gagal');
        setIsLoading(false);
        return;
      }

      // Success - set up session
      const userData = result.data;
      sessionStorage.setItem('authToken', 'demo-token-' + Date.now());
      sessionStorage.setItem('userData', JSON.stringify(userData));
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      sessionStorage.setItem('loginTime', Date.now().toString());

      window.dispatchEvent(new Event('userLoggedIn'));

      setSuccessMessage(`Demo login berhasil! Selamat datang ${userData.username}`);

      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (err) {
      setError('Terjadi kesalahan saat demo login.');
      console.error('Demo login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="anim-logo-fall-container">
        <img src="/asset/logo_game/coc.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/mlbb.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/valorant.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/roblox.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/coc.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/mlbb.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/valorant.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/roblox.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/coc.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/mlbb.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/valorant.png" alt="logo" className="anim-falling-logo" />
        <img src="/asset/logo_game/roblox.png" alt="logo" className="anim-falling-logo" />
      </div>

      <main className="login-main">
        <div className="login-container">
          <h2>Login</h2>
          
          {/* Success Message */}
          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username/Email</label>
              <input 
                type="text" 
                className="form-control" 
                id="username" 
                placeholder="Enter your username/email"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                id="password" 
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : 'Login'}
              </button>

              <button 
                type="button" 
                className="btn btn-outline-info"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                Try Demo
              </button>
            </div>


            <div className="row mt-3">
              <div className="col-6 login-reset-link">
                <div className="mb-3">
                  <div>
                    <Link to="/reset">Forgot Password?</Link>
                  </div>
                </div>
              </div>
              <div className="col-6 text-end login-register-link">
                <div className="mb-3">
                  <div>
                    <Link to="/register">Register Here</Link>
                  </div>
                </div>
              </div>
            </div>
          </form>

        </div>
      </main>
    </>
  );
};

export default Login;