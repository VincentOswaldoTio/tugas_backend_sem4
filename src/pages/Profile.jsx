import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Profile.css';
import '../styles/Animations.css';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState({
    username: false,
    email: false,
    password: false,
    birthday: false,
    gender: false
  });
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthday: '',
    gender: ''
  });
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Load user data dari sessionStorage saat komponen mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const authToken = sessionStorage.getItem('authToken');
        const storedUser = sessionStorage.getItem('userData');
        const currentUser = sessionStorage.getItem('currentUser');

        // Cek apakah user benar-benar login (ada authToken)
        if (!authToken) {
          setUserData(null);
          setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            birthday: '',
            gender: ''
          });
          return;
        }

        // Prioritize currentUser, fallback to userData
        const user = currentUser ? JSON.parse(currentUser) :
                    storedUser ? JSON.parse(storedUser) : null;

        if (user) {
          setUserData(user);
          setFormData({
            username: user.username || '',
            email: user.email || '',
            password: '',
            confirmPassword: '',
            birthday: user.birthday || '',
            gender: user.gender || ''
          });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserData(null);
      }
    };

    loadUserData();

    // Listen for storage changes (from other tabs or logout)
    const handleStorageChange = (e) => {
      if (e.key === 'userData' || e.key === 'authToken' || e.key === 'currentUser') {
        loadUserData();
      }
    };

    // window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Toggle edit mode
  const toggleEditMode = (field) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // Reset errors dan success message
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setSuccessMessage('');
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle gender change
  const handleGenderChange = (e) => {
    const selectedValue = e.target.value;
    console.log('Gender selected:', selectedValue);
    setFormData(prev => ({
      ...prev,
      gender: selectedValue
    }));
  };

  // Validate field
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch(field) {
      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username tidak boleh kosong';
        } else if (value.length < 3) {
          newErrors.username = 'Username minimal 3 karakter';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          newErrors.username = 'Username hanya boleh huruf, angka, dan underscore';
        } else {
          delete newErrors.username;
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email tidak boleh kosong';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format email tidak valid';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        if (value && value.length < 6) {
          newErrors.password = 'Password minimal 6 karakter';
        } else {
          delete newErrors.password;
        }
        break;
        
      case 'confirmPassword':
        if (formData.password && value !== formData.password) {
          newErrors.confirmPassword = 'Password tidak cocok';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
        
      case 'birthday':
        if (value && !/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(value)) {
          newErrors.birthday = 'Format: DD-MMM-YYYY (contoh: 01-Jan-2000)';
        } else {
          delete newErrors.birthday;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (field) => {
    const value = formData[field];
    console.log(`Saving ${field}:`, value);

    // Validasi field
    const isValid = validateField(field, value);
    console.log(`Validation result for ${field}:`, isValid);

    if (!isValid) {
      console.log('Validation failed, aborting save');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      let updatedData = {};

      switch(field) {
        case 'username':
          updatedData = { username: value };
          break;

        case 'email':
          updatedData = { email: value };
          break;

        case 'password':
          if (!value) {
            setErrors({ password: 'Password harus diisi' });
            setIsLoading(false);
            return;
          }
          updatedData = { password: value };
          // Clear password fields setelah save
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }));
          break;

        case 'birthday':
          updatedData = { birthday: value };
          break;

        case 'gender':
          updatedData = { gender: value };
          break;

        default:
          break;
      }

      // Kirim request ke backend API
      const response = await fetch(`/api/profile/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ [field]: result.message || 'Gagal mengupdate data' });
        setIsLoading(false);
        return;
      }

      // Update userData di state
      const updatedUser = { ...userData, ...updatedData };
      setUserData(updatedUser);

      // Update sessionStorage (remove password before storing)
      const { password, confirmPassword, ...userDataWithoutSensitive } = updatedUser;
      sessionStorage.setItem('userData', JSON.stringify(userDataWithoutSensitive));
      sessionStorage.setItem('currentUser', JSON.stringify(userDataWithoutSensitive));

      // Update form data
      setFormData(prev => ({
        ...prev,
        ...updatedData
      }));

      // Tampilkan success message
      setSuccessMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} berhasil diupdate!`);

      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUser }));

      // Keluar dari edit mode setelah 2 detik
      setTimeout(() => {
        setEditMode(prev => ({ ...prev, [field]: false }));
        setSuccessMessage('');
      }, 2000);

    } catch (error) {
      setErrors({ [field]: 'Terjadi kesalahan. Pastikan backend berjalan.' });
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancel = (field) => {
    setEditMode(prev => ({ ...prev, [field]: false }));
    setErrors(prev => ({ ...prev, [field]: '' }));

    // Reset ke nilai semula
    if (userData) {
      setFormData(prev => ({
        ...prev,
        [field]: userData[field] || ''
      }));
    }
  };

  // Handle avatar upload
  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userData?.id) return;

    // Validasi ukuran di frontend
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ avatar: 'Ukuran gambar terlalu besar. Maksimal 10 MB.' });
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('avatar', file);
    formDataUpload.append('userId', userData.id);

    setIsLoading(true);

    try {
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formDataUpload
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ avatar: result.message || 'Gagal upload avatar' });
        setIsLoading(false);
        return;
      }

      // === BAGIAN YANG DIPERBAIKI ===
      // Arahkan ke endpoint gambar yang ada di index.js
      const newAvatarUrl = `/api/avatar/${userData.id}`; 
      
      const updatedUser = { 
        ...userData, 
        avatar: newAvatarUrl 
      };

      // 1. Update state agar re-render
      setUserData(updatedUser); 

      // 2. Simpan ke sessionStorage agar tidak hilang saat di-refresh
      sessionStorage.setItem('userData', JSON.stringify(updatedUser));
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // 3. Beritahu Header.jsx untuk ikut mengganti foto profil
      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUser }));
      // ==============================

      setSuccessMessage('Foto profil berhasil diupdate!');
      setTimeout(() => setSuccessMessage(''), 2000);

    } catch (error) {
      setErrors({ avatar: 'Terjadi kesalahan. Pastikan backend berjalan.' });
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan!')) {
      setIsLoading(true);

      try {
        // Call API backend untuk delete user
        const response = await fetch(`/api/deleteUser/${userData.id}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.message || 'Gagal menghapus akun');
          setIsLoading(false);
          return;
        }

        // Hapus SEMUA session data
        sessionStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('loginTime');

        // Reset state
        setUserData(null);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          birthday: '',
          gender: ''
        });

        // Redirect ke home
        navigate('/');

        // Show goodbye message
        alert('Akun berhasil dihapus. Selamat tinggal!');

      } catch (error) {
        console.error('Delete account error:', error);
        alert('Terjadi kesalahan saat menghapus akun. Pastikan server backend berjalan.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle logout - PERBAIKI INI
  const handleLogout = () => {
    // Hapus SEMUA data user dari sessionStorage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('loginTime');
    
    // Reset state userData ke null
    setUserData(null);

    // Kirim custom event untuk memberi tahu komponen lain
    window.dispatchEvent(new Event('userLoggedOut'));
    
    // Reset form data
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      birthday: '',
      gender: 'Female'
    });
    
    // Navigate ke home
    navigate('/');
  };

  // Jika belum login, tampilkan notifikasi
  if (!userData) {
    return (
      <div className="profile-main">
        <div className="profile-container">
          <div className="login-required-notification">
            <div className="notification-icon">
              <img src="/asset/lock.png" alt="Lock" />
            </div>
            <h2>Session Expired</h2>
            <p>Your session has ended. Please login or register to continue</p>
            <div className="auth-buttons">
              <Link to="/login" className="auth-btn login-btn">
                Login Now
              </Link>
              <Link to="/register" className="auth-btn register-btn">
                Create Account
              </Link>
            </div>
            <p className="mt-3">
              Or return to <Link to="/">Home Page</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background Animation */}
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

      {/* PROFILE */}
      <main className="profile-main">
        <section className="profile-container">
          
          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success" role="alert">
              {successMessage}
            </div>
          )}

          {/* HEADER */}
          <section className="profile-header">
            <div className="avatar-wrapper">
              <img
                src={userData.avatar
      ? `${userData.avatar}?t=${Date.now()}`   // tambahkan query string agar cache bust
      : "/asset/profile.png"}
                alt="Profile"
                className="profile-avatar"
              />
              <span className="level-badge">{userData.level || 1}</span>
              
              {/* Avatar Upload Button */}
              <div className="avatar-upload">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar-upload" className="avatar-upload-label">
                  <img src="/asset/camera.svg" alt="Edit avatar" width="20" />
                </label>
              </div>
            </div>

            <div className="profile-info">
              <h1 className="profile-name">
                {userData.username || "GUEST"}
                <span className="edit-icon">
                  <img 
                    src="/asset/pencil-circle.svg" 
                    alt="edit" 
                    onClick={() => toggleEditMode('username')}
                    style={{ cursor: 'pointer' }}
                  />
                </span>
              </h1>

              <div className="profile-details">
                <p>Join since: <span>{userData.joinDate || "15-Nov-2023"}</span></p>
                <p>
                  Bday:
                  <span>
                    {editMode.birthday ? (
                      <input
                        type="text"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleInputChange}
                        placeholder="DD-MMM-YYYY"
                        className="inline-edit-input"
                      />
                    ) : (
                      userData.birthday || "-"
                    )}
                    {editMode.birthday ? (
                      <>
                        <button 
                          onClick={() => handleSave('birthday')}
                          disabled={isLoading}
                          className="inline-save-btn"
                        >
                          {isLoading ? '...' : 'Save'}
                        </button>
                        <button 
                          onClick={() => handleCancel('birthday')}
                          className="inline-cancel-btn"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <img 
                        src="/asset/pencil-circle.svg" 
                        alt="edit" 
                        onClick={() => toggleEditMode('birthday')}
                        className="inline-edit-icon"
                      />
                    )}
                  </span>
                </p>
                <p>
                  Gender:
                  <span>
                    {editMode.gender ? (
                      <select
                        name="gender"
                        value={formData.gender || ''}
                        onChange={handleGenderChange}
                        className="inline-edit-select"
                      >
                        <option value="">-</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      userData.gender || "-"
                    )}
                    {editMode.gender ? (
                      <>
                        <button 
                          onClick={() => handleSave('gender')}
                          disabled={isLoading}
                          className="inline-save-btn"
                        >
                          {isLoading ? '...' : 'Save'}
                        </button>
                        <button 
                          onClick={() => handleCancel('gender')}
                          className="inline-cancel-btn"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <img 
                        src="/asset/pencil-circle.svg" 
                        alt="edit" 
                        onClick={() => toggleEditMode('gender')}
                        className="inline-edit-icon"
                      />
                    )}
                  </span>
                </p>
              </div>

              <div>
                <a className="security-link" href="#">Security Settings</a>
                <button 
                  className="logout-btn" 
                  onClick={handleLogout}
                  style={{
                    marginLeft: '15px',
                    background: 'transparent',
                    border: '1px solid #ff5555',
                    color: '#ff5555',
                    padding: '5px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </section>

          {/* ACCOUNT SETTINGS */}
          <section className="account-settings">
            <h2>Account Settings</h2>

            {/* Username */}
            <div className="setting-item">
              <label>Username</label>
              {editMode.username ? (
                <div className="edit-mode-container">
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={errors.username ? 'error' : ''}
                  />
                  {errors.username && <span className="error-message">{errors.username}</span>}
                  <div className="edit-buttons">
                    <button 
                      onClick={() => handleSave('username')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('username')}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input 
                    type="text" 
                    value={userData.username || "user_name_123"} 
                    readOnly 
                  />
                  <button onClick={() => toggleEditMode('username')}>Edit</button>
                </>
              )}
            </div>

            {/* Email */}
            <div className="setting-item">
              <label>Email</label>
              {editMode.email ? (
                <div className="edit-mode-container">
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                  <div className="edit-buttons">
                    <button 
                      onClick={() => handleSave('email')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('email')}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input 
                    type="email" 
                    value={userData.email || "user@example.com"} 
                    readOnly 
                  />
                  <button onClick={() => toggleEditMode('email')}>Edit</button>
                </>
              )}
            </div>

            {/* Password */}
            <div className="setting-item">
              <label>Password</label>
              {editMode.password ? (
                <div className="edit-mode-container">
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="New password"
                    className={errors.password ? 'error' : ''}
                  />
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  {(errors.password || errors.confirmPassword) && (
                    <span className="error-message">
                      {errors.password || errors.confirmPassword}
                    </span>
                  )}
                  <div className="edit-buttons">
                    <button 
                      onClick={() => handleSave('password')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleCancel('password')}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input type="password" value="********" readOnly />
                  <button onClick={() => toggleEditMode('password')}>Edit</button>
                </>
              )}
            </div>

            {/* Delete Account */}
            <div className="setting-item danger">
              <button 
                className="delete-btn"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </section>

        </section>
      </main>
    </>
  );
};

export default Profile;