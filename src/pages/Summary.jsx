import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/Summary.css';

const Summary = () => {
  const location = useLocation();
  // Mengambil data yang dikirim dari Pembayaran.jsx
  const data = location.state || JSON.parse(sessionStorage.getItem('lastTransaction') || '{}');

  return (
    <>
      <header className="success-header w-50 mx-auto">
        <div className="container text-center">
          <i className="bi bi-check-circle-fill success-icon"></i>
          <h1 className="mt-3">Pembayaran Berhasil</h1>
          <p className="lead">Terima kasih, transaksi Anda telah selesai.</p>
        </div>
      </header>

      <main className="receipt-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-7 col-md-9 mx-auto">

              <div className="receipt-card">
                <div className="receipt-card-header">
                  Rincian Tagihan
                </div>

                <div className="receipt-card-body">

                  <h6 className="receipt-subtitle">DETAIL PEMBELIAN</h6>
                  <ul className="list-group list-group-flush receipt-details">
                    <li className="list-group-item">
                      <span>Item:</span>
                      <strong>{data.itemName || "-"}</strong>
                    </li>
                    <li className="list-group-item">
                      <span>Nickname:</span>
                      <strong>{data.nickname || "User"}</strong>
                    </li>
                    <li className="list-group-item">
                      <span>ID:</span>
                      <strong>{data.accountId || "-"}({data.zoneId || "-"})</strong>
                    </li>
                  </ul>

                  <h6 className="receipt-subtitle mt-4">DETAIL PEMBAYARAN</h6>
                  <ul className="list-group list-group-flush receipt-details">
                    <li className="list-group-item">
                      <span>Waktu Transaksi:</span>
                      <strong>{data.waktu || "-"}</strong>
                    </li>
                    <li className="list-group-item">
                      <span>ID Transaksi:</span>
                      <strong>{data.invoiceId || "-"}</strong>
                    </li>
                    <li className="list-group-item">
                      <span>Metode:</span>
                      <strong>{data.paymentMethod || "-"}</strong>
                    </li>

                    {/* Menampilkan baris diskon hanya jika ada poin yang digunakan */}
                    {data.discountPoints > 0 && (
                      <li className="list-group-item bg-transparent text-success d-flex justify-content-between border-secondary">
                        <span>Potongan Poin:</span>
                        <strong>- Rp. {data.discountPoints.toLocaleString('id-ID')}</strong>
                      </li>
                    )}

                    <li className="list-group-item payment-total">
                      <span>Total:</span>
                      <strong className="fs-5 text-warning">Rp. {data.totalPaid?.toLocaleString('id-ID') || "0"}</strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center mt-4">
                <Link to="/" className="btn btn-outline-info">
                  <i className="bi bi-arrow-left-short"></i>  Kembali ke Home
                </Link>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Summary;