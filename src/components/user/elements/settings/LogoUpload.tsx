import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Image, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { showToast } from "../../../../lib/toast";
import { Button } from "../../../ui/button";
import { updateUserSettings } from "../../../../services/userSettings";

interface LogoUploadProps {
  currentLogo?: string | null;
  onLogoChange: (logoUrl: string | null) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ currentLogo, onLogoChange }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogo || null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(!!currentLogo);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|svg\+xml|gif)/)) {
        setError("Only JPG, PNG, SVG, and GIF files are allowed");
        showToast("Only JPG, PNG, SVG, and GIF files are allowed", "error");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB");
        showToast("File size must be less than 2MB", "error");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Always use the same filename pattern for each user to ensure only one logo per user
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-logo.${fileExt}`;
        const filePath = `user-logos/${fileName}`;

        // Delete any existing logo files for this user
        if (currentLogo) {
          try {
            // Extract the path from the URL
            const urlParts = currentLogo.split("/");
            const bucketIndex = urlParts.indexOf("logos");

            if (bucketIndex !== -1) {
              const storagePath = urlParts.slice(bucketIndex + 1).join("/");
              await supabase.storage.from("logos").remove([storagePath]);
            }
          } catch (deleteErr) {
            console.warn("Failed to delete previous logo:", deleteErr);
            // Continue with upload even if delete fails
          }
        }

        // Upload the file
        const { error: uploadError } = await supabase.storage.from("logos").upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

        if (uploadError) throw uploadError;

        // Get the public URL
        const {
          data: { publicUrl },
        } = await supabase.storage.from("logos").getPublicUrl(filePath);

        // Update preview
        // Add a cache-busting parameter to the URL to prevent browser caching
        const cacheBustUrl = `${publicUrl}?t=${Date.now()}`;
        setPreviewUrl(cacheBustUrl);

        // Update user metadata with logo URL
        await updateUserSettings({ logo_url: publicUrl });

        // Notify parent component
        onLogoChange(publicUrl);

        showToast("Logo uploaded successfully", "success");
      } catch (err) {
        console.error("Error uploading logo:", err);
        setError(err instanceof Error ? err.message : "Failed to upload logo");
        showToast("Failed to upload logo", "error");
      } finally {
        setUploading(false);
      }
    },
    [onLogoChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/svg+xml": [".svg"],
      "image/gif": [".gif"],
    },
    maxFiles: 1,
    disabled: uploading || !!previewUrl, // Disable dropzone if there's already a logo
  });

  const handleRemoveLogo = async () => {
    if (!currentLogo) return;

    try {
      setUploading(true);

      // Extract the path from the URL to delete the file
      const urlParts = currentLogo.split("/");
      const bucketIndex = urlParts.indexOf("logos");

      if (bucketIndex !== -1) {
        const storagePath = urlParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("logos").remove([storagePath]);
      }

      // Update user metadata to remove logo URL
      await updateUserSettings({ logo_url: null });

      // Clear preview
      setPreviewUrl(null);

      // Notify parent component
      onLogoChange(null);

      showToast("Logo removed successfully", "success");
    } catch (err) {
      console.error("Error removing logo:", err);
      showToast("Failed to remove logo", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative border border-input rounded-md p-4 flex flex-col items-center">
          <div className="relative w-48 h-48 flex items-center justify-center bg-muted/20">
            {loadingPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <img
              src={previewUrl}
              alt="Company Logo"
              className="max-w-full max-h-full object-contain"
              onLoad={() => setLoadingPreview(false)}
              onError={(e) => {
                // If image fails to load, show error
                setError("Failed to load image");
                setPreviewUrl(null);
                setLoadingPreview(false);
              }}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="destructive" size="sm" onClick={handleRemoveLogo} disabled={uploading}>
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-input"
          } ${uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"}`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-2">
            <Image className="h-10 w-10 text-muted-foreground mb-2" />

            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading logo...</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Drag & drop your logo here</p>
                <p className="text-xs text-muted-foreground">Supports JPG, PNG, SVG, GIF (max 2MB)</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive">{error}</div>}
    </div>
  );
};

export default LogoUpload;
