import React from 'react';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container">
        <h1>AI for Sustainable Future</h1>
        <p>
          Eksplorasi konsep fisika di balik energi terbarukan seperti turbin angin dan panel surya. 
          Mendukung pencapaian SDG 4 (Pendidikan Berkualitas) & SDG 7 (Energi Bersih dan Terjangkau).
        </p>
        <button className="btn-primary" onClick={() => window.scrollTo({ top: document.querySelector('.main-content').offsetTop, behavior: 'smooth' })}>
          Mulai Eksplorasi AR
        </button>
      </div>
    </section>
  );
};

export default Hero;
