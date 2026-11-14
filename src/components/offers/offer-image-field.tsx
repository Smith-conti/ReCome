"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type OfferImageFieldProps = {
  businessId: string;
  initialUrl: string | null;
  error?: string;
  onUploadingChange?: (uploading: boolean) => void;
};

/**
 * Sube la imagen directamente del navegador a Supabase Storage.
 *
 * La ruta siempre empieza con el id del comercio, que es lo que exigen las
 * políticas del bucket `offer-images`. Al terminar, el formulario envía la URL
 * pública como un campo oculto.
 */
export function OfferImageField({
  businessId,
  initialUrl,
  error,
  onUploadingChange,
}: OfferImageFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = localError ?? error;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    const extension = EXTENSIONS[file.type];
    if (!extension) {
      setLocalError("Usa una imagen JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BYTES) {
      setLocalError("La imagen no puede superar 5 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const supabase = createClient();
      const path = `${businessId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("offer-images")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setLocalError("No pudimos subir la imagen. Inténtalo de nuevo.");
        return;
      }

      const { data } = supabase.storage
        .from("offer-images")
        .getPublicUrl(path);

      setUrl(data.publicUrl);
    } catch {
      setLocalError("No pudimos subir la imagen. Revisa tu conexión.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage() {
    setUrl("");
    setLocalError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Imagen de la oferta</Label>
      <input type="hidden" name="imageUrl" value={url} />

      {url ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Vista previa de la oferta"
            className="aspect-[16/10] w-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <Trash2 aria-hidden="true" />
            Quitar
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          {uploading ? (
            <Loader2
              className="size-6 animate-spin text-primary"
              aria-hidden="true"
            />
          ) : (
            <ImagePlus className="size-6 text-primary" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">
            {uploading ? "Subiendo imagen…" : "Elegir una imagen"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG o WebP · máximo 5 MB
          </span>
        </label>
      )}

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
        disabled={uploading}
      />

      {shownError ? (
        <p className="text-xs text-destructive">{shownError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Una foto clara del producto ayuda a que los clientes reserven. Si no
          subes ninguna, se mostrará un ícono.
        </p>
      )}
    </div>
  );
}
