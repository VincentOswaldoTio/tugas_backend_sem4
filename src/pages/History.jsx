import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import '../styles/History.css';

const History = () => {
  const [dbTransactions, setDbTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const sessionData = sessionStorage.getItem('userData');
      if (!sessionData) {
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(sessionData);
      try {
        const response = await api.get(`/api/history/${user.id}`);
        const result = await response.json();
        if (result.success) setDbTransactions(result.data);
      } catch (error) {
        console.error("Gagal menarik riwayat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredTransactions = dbTransactions.filter(trx => 
    trx.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <main className='history-main'>
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat riwayat...</p>
        </div>
      </main>
    );
  }

  return (
    <main className='history-main'>
      <div className="history-lacak">
        <h1>Lacak Pesanan Kamu dengan Nomor Invoice</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="history-input-wrap">
            <label htmlFor="invoice">Nomor Invoice</label>
            <input 
              id="invoice"
              type="text" 
              placeholder="Masukkan RAST7-XXXXXXXXX" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // Update pencarian saat mengetik
            />
          </div>  
        </form>
      </div>
      <section className="history-section">
        <h2>Riwayat Transaksi Terakhirmu</h2>
        <p>
          Informasi mencakup tanggal transaksi, kode invoice, layanan, harga, dan status keberhasilan.
        </p>
        <div className="history-table-container">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kode Transaksi</th>
                <th>Service Name</th>
                <th>Harga</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Mapping data transaksi dari Context */}
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((trx, index) => (
                  <tr key={index}>
                    <td>{trx.waktu}</td>
                    <td>{trx.invoiceId}</td>
                    <td>{trx.gameName} {trx.itemName}</td>
                    <td>Rp {trx.totalPaid?.toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`status-badge ${trx.status === 'SUCCESS' ? 'status-success' : 'status-failed'}`}>
                        {trx.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    Tidak ada transaksi yang sesuai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default History;