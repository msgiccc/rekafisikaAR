import React from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ARViewer from './components/ARViewer';
import AITutor from './components/AITutor';
import Footer from './components/Footer';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <Hero />
      <main className="container main-content">
        <div className="layout-col-left">
          <ARViewer />
        </div>
        <div className="layout-col-right">
          <AITutor />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
