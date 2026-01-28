import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import ceresLogo from '@/assets/ceres-logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!matricule || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    const result = await login(matricule, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Identifiants invalides');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="w-full max-w-5xl h-[600px] bg-white/90 backdrop-blur-sm rounded-[30px] shadow-2xl flex overflow-hidden">

        {/* Left Side - Abstract Design */}
        <div className="hidden lg:flex flex-[1.1] relative bg-[#0f0c29] overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#240b36] via-[#c31432] to-[#240b36] opacity-80" />

          {/* Abstract Shapes/Blobs */}
          <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-pink-600 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-50px] left-[20%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

          {/* Glass Overlay for depth */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />

          <div className="relative z-10 flex flex-col justify-center items-center h-full p-10 text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Bienvenue</h2>
            <p className="text-lg opacity-80">Connectez-vous pour accéder à votre espace de gestion.</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col justify-center px-12 py-12 bg-white/95 relative">
          <div className="max-w-md w-full mx-auto space-y-8">

            {/* Header with Logo */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={ceresLogo} alt="CERES Logo" className="h-24 w-auto object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Compte Agent</h1>
                <p className="text-gray-500 text-sm mt-2">
                  Veuillez entrer vos identifiants pour continuer.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <FloatingLabelInput
                  label="Matricule"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  icon={<Mail size={18} />}
                />

                <div className="relative">
                  <FloatingLabelInput
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock size={18} />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-3 text-gray-400 hover:text-[#43B02A] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-medium text-gray-500 hover:text-[#43B02A] transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-[#43B02A] hover:bg-[#358f22] text-white font-bold text-md shadow-lg shadow-[#43B02A]/30 transition-all hover:scale-[1.02] active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                Se connecter
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-[#43B02A] font-bold hover:underline">
                    Créer un compte
                  </Link>
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
