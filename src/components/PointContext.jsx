import React, { createContext, useState, useEffect } from 'react';

export const PointContext = createContext();

export const PointProvider = ({ children }) => {
  const [points, setPoints] = useState(0);

  // Fungsi khusus untuk menarik data dari Database
  const fetchPointsFromDB = async (userId) => {
    try {
      const response = await fetch(`/api/points/${userId}`);
      const result = await response.json();
      
      if (result.success) {
        // 1. Update UI dengan angka pasti dari database
        setPoints(result.points);
        
        // 2. Sinkronisasi data session storage agar selalu up-to-date
        const sessionData = sessionStorage.getItem('userData');
        if (sessionData) {
          const user = JSON.parse(sessionData);
          user.points = result.points;
          sessionStorage.setItem('userData', JSON.stringify(user));
        }
      }
    } catch (error) {
      console.error("Gagal menarik data poin dari database:", error);
    }
  };

  useEffect(() => {
    // 1. Saat web pertama kali dibuka/direfresh, cek apakah ada user login
    const sessionData = sessionStorage.getItem('userData');
    if (sessionData) {
      const user = JSON.parse(sessionData);
      if (user.id) {
        // Tarik poin dari MongoDB!
        fetchPointsFromDB(user.id);
      }
    }

    // 2. Dengarkan event jika ada perubahan data user (misal: habis login atau redeem)
    const handleUserDataUpdated = (e) => {
      if (e.detail && e.detail.id) {
        fetchPointsFromDB(e.detail.id);
      }
    };
    
    // 3. Dengarkan event login
    const handleUserLoggedIn = () => {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      if (user.id) fetchPointsFromDB(user.id);
    };

    // 4. Dengarkan event logout (reset poin ke 0)
    const handleUserLoggedOut = () => {
      setPoints(0);
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
    };
  }, []);

  // Fungsi addPoints tetap dipertahankan untuk mengupdate UI secara real-time 
  // sebelum melakukan fetch ulang (Optimistic UI)
  const addPoints = (amount) => {
    setPoints(prev => {
      const validAmount = isNaN(Number(amount)) ? 0 : Number(amount);
      return prev + validAmount;
    });
  };

  return (
    <PointContext.Provider value={{ points, addPoints, fetchPointsFromDB }}>
      {children}
    </PointContext.Provider>
  );
};