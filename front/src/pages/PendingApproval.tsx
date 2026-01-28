import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingApproval: React.FC = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // If user is active (approved), redirect to dashboard
    useEffect(() => {
        if (user && user.status === 'active') {
            navigate('/');
        }
    }, [user, navigate]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center border-yellow-500/50 bg-yellow-500/5">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
                            <ShieldAlert className="h-10 w-10" />
                        </div>
                    </div>
                    <CardTitle className="text-xl">En attente d'approbation</CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Félicitations, vous êtes bien inscrit !
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground">
                        Votre compte a été créé avec succès, mais vous devez attendre l'approbation de l'administrateur pour pouvoir utiliser le système de gestion de flotte.
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                        Une notification a été envoyée à l'administrateur.
                    </p>
                    <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
                        <LogOut className="h-4 w-4" />
                        Retour à la connexion
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default PendingApproval;
