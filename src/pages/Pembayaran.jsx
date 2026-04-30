import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PointContext } from '../components/PointContext';
import { TransactionContext } from '../components/TransactionContext';
import '../styles/Pembayaran.css';

const Pembayaran = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { userID, zoneID, diamond, payment, gameName, itemDisplayName } = location.state || {};

  // Ambil data user dari session
  const sessionUser = (() => {
    try {
      const sessionData = sessionStorage.getItem('userData');
      return sessionData ? JSON.parse(sessionData) : null;
    } catch { return null; }
  })();

  // Ambil poin dan fungsi addPoints dari Context
  const { points, addPoints, fetchPointsFromDB } = useContext(PointContext);

  // AMBIL fungsi addTransaction dari context
  const { addTransaction } = useContext(TransactionContext);

  // State untuk menentukan apakah user mau pakai poin atau tidak
  const [usePoints, setUsePoints] = useState(false);

  // Kalkulasi Harga
  const hargaAwal = diamond?.price || 0;
  const pajak = hargaAwal * 0.11;
  const totalSebelumDiskon = hargaAwal + pajak;

  // Logika Diskon: Gunakan semua poin yang ada (maksimal senilai harga total)
  const nilaiDiskon = usePoints ? Math.min(points, totalSebelumDiskon) : 0;
  const totalAkhir = totalSebelumDiskon - nilaiDiskon;

  const handlePayment = async () => {
    // Ambil data user dari session
    const sessionData = sessionStorage.getItem('userData');
    if (!sessionData) {
      alert("Sesi telah habis, silakan login kembali.");
      navigate('/login');
      return;
    }
    const loggedInUser = JSON.parse(sessionData);

    const reqBody = {
      userId: loggedInUser.id,
      targetAccount: {
        accountId: userID,
        zoneId: zoneID || null
      },
      purchaseDetails: {
        gameName: gameName || "Unknown Game",
        itemName: `${diamond?.qty || "0"} ${itemDisplayName || "Items"}`,
        itemQty: diamond?.qty || 0,
        paymentMethod: payment?.name || "Unknown"
      },
      billing: {
        basePrice: hargaAwal,
        taxAmount: pajak,
        pointsUsed: usePoints ? nilaiDiskon : 0,
        totalPaid: totalAkhir
      }
    };

    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const result = await response.json();

      if (result.success) {
        // Refresh poin dari database (backend sudah handle update)
        await fetchPointsFromDB(loggedInUser.id);

        // Simpan data transaksi ke sessionStorage untuk fallback
        sessionStorage.setItem('lastTransaction', JSON.stringify({
          ...result.data,
          nickname: sessionUser?.username || "User"
        }));

        // Lempar data ke halaman Summary
        navigate('/summary', {
          state: {
            ...result.data,
            nickname: sessionUser?.username || "User"
          }
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Terjadi kesalahan koneksi saat memproses pembayaran.");
    }
  };

  return (
    <main className="payment-confirmation-section">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-7 col-md-9 mx-auto">
            <div className="payment-card">
              <div className="payment-card-header">
                <h5 className="mb-0">Detail Pesanan</h5>
              </div>
              <div className="payment-card-body">
                <p className="text-muted small">Mohon konfirmasi detail pesanan anda sudah benar.</p>

                <div className="item-box">
                  <div className="item-icon">
                    <i className="bi bi-gem"></i>
                  </div>
                  <div className="item-details">
                    {/* <h5>28 Diamonds</h5> */}
                    <h5>{diamond?.qty || "0"} {itemDisplayName || "Items"}</h5>
                    <span>({diamond?.qty || "0"} + 3 Bonus)</span>
                  </div>
                </div>

                <ul className="list-group list-group-flush payment-details my-3">
                  <li className="list-group-item">
                    <span>Nickname:</span>
                    <strong>{sessionUser?.username || "User"}</strong>
                  </li>
                  <li className="list-group-item">
                    <span>ID:</span>
                    <strong>{userID || "-"}({zoneID || "-"})</strong>
                  </li>
                  <li className="list-group-item">
                    <span>Bayar dengan:</span>
                    <strong>{payment?.name || "-"}</strong>
                  </li>
                </ul>

                {/* Rincian Biaya */}
                <ul className="list-group list-group-flush payment-details">
                  <li className="list-group-item">
                    <span>Harga:</span>
                    <strong>Rp. {hargaAwal.toLocaleString('id-ID')}</strong>
                  </li>
                  <li className="list-group-item">
                    <span>Pajak (11%):</span>
                    <strong>Rp. {pajak.toLocaleString('id-ID')}</strong>
                  </li>

                  {/* Tampilan Diskon jika dipilih */}
                  {usePoints && (
                    <li className="list-group-item text-success">
                      <span>Diskon Poin RAST-7:</span>
                      <strong>- Rp. {nilaiDiskon.toLocaleString('id-ID')}</strong>
                    </li>
                  )}
                </ul>

                {/* --- FITUR POTONG POIN --- */}
                <div className="card bg-dark border-secondary my-3 p-3">
                  <div className="form-check d-flex justify-content-between align-items-center">
                    <div>
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="checkPoin" 
                        checked={usePoints}
                        onChange={() => setUsePoints(!usePoints)}
                        disabled={points <= 0}
                      />
                      <label className="form-check-label text-white ms-2" htmlFor="checkPoin">
                        Gunakan Poin RAST-7
                      </label>
                      <div className="small text-muted ms-4">Tersedia: {points.toLocaleString('id-ID')} Poin</div>
                    </div>
                    {usePoints && <span className="badge bg-primary">Hemat Rp. {nilaiDiskon.toLocaleString('id-ID')}</span>}
                  </div>
                </div>

                <div className="rewards-box">
                  <i className="bi bi-coin"></i>
                  Anda akan mendapatkan Rewards senilai Rp. {Math.floor(totalSebelumDiskon * 0.01).toLocaleString('id-ID')}
                </div>

                <div className="total-payment">
                  <span>Total pembayaran</span>
                  <h2>Rp. {totalAkhir.toLocaleString('id-ID')}</h2>
                </div>
              </div>
              <div className="payment-card-footer">
                <button onClick={handlePayment} className="btn payment-btn-redeem w-100">
                  Konfirm & Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Pembayaran;