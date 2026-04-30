import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PointContext } from "../components/PointContext";
import Notification from "../components/Notification";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/Voucher.css";

const Voucher = () => {
  const [inputCode, setInputCode] = useState("");
  const [notif, setNotif] = useState(null);
  const { addPoints } = useContext(PointContext);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Munculkan notifikasi pertama segera setelah halaman dimuat
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotif({
      msg: "Kode redeem 2026 (2500 poin) = SUKSES77",
      id: Date.now()
    });

    // 2. Tunggu 4 detik (3 detik durasi notif 1 + 1 detik jeda) baru munculkan yang kedua
    const timer = setTimeout(() => {
      setNotif({ 
        msg: "Kode redeem 2026 (5000 poin) = GACOR88", 
        id: Date.now() + 1 // ID berbeda agar React merender ulang komponen
      });
    }, 4000);

    // Bersihkan timer jika user pindah halaman sebelum notif kedua muncul
    return () => clearTimeout(timer);
  }, []);

  const handleRedeem = async (e) => {
    e.preventDefault();
    const sessionData = sessionStorage.getItem('userData');
    if (!sessionData) {
      setNotif({ msg: "Silakan login terlebih dahulu.", id: Date.now() });
      return;
    }
    const user = JSON.parse(sessionData);

    try {
      const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: inputCode })
      });
      const result = await response.json();

      if (result.success) {
        addPoints(result.newPoints - user.points); // Update context UI
        
        // Update session storage
        user.points = result.newPoints;
        sessionStorage.setItem('userData', JSON.stringify(user));

        setNotif({ msg: result.message, id: Date.now() });
        setTimeout(() => navigate("/point"), 2000);
      } else {
        setNotif({ msg: result.message, id: Date.now() });
      }
    } catch (error) {
      setNotif({ msg: "Gagal terhubung ke server.", id: Date.now() });
    }
  };

  return (
    <>
      <main className="redeem-section">
        {/* Tampilkan notifikasi jika state notif terisi */}
        {notif && <Notification key={notif.id} msg={notif.msg} />}

        <div className="container text-center">
          <h1 className="h2 mb-4 text-light">Redeem Code</h1>

          <div className="redeem-box">
            <div className="redeem-icon mb-3">
              <i className="bi bi-ticket-perforated"></i>
            </div>

            <p className="mb-3 fs-5">Enter your voucher code</p>

            <form onSubmit={handleRedeem}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <p className="privacy-text mb-3">
                By clicking "Redeem Code", you agree to our
                <a href="#"> Privacy Policy</a>.
              </p>

              <button
                type="submit"
                className="btn btn-primary voucher-btn-redeem w-100"
              >
                Redeem Code
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
};

export default Voucher;
