import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import carImage from '@/assets/navara-car.png';
import ceresLogo from '@/assets/ceres-logo.png';
import promesLogo from '@/assets/promes-logo.png';
import { User, Lock, CreditCard, Mail } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    matricule: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.matricule || !formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      const result = await register(formData.name, formData.matricule, formData.email, formData.password);
      if (result.success) {
        navigate('/pending-approval');
      } else {
        setError(result.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      setError("Une erreur est survenue.");
    }
  };

  return (
    <div className="green-login-root">
      {/* Top Logos */}
      <div className="top-logos">
        <div className="logo-card">
          <img src={ceresLogo} alt="Programme CERES" className="ceres-logo" />
        </div>
        <div className="logo-card promes-logo-card">
          <img src={promesLogo} alt="Association PROMES" className="promes-logo-img" />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="green-content-wrapper">
        {/* Left Section - Welcome */}
        <div className="welcome-section">
          <h1 className="welcome-title">Bienvenue sur FIARAmotion</h1>
          <p className="welcome-subtitle">
            <em>L'application dédiée à la gestion de votre parc roulant.</em>
          </p>

          <div className="welcome-description">
            <p>Créez votre compte pour <strong>commencer à gérer vos véhicules et motos</strong></p>
          </div>

          <button className="learn-more-button" onClick={() => navigate('/login')}>
            Déjà membre ? Se connecter
          </button>

          {/* Carousel Dots */}
          <div className="carousel-dots">
            <span className="carousel-dot"></span>
            <span className="carousel-dot active"></span>
            <span className="carousel-dot"></span>
            <span className="carousel-dot"></span>
            <span className="carousel-dot"></span>
          </div>

          {/* Footer */}
          <div className="creator-footer">
            Créé par narindra807@gmail.com
          </div>
        </div>

        {/* Right Section - Register Card */}
        <div className="login-card-container">
          <div className="pink-login-card register-card">
            <h2 className="login-card-title">Inscription</h2>

            {error && (
              <div className="login-error-alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-card-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Nom complet"
                  className="pink-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <User className="input-icon-lucide" />
              </div>

              <div className="input-group">
                <input
                  type="text"
                  placeholder="Matricule"
                  className="pink-input"
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                />
                <CreditCard className="input-icon-lucide" />
              </div>

              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  className="pink-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Mail className="input-icon-lucide" />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="pink-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Lock className="input-icon-lucide" />
              </div>

              <button
                type="submit"
                className="pink-login-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Inscription...' : 'Créer mon compte'}
              </button>
            </form>

            <div className="login-footer-links">
              <Link to="/login" className="footer-link center-link">
                Vous avez déjà un compte ? Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Car Background Image */}
      <div className="car-background">
        <img src={carImage} alt="Navara" className="car-image" />
      </div>

      <style>{`
        .green-login-root {
          min-height: 100vh;
          background-color: #f0f0f0;
          background-image: url(${carImage});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          position: relative;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
        }

        /* Dark overlay for better contrast */
        .green-login-root::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 1;
        }

        /* Top Logos */
        .top-logos {
          position: absolute;
          top: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          padding: 0 40px;
          z-index: 100;
        }

        .logo-card {
          background: white;
          border-radius: 16px;
          padding: 15px 25px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .ceres-logo {
          height: 60px;
          object-fit: contain;
        }

        .promes-logo-card {
           padding: 10px 20px;
        }

        .promes-logo-img {
          height: 60px;
          object-fit: contain;
        }

        /* Main Content */
        .green-content-wrapper {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 120px 60px 60px;
          gap: 60px;
        }

        /* Welcome Section */
        .welcome-section {
          flex: 1;
          max-width: 500px;
          color: #fff;
          position: relative;
          z-index: 10;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .welcome-title {
          font-size: 42px;
          font-weight: bold;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .welcome-subtitle {
          font-size: 18px;
          font-style: italic;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .welcome-description {
          margin-bottom: 40px;
        }

        .welcome-description p {
          font-size: 16px;
          line-height: 1.6;
        }

        .learn-more-button {
          background: white;
          color: #43B02A;
          border: 2px solid white;
          padding: 12px 32px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 40px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .learn-more-button:hover {
          background: #43B02A;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        .carousel-dots {
          display: flex;
          gap: 10px;
          margin-bottom: 80px;
        }

        .carousel-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .carousel-dot.active {
          background: white;
          width: 14px;
          height: 14px;
        }

        .creator-footer {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        /* Register Card with Neon Cyberpunk Design */
        .login-card-container {
          flex: 0 0 auto;
          position: relative;
          z-index: 10;
        }

        .pink-login-card {
          background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 24px;
          padding: 50px 45px;
          width: 380px;
          position: relative;
          overflow: hidden;
        }

        /* Gradient border effect */
        .pink-login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 24px;
          padding: 3px;
          background: linear-gradient(135deg, #00f5ff 0%, #ff00ff 100%);
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* Accent borders on corners */
        .pink-login-card::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle at top right, rgba(0, 245, 255, 0.3) 0%, transparent 70%);
          border-radius: 24px;
          pointer-events: none;
        }

        .register-card {
          width: 420px;
          padding: 45px 40px;
        }

        .login-card-title {
          font-size: 36px;
          font-weight: 600;
          color: #00f5ff;
          text-align: left;
          margin-bottom: 35px;
          text-shadow: 
            0 0 10px rgba(0, 245, 255, 0.5),
            0 0 20px rgba(0, 245, 255, 0.3);
          position: relative;
          z-index: 1;
        }

        .login-error-alert {
          background: rgba(255, 0, 100, 0.1);
          border: 2px solid rgba(255, 0, 100, 0.5);
          color: #ff0064;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          text-align: center;
          font-weight: 600;
        }

        .login-card-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .input-group {
          position: relative;
        }

        .input-group label {
          display: block;
          color: #a0a0a0;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 400;
        }

        /* Modern Dark Input Fields */
        .pink-input {
          width: 100%;
          background: #3a3a3a;
          border: 1px solid #4a4a4a;
          border-radius: 12px;
          padding: 14px 40px 14px 16px;
          color: #ffffff;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
        }

        .pink-input::placeholder {
          color: #666;
        }

        .pink-input:focus {
          background: #444;
          border-color: #00f5ff;
          box-shadow: 0 0 8px rgba(0, 245, 255, 0.3);
        }

        .input-icon-lucide {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #00f5ff;
          opacity: 0.8;
          filter: drop-shadow(0 0 5px rgba(0, 245, 255, 0.4));
          pointer-events: none;
        }

        /* Neon Cyan Button with Glow */
        .pink-login-btn {
          background: linear-gradient(135deg, #00f5ff 0%, #00d4ff 100%);
          color: #000;
          border: none;
          padding: 16px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 12px;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 
            0 0 20px rgba(0, 245, 255, 0.5),
            0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .pink-login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #00d4ff 0%, #00f5ff 100%);
          transform: translateY(-2px);
          box-shadow: 
            0 0 30px rgba(0, 245, 255, 0.7),
            0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .pink-login-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 
            0 0 15px rgba(0, 245, 255, 0.4),
            0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .pink-login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-footer-links {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .footer-link {
          color: #a0a0a0;
          font-size: 13px;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .footer-link span {
          color: #ff00ff;
          font-weight: 600;
        }

        .footer-link:hover {
          color: #fff;
        }

        .footer-link:hover span {
          color: #ff66ff;
          text-decoration: underline;
        }

        .center-link {
          text-align: center;
        }

        /* Car Background - Hidden since we use it as main background */
        .car-background {
          display: none;
        }

        .car-image {
          display: none;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .green-content-wrapper {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 140px 40px 60px;
          }

          .welcome-section {
            max-width: 600px;
          }

          .learn-more-button {
            align-self: center;
          }

          .carousel-dots {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .top-logos {
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .pink-login-card {
            width: 100%;
            max-width: 420px;
            padding: 40px 30px;
          }

          .welcome-title {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;
