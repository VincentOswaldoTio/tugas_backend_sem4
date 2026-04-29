import React, { useState, useEffect } from 'react';
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
        const response = await fetch(`/api/history/${user.id}`);
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
          <button type="submit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376C296.3 401.1 253.9 416 208 416 93.1 416 0 322.9 0 208S93.1 0 208 0 416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
            </svg>
            Cari Transaksi
          </button>
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
                    <td><p className="stat-suc">Success</p></td>
                  </tr>
                ))
              ) : ""}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default History;