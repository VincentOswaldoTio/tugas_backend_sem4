import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Roblox.css";
import Notification from "../components/Notification";
import { mapGameItems, mapPaymentMethods } from "../utils/dataMapping";

// listDiamond will be fetched from API

const DiamondCard = ({ qty, price, disc, discPrice, index, activeIndex, setActiveDiamondIndex }) => {
  return (
    <>
      <div className="col p-2">
          <div className={`game-card card ${index === activeIndex ? 'active' : ''}`} onClick={() => setActiveDiamondIndex(index === activeIndex ? null : index)}>
            <p>{qty} Robux</p>
            <div className="game-img-container">
              <img src="/asset/logo_game/robux.png" alt="" />
            </div>
            <div className="game-card-bottom">
              <p>Dari</p>
              <p className="game-harga">Rp. {discPrice}</p>
              <div className="game-diskon">
                <span className="game-persen">{disc}%</span>
                <span className="game-af-diskon">Rp. {price}</span>
              </div>
            </div>
          </div>
      </div>
    </>
  );
};

// listPayment will be fetched from API

const PaymentCard = ({name, imgSrc, index, activeIndex, setActivePaymentIndex}) => {
  return (
    <>
      <div className="col p-2">
          <div className={`game-card card ${index === activeIndex ? 'active' : ''}`} onClick={() => setActivePaymentIndex(index === activeIndex ? null : index)}>
            <div className="game-pay-img">
              <img src={imgSrc} alt="" />
            </div>
            <p>{name}</p>
          </div>
      </div>
    </>
  );
};

const Roblox = () => {
  const navigate = useNavigate()
  const [userID, setUserID] = useState("")
  const [zoneID, setZoneID] = useState("")

  const [activeDiamondIndex, setActiveDiamondIndex] = useState(null);
  const [activePaymentIndex, setActivePaymentIndex] = useState(null);

  const [notification,setNotification] = useState(null)

  const [listDiamond, setListDiamond] = useState([]);
  const [listPayment, setListPayment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const gameResponse = await fetch('/api/games/roblox');
        const gameResult = await gameResponse.json();

        if (gameResult.success) {
          const mappedItems = mapGameItems(gameResult.data.items);
          setListDiamond(mappedItems);
        } else {
          throw new Error(gameResult.message || "Gagal mengambil data game");
        }

        const paymentResponse = await fetch('/api/payment-methods');
        const paymentResult = await paymentResponse.json();

        if (paymentResult.success) {
          const mappedPayments = mapPaymentMethods(paymentResult.data);
          setListPayment(mappedPayments);
        } else {
          throw new Error(paymentResult.message || "Gagal mengambil data payment");
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const data = {"userID" : userID || null,
                "zoneID" : zoneID || null,
                "diamond" : listDiamond[activeDiamondIndex] || null,
                "payment" :  listPayment[activePaymentIndex] || null,
                "gameName" : "Roblox",
                "itemDisplayName" : "Robux"}

  const handleClick = () => {
    if (userID === null || userID.trim() === "") {
      setNotification({msg : "Silahkan Masukan User ID", id : Date.now()})
      return
    }
    if (zoneID === null || zoneID.trim() === "") {
      setNotification({msg : "Silahkan Masukan Zone ID", id : Date.now()})
      return
    }
    if (activeDiamondIndex === null) {
      setNotification({msg : "Silahkan Pilih Jumlah Robux", id : Date.now()})
      return
    } 
    if (activePaymentIndex === null){
      setNotification({msg : "Silahkan Pilih Metode Pembayaran", id : Date.now()})
      return
    }

    setNotification({msg : "Melanjutkan ke Halaman Pembayaran...", id : Date.now()})

    const loading = setTimeout(()=>{
      navigate('/pembayaran', {state: data})
      clearTimeout(loading)
    }, 3000)




  }

  if (loading) {
    return (
      <main className="game-main">
        <div className="game-content">
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Memuat data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="game-main">
        <div className="game-content">
          <div className="alert alert-danger m-3" role="alert">
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="game-main">
      {notification && (<Notification key={notification.id} msg={notification.msg} />)}
      <div className="game-bg" style={{ backgroundImage: "url('/asset/logo_game/roblox_bg.png')", backgroundPosition : "50% calc(50% - 150px)",
                                         backgroundRepeat : "no-repeat"
      }}></div>
      <div className="game-content">
        {/* ======= INPUT ID ======== */}
        <div className="game-input-container game-id-section mt-5">
          <h2 className="game-title">Masukkan User ID</h2>
          <div className="game-input-id-content">
            <div className="game-input-group">
              <p>USER ID</p>
              <div className="game-input-wrapper">
                <span className="game-icon">👤</span>
                <input type="text" placeholder="Masukkan User ID" onChange={(e) => {setUserID(e.target.value)}}/>
              </div>
            </div>

            <div className="game-input-group">
              <p>ZONE ID</p>
              <div className="game-input-wrapper">
                <span className="game-icon">🌍</span>
                <input type="text" placeholder="Zone ID" maxLength="4" onChange={(e)=>{setZoneID(e.target.value)}}/>
                <span className="game-limit">4 DIGIT</span>
              </div>
            </div>
          </div>
        </div>
        {/* ======= INPUT ID END ======== */}

        {/* INPUT NOMINAL */}
        <div className="game-input-container game-nominal-section mt-5">
          <h2 className="game-title">Pilih Nominal Top Up</h2>

          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 game-list-diamond">
            {listDiamond.map((item, index) => (
              <DiamondCard
                key={index}
                index={index}
                qty={item.qty}
                price={item.price}
                disc={item.disc}
                discPrice={item.discPrice}
                activeIndex={activeDiamondIndex}
                setActiveDiamondIndex={setActiveDiamondIndex}
              />
            ))}
          </div>
        </div>

        <div className="game-input-container game-pay-section mt-5">
          <h2 className="game-title">Pilih Pembayaran</h2>
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 game-list-diamond">
            {listPayment.map((item, index) => (
              <PaymentCard 
                key={index} 
                name={item.name} 
                imgSrc={item.imgSrc} 
                index={index} 
                activeIndex={activePaymentIndex} 
                setActivePaymentIndex={setActivePaymentIndex}/>
              ))}

          </div>
        </div>
      </div>
      {/* INPUT NOMINAL END */}
      <button to="/pembayaran" onClick={handleClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
          <path d="M24-16C10.7-16 0-5.3 0 8S10.7 32 24 32l45.3 0c3.9 0 7.2 2.8 7.9 6.6l52.1 286.3c6.2 34.2 36 59.1 70.8 59.1L456 384c13.3 0 24-10.7 24-24s-10.7-24-24-24l-255.9 0c-11.6 0-21.5-8.3-23.6-19.7l-5.1-28.3 303.6 0c30.8 0 57.2-21.9 62.9-52.2L568.9 69.9C572.6 50.2 557.5 32 537.4 32l-412.7 0-.4-2c-4.8-26.6-28-46-55.1-46L24-16zM208 512a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm224 0a48 48 0 1 0 0-96 48 48 0 1 0 0 96z" />
        </svg>
        Beli Sekarang
      </button>
    </main>
  );
};

export default Roblox;
