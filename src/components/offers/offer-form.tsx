"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Info, Loader2, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, TextField } from "@/components/auth/fields";
import { initialOfferState } from "@/lib/offers/action-state";
import { saveOfferAction } from "@/lib/offers/actions";
import type { Category } from "@/lib/offers/types";
import { cn } from "@/lib/utils";
import { OfferImageField } from "./offer-image-field";

type OfferFormInitial = {
  id?: string;
  title: string;
  categoryId: string;
  description: string;
  originalPrice: string;
  discountedPrice: string;
  initialQuantity: string;
  imageUrl: string;
  pickupStart: string;
  pickupEnd: string;
  expirationAt: string;
  ingredients: string;
  allergens: string;
  storageInstructions: string;
};

type OfferFormProps = {
  mode: "create" | "edit";
  businessId: string;
  businessApproved: boolean;
  categories: Category[];
  initial: OfferFormInitial;
};

function FieldError({
  id,
  error,
}: {
  id: string;
  error?: string;
}) {
  if (!error) return null;

  return (
    <p id={`${id}-error`} className="text-xs text-destructive">
      {error}
    </p>
  );
}

function SelectField({
  id,
  label,
  error,
  hint,
  defaultValue,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          error && "border-destructive",
        )}
      >
        {children}
      </select>
      {error ? (
        <FieldError id={id} error={error} />
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TextAreaField({
  id,
  label,
  error,
  hint,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error ? (
        <FieldError id={id} error={error} />
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function OfferForm({
  mode,
  businessId,
  businessApproved,
  categories,
  initial,
}: OfferFormProps) {
  const [state, formAction, pending] = useActionState(
    saveOfferAction,
    initialOfferState,
  );
  const [uploading, setUploading] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {initial.id ? (
        <input type="hidden" name="offerId" value={initial.id} />
      ) : null}

      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      {state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      {!businessApproved ? (
        <div className="flex gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
          <Info
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            Tu establecimiento todavía no está aprobado. Puedes guardar
            borradores, pero la publicación se habilitará cuando un
            administrador apruebe tu comercio.
          </p>
        </div>
      ) : null}

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg">Datos de la oferta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe el excedente que vas a ofrecer. El título y la categoría
            aparecen en el catálogo.
          </p>
        </div>

        <TextField
          id="title"
          label="Título"
          placeholder="Ej. Pack de 6 panes artesanales"
          defaultValue={initial.title}
          error={errors.title}
          maxLength={140}
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="categoryId"
            label="Categoría"
            error={errors.categoryId}
            defaultValue={initial.categoryId}
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>

          <TextField
            id="initialQuantity"
            label="Cantidad total"
            type="number"
            min={1}
            max={10000}
            step={1}
            inputMode="numeric"
            defaultValue={initial.initialQuantity}
            error={errors.initialQuantity}
            hint="Unidades que preparaste para esta oferta."
            required
          />
        </div>

        <TextAreaField
          id="description"
          label="Descripción"
          rows={3}
          maxLength={1000}
          defaultValue={initial.description}
          error={errors.description}
          hint="Qué incluye, tamaño o cualquier detalle útil."
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg">Precios y stock</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El precio con descuento debe ser menor al precio original. El stock
            se ajusta después desde el panel de la oferta.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="originalPrice"
            label="Precio original (S/)"
            type="text"
            inputMode="decimal"
            placeholder="18.00"
            defaultValue={initial.originalPrice}
            error={errors.originalPrice}
            required
          />
          <TextField
            id="discountedPrice"
            label="Precio ReCome (S/)"
            type="text"
            inputMode="decimal"
            placeholder="11.00"
            defaultValue={initial.discountedPrice}
            error={errors.discountedPrice}
            required
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg">Horario de recojo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Horas de Perú (UTC-5). El cliente recoge el pedido dentro de esta
            ventana.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="pickupStart"
            label="Inicio del recojo"
            type="datetime-local"
            defaultValue={initial.pickupStart}
            error={errors.pickupStart}
            required
          />
          <TextField
            id="pickupEnd"
            label="Fin del recojo"
            type="datetime-local"
            defaultValue={initial.pickupEnd}
            error={errors.pickupEnd}
            required
          />
        </div>

        <TextField
          id="expirationAt"
          label="Vencimiento del producto (opcional)"
          type="datetime-local"
          defaultValue={initial.expirationAt}
          error={errors.expirationAt}
          hint="Debe ser igual o posterior al fin del recojo."
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg">Información para el cliente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estos datos ayudan a que la persona sepa qué está reservando.
          </p>
        </div>

        <TextAreaField
          id="ingredients"
          label="Ingredientes (opcional)"
          rows={2}
          maxLength={500}
          defaultValue={initial.ingredients}
          error={errors.ingredients}
        />
        <TextAreaField
          id="allergens"
          label="Alérgenos (opcional)"
          rows={2}
          maxLength={500}
          defaultValue={initial.allergens}
          error={errors.allergens}
          hint="Por ejemplo: gluten, lácteos, frutos secos."
        />
        <TextAreaField
          id="storageInstructions"
          label="Conservación (opcional)"
          rows={2}
          maxLength={500}
          defaultValue={initial.storageInstructions}
          error={errors.storageInstructions}
          hint="Por ejemplo: mantener refrigerado y consumir el mismo día."
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg">Imagen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La foto se guarda en tu espacio del comercio.
          </p>
        </div>
        <OfferImageField
          businessId={businessId}
          initialUrl={initial.imageUrl || null}
          error={errors.imageUrl}
          onUploadingChange={setUploading}
        />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link
          href="/negocio/ofertas"
          className={buttonVariants({
            variant: "outline",
            className: "h-11 px-6",
          })}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          size="lg"
          className="h-11 px-6"
          disabled={pending || uploading}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {uploading
            ? "Subiendo imagen…"
            : pending
              ? "Guardando…"
              : mode === "create"
                ? "Crear borrador"
                : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
