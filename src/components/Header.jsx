import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const [userData, setUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPages, setFilteredPages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarKey, setAvatarKey] = useState(() => Date.now());
  const [games, setGames] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const closeDrawer = () => setDrawerOpen(false);
  const drawerRef = useRef(null);
  const togglerRef = useRef(null);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer when route changes
  useEffect(() => {
    setDrawerOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [location]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    if (drawerOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // Close drawer when clicking outside
  useEffect(() => {
    if (!drawerOpen) return;
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target) &&
          togglerRef.current && !togglerRef.current.contains(e.target)) {
        closeDrawer();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [drawerOpen]);

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(json => {
        if (json.success) setGames(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const authToken = sessionStorage.getItem("authToken");
        const currentUser = sessionStorage.getItem("currentUser");

        if (authToken && currentUser) {
          const user = JSON.parse(currentUser);
          setUserData(user);
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        setUserData(null);
      }
    };

    loadUserData();

    const handleUserLoggedIn = () => {
      console.log("User logged in event received");
      loadUserData();
    };

    const handleUserLoggedOut = () => {
      console.log("User logged out event received");
      setUserData(null);
    };

    const handleUserDataUpdated = (e) => {
      console.log("User data updated event received", e.detail);
      if (e.detail) {
        setUserData(e.detail);
      } else {
        loadUserData();
        setAvatarKey(Date.now());
      }
    };

    window.addEventListener("userLoggedIn", handleUserLoggedIn);
    window.addEventListener("userLoggedOut", handleUserLoggedOut);
    window.addEventListener("userDataUpdated", handleUserDataUpdated);

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLoggedIn);
      window.removeEventListener("userLoggedOut", handleUserLoggedOut);
      window.removeEventListener("userDataUpdated", handleUserDataUpdated);
    };
  }, []);

  const topupPages = games.map(g => ({
    name: g.name,
    path: `/game/${g.slug}`,
    image: g.logo || '/asset/logo_game/diamond.png',
  }));

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    setErrorMessage("");

    if (query.trim() === "") {
      setShowDropdown(false);
      setFilteredPages([]);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = topupPages.filter(
        (page) => page.name.toLowerCase().includes(lowerQuery)
      );
      setFilteredPages(filtered);
      setShowDropdown(true);
    }
  };

  const handleSelectGame = (path) => {
    navigate(path);
    setSearchTerm("");
    setShowDropdown(false);
    setErrorMessage("");
    closeDrawer();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filteredPages.length > 0) {
      handleSelectGame(filteredPages[0].path);
    } else if (searchTerm.trim() !== "") {
      setErrorMessage(`Waduh, game "${searchTerm}" belum tersedia.`);
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  const getAvatarSrc = () => {
    if (userData?.avatar) {
      return userData.avatar;
    }
    return "/asset/user.png";
  };

  return (
    <header>
      <nav className="navbar navbar-expand-lg custom-nav">
        <div className="container-fluid">
          <Link to="/" onClick={closeDrawer}>
            <img src="/asset/logo.png" alt="icon_game" width="120px" />
          </Link>
          <button
            ref={togglerRef}
            className={`navbar-toggler custom-nav-toggler ${drawerOpen ? 'custom-nav-toggler--open' : ''}`}
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-controls="customNavDrawer"
            aria-expanded={drawerOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Backdrop overlay when drawer is open */}
          <div
            className={`custom-nav-backdrop ${drawerOpen ? 'custom-nav-backdrop--visible' : ''}`}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <div
            ref={drawerRef}
            id="customNavDrawer"
            className={`custom-nav-drawer ${drawerOpen ? 'custom-nav-drawer--open' : ''}`}
          >
            <div className="custom-nav-drawer-inner">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 custom-nav-links">
              <li className="nav-item">
                <Link className="nav-link custom-nav-link" to="/" onClick={closeDrawer}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link custom-nav-link" to="/promo" onClick={closeDrawer}>
                  Promo
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link custom-nav-link" to="/contact" onClick={closeDrawer}>
                  Contact
                </Link>
              </li>
              {!userData && (
                <li className="nav-item">
                  <Link className="nav-link custom-nav-link" to="/login" onClick={closeDrawer}>
                    Login
                  </Link>
                </li>
              )}
            </ul>

            <form
              className="d-flex position-relative custom-nav-search-wrap"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <input
                className="form-control me-2 custom-nav-search"
                type="search"
                placeholder="Cari Game Anda"
                value={searchTerm}
                onChange={handleInputChange}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />
              <button
                className="btn btn-outline-primary custom-nav-search-btn"
                style={{ marginRight: "10px" }}
                type="submit"
              >
                Search
              </button>

              {showDropdown && (
                <div className="custom-nav-search-dropdown">
                  {filteredPages.length > 0 ? (
                    filteredPages.map((game, index) => (
                      <button
                        key={index}
                        type="button"
                        className="dropdown-item d-flex align-items-center py-2"
                        onClick={() => handleSelectGame(game.path)}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={game.image}
                          alt={game.name}
                          style={{
                            width: "30px",
                            height: "30px",
                            objectFit: "cover",
                            borderRadius: "5px",
                            marginRight: "10px",
                          }}
                          onError={(e) => (e.target.src = "/asset/logo.png")}
                        />
                        <span style={{ fontWeight: "500" }}>{game.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="dropdown-item text-muted disabled">
                      Game tidak ditemukan
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="custom-nav-error-toast">
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  {errorMessage}
                </div>
              )}
            </form>

            <ul className="navbar-nav custom-nav-profile-wrap">
              <li className="nav-item dropdown custom-nav-profile-item">
                <a
                  className="nav-link dropdown-toggle custom-nav-profile-pill"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <img
                    key={avatarKey}
                    src={getAvatarSrc()}
                    alt="profile"
                    className={`header-profile-icon ${!userData ? 'custom-nav-guest-icon' : ''}`}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: "8px",
                      border: userData ? "2px solid #00f2ff" : "2px solid transparent",
                    }}
                    onError={(e) => (e.target.src = "/asset/user.png")}
                  />
                  <span
                    className={userData ? 'custom-nav-username' : 'custom-nav-guest-text'}
                  >
                    {userData?.username || "GUEST"}
                  </span>
                  {userData && (
                    <span className="custom-nav-level-pill">
                      Lvl {userData.level || 1}
                    </span>
                  )}
                </a>
                <ul className="dropdown-menu custom-nav-dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to="/profile" onClick={closeDrawer}>
                      View Profile
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/history" onClick={closeDrawer}>
                      History
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/point" onClick={closeDrawer}>
                      Point
                    </Link>
                  </li>
                  {userData?.isAdmin && (
                    <li><hr className="dropdown-divider" /></li>
                  )}
                  {userData?.isAdmin && (
                    <li>
                      <Link className="dropdown-item admin-link" to="/admin" onClick={closeDrawer}>
                        ◆ Admin Panel
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            </ul>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
