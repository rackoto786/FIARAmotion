import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, User, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import ceresLogo from '@/assets/ceres-logo.png';

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
                navigate('/dashboard');
            } else {
                setError(result.error || "Erreur lors de l'inscription");
            }
        } catch (err) {
            setError("Une erreur est survenue.");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="w-full max-w-5xl h-[650px] bg-white/90 backdrop-blur-sm rounded-[30px] shadow-2xl flex overflow-hidden">

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
                        <h2 className="text-4xl font-bold mb-4">Rejoignez-nous</h2>
                        <p className="text-lg opacity-80">Créez votre compte et commencez à gérer votre flotte efficacement.</p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white/95 relative overflow-y-auto">
                    <div className="max-w-md w-full mx-auto space-y-8">

                        {/* Header with Logo */}
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <img src={ceresLogo} alt="CERES Logo" className="h-20 w-auto object-contain" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Inscription</h1>
                                <p className="text-gray-500 text-sm mt-2">
                                    Remplissez les informations ci-dessous pour créer votre compte.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-50 border-destructive/20 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <FloatingLabelInput
                                    label="Nom complet"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    icon={<User size={18} />}
                                />

                                <FloatingLabelInput
                                    label="Matricule (ex: PCR004938)"
                                    value={formData.matricule}
                                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                                    icon={<ShieldCheck size={18} />}
                                />

                                <FloatingLabelInput
                                    label="Adresse Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    icon={<Mail size={18} />}
                                />

                                <FloatingLabelInput
                                    label="Mot de passe"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    icon={<Lock size={18} />}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-full bg-[#43B02A] hover:bg-[#358f22] text-white font-bold text-md shadow-lg shadow-[#43B02A]/30 transition-all hover:scale-[1.02] active:scale-95 mt-6"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    "Créer mon compte"
                                )}
                            </Button>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-500">
                                    Déjà un compte ?{' '}
                                    <Link to="/login" className="text-[#43B02A] font-bold hover:underline">
                                        Se connecter
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

export default Register;
