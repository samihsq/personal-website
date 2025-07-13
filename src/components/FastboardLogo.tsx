import React from "react";

const FastboardLogo = () => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          marginRight: 2,
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            height: "2px",
            width: "12px",
            marginBottom: "4px",
            borderRadius: "1px",
          }}
        ></div>
        <div
          style={{
            backgroundColor: "#ffffff",
            height: "2px",
            width: "16px",
            marginBottom: "4px",
            borderRadius: "1px",
          }}
        ></div>
        <div
          style={{
            backgroundColor: "#ffffff",
            height: "2px",
            width: "20px",
            marginBottom: "0px",
            borderRadius: "1px",
          }}
        ></div>
      </div>
      <span style={{ fontSize: "1.2rem", fontWeight: "bold", marginLeft: 0 }}>
        fastboard
      </span>
    </div>
  );
};

export default FastboardLogo;
