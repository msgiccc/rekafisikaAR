import React from 'react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <div className="logo">
          <span>🌱</span> RekaFisika AR
        </div>
        <div className="badge">BRIN AIDeaNation 2026</div>
        <div className="nav-links">
          <a href="#">Beranda</a>
          <a href="#">Materi AR</a>
          <a href="#">AI Tutor</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
