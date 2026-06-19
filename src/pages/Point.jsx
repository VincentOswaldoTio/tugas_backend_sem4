import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { PointContext } from "../components/PointContext";
import { api } from '../utils/api.js';
import '../styles/Point.css';

const Point = () => {
  const { points } = useContext(PointContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tierConfig, setTierConfig] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get('/api/leaderboard');
        const result = await response.json();
        if (result.success) {
          setLeaderboard(result.data);
        } else {
          setError(result.message || 'Gagal memuat leaderboard');
        }

        const userData = sessionStorage.getItem('userData');
        if (userData) {
          try {
            const { id: userId } = JSON.parse(userData);
            if (userId) {
              api.get(`/api/points/config/${userId}`)
                .then(r => r.json())
                .then(result => { if (result.success) setTierConfig(result.data); })
                .catch(() => {});
            }
          } catch {}
        }
      } catch (err) {
        setError('Terjadi kesalahan. Pastikan backend berjalan.');
        console.error('Leaderboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const renderLeaderboardItem = (entry) => {
    const rowClass = entry.rank === 1 ? 'rank-top-1' : entry.rank === 2 ? 'rank-top-2' : entry.rank === 3 ? 'rank-top-3' : '';

    const trophyIcon = entry.rank === 1 ? (
      <i className="bi bi-trophy-fill text-warning me-2"></i>
    ) : entry.rank === 2 ? (
      <i className="bi bi-trophy-fill text-secondary me-2"></i>
    ) : entry.rank === 3 ? (
      <i className="bi bi-trophy-fill text-bronze me-2"></i>
    ) : null;

    const rankClass = entry.rank <= 3 ? `rank-badge rank-${entry.rank}` : 'rank-badge';

    return (
      <li key={entry.rank} className={`list-group-item d-flex justify-content-between align-items-center ${rowClass}`}>
        <div>
          <span className={rankClass}>{entry.rank}</span>
          {trophyIcon}
          <strong>{entry.username}</strong>
        </div>
        <span className="text-muted fw-500 pe-2">
          {entry.totalSpent.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
        </span>
      </li>
    );
  };

  return (
    <>
      <main className="points-section">
        <div className="container">
          <div className="row">

            <div className="col-lg-5 mb-4 mb-lg-0">
              <div className="points-card">
                <h4><i className="bi bi-gem"></i> Poin RAST-7 Saya</h4>
                <div className="points-display">
                  {points.toLocaleString('id-ID')}
                </div>
                {tierConfig && (
                  <div className="tier-badge-row">
                    <span className={`tier-badge tier-${tierConfig.tierName.toLowerCase()}`}>
                      {tierConfig.tierName.toUpperCase()}
                    </span>
                    <span className="tier-rate">Reward rate: {(tierConfig.rewardRate * 100).toFixed(1)}%</span>
                  </div>
                )}
                <p>
                  Gunakan poin Anda untuk mendapatkan diskon pada saat topup.
                </p>
                <div className="mt-4">
                  <Link to="/voucher" className="voucher-link"> Klik di sini untuk redeem lebih banyak poin <i className="bi bi-arrow-right-short"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="leaderboard-card">
                <h4><i className="bi bi-bar-chart-line-fill"></i> Top Spender (30 Hari Terakhir)</h4>

                {isLoading ? (
                  <p className="text-center text-muted p-4">Memuat leaderboard...</p>
                ) : error ? (
                  <p className="text-center text-danger p-4">{error}</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-center text-muted p-4">Belum ada data transaksi dalam 30 hari terakhir.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {leaderboard.map(renderLeaderboardItem)}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
};

export default Point;