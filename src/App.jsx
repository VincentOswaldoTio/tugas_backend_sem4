import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import GamePage from './pages/GamePage';
import Pembayaran from './pages/Pembayaran';
import History from './pages/History';
import Promo from './pages/Promo';
import Contact from './pages/Contact';
import About from './pages/About';
import Faq from './pages/Faq';
import Login from './pages/Login';
import PelajariLebih from './pages/PelajariLebih';
import Point from './pages/Point';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Reset from './pages/Reset';
import Summary from './pages/Summary';
import Voucher from './pages/Voucher';
import './styles/Animations.css'
import './App.css';
import { PointProvider } from "./components/PointContext";
import { TransactionProvider } from './components/TransactionContext';

function App() {
  return (
    <PointProvider>
      <TransactionProvider>
        <BrowserRouter>
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
          <div className="app-container d-flex flex-column min-vh-100">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/game/:slug" element={<GamePage />} />
              <Route path="/pembayaran" element={<Pembayaran />} />
              <Route path="/history" element={<History />} />
              <Route path="/promo" element={<Promo />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pelajari-lebih" element={<PelajariLebih />} />
              <Route path="/point" element={<Point />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset" element={<Reset />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/voucher" element={<Voucher />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
      </TransactionProvider>
    </PointProvider>
  );
}

export default App;
