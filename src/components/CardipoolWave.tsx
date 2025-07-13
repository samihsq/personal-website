import React from "react";

const CardipoolWave: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1440 490"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
      pointerEvents: "none",
    }}
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="cardipool-gradient"
        x1="0%"
        y1="50%"
        x2="100%"
        y2="50%"
      >
        <stop offset="5%" stopColor="#35708a" />
        <stop offset="95%" stopColor="#6bb3d6" />
      </linearGradient>
    </defs>
    <path
      d="M 0,500 L 0,93 C 119,75.96428571428572 238,58.92857142857143 371,67 C 504,75.07142857142857 650.9999999999999,108.25000000000001 774,116 C 897.0000000000001,123.74999999999999 996,106.07142857142857 1103,98 C 1210,89.92857142857143 1325,91.46428571428572 1440,93 L 1440,500 L 0,500 Z"
      stroke="none"
      fill="url(#cardipool-gradient)"
      fillOpacity="0.25"
    />
    <path
      d="M 0,500 L 0,218 C 85.57142857142858,216.14285714285714 171.14285714285717,214.28571428571428 296,209 C 420.85714285714283,203.71428571428572 585,195.00000000000003 723,194 C 861,192.99999999999997 972.8571428571429,199.7142857142857 1088,205 C 1203.142857142857,210.2857142857143 1321.5714285714284,214.14285714285717 1440,218 L 1440,500 L 0,500 Z"
      stroke="none"
      fill="url(#cardipool-gradient)"
      fillOpacity="0.35"
    />
    <path
      d="M 0,500 L 0,343 C 106.46428571428572,340.3928571428571 212.92857142857144,337.7857142857143 346,327 C 479.07142857142856,316.2142857142857 638.7500000000001,297.25 760,313 C 881.2499999999999,328.75 964.0714285714284,379.2142857142857 1071,390 C 1177.9285714285716,400.7857142857143 1308.9642857142858,371.8928571428571 1440,343 L 1440,500 L 0,500 Z"
      stroke="none"
      fill="url(#cardipool-gradient)"
      fillOpacity="0.7"
    />
  </svg>
);

export default CardipoolWave;
