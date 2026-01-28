import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, UserRole, ROLE_LABELS } from '@/types';
import { userService } from '@/services/users';
import { toast } from 'sonner';

interface EditUserDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
    user,
    open,
    onOpenChange,
    onSuccess,
}) => {
    const [role, setRole] = useState<UserRole | ''>(user?.role || '');
    const [loading, setLoading] = useState(false);

    // Update local state when user prop changes
    React.useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !role) return;

        try {
            setLoading(true);
            await userService.updateRole(user.id, role);
            toast.success('Rôle mis à jour avec succès');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update role', error);
            toast.error('Erreur lors de la mise à jour du rôle');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modifier le rôle</DialogTitle>
                    <DialogDescription>
                        Modifier le rôle de l'utilisateur {user.name} ({user.email}).
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="role">Rôle</Label>
                        <Select
                            value={role}
                            onValueChange={(value) => setRole(value as UserRole)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
