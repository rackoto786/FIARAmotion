import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    value?: string; // base64 string or URL
    onChange: (base64: string) => void;
    label?: string;
    className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    label = "Image",
    className = ""
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | undefined>(value);
    const [error, setError] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError("Veuillez sélectionner une image valide");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("L'image ne doit pas dépasser 5MB");
            return;
        }

        setError("");

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPreview(base64String);
            onChange(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleRemove = () => {
        setPreview(undefined);
        onChange("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <Label>{label}</Label>}

            <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="relative">
                    {preview ? (
                        <div className="relative group">
                            <img
                                src={preview}
                                alt="Aperçu"
                                className="h-32 w-32 object-cover rounded-lg border-2 border-border"
                            />
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="h-32 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Upload button */}
                <div className="flex-1 space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClick}
                        className="w-full"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {preview ? "Changer l'image" : "Télécharger une image"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG ou GIF (max. 5MB)
                    </p>
                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
