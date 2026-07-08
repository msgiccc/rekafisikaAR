import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p>
          &copy; {new Date().getFullYear()} RekaFisika AR. Proyek prototipe untuk kompetisi inovasi nasional BRIN AIDeaNation. 
          Tema: AI for Sustainable Future.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
