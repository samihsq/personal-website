import React from "react";
import "./CardipoolLogo.css";

const CardipoolLogo: React.FC = () => {
  return (
    <div className="title-container">
      <div className="main-title">
        <img
          src="/images/cardipool.png"
          alt="Cardipool Logo"
          className="logo"
        />
        <h1 className="eco-title">cardipool</h1>
      </div>
    </div>
  );
};

export default CardipoolLogo;
