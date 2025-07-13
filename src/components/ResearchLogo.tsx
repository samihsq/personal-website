import React from "react";
import "./ResearchLogo.css";

const ResearchLogo: React.FC = () => {
  return (
    <div className="research-logo">
      <span className="text-left">rese</span>
      <span className="search-icon-container">
        <span className="material-icons search-icon">search</span>
      </span>
      <span className="text-right">rch</span>
    </div>
  );
};

export default ResearchLogo;
