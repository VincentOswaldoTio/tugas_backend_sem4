import React, { createContext, useState, useEffect } from 'react';

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState(() => {
    // Mengambil data dari sessionStorage agar tidak hilang saat refresh
    const savedTrx = sessionStorage.getItem("rastTransactions");
    return savedTrx ? JSON.parse(savedTrx) : [];
  });

  useEffect(() => {
    sessionStorage.setItem("rastTransactions", JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (newTrx) => {
    // Menambahkan transaksi baru ke posisi paling atas (indeks 0)
    setTransactions((prev) => [newTrx, ...prev]);
  };

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
};