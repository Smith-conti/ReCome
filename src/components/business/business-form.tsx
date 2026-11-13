"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, TextField } from "@/components/auth/fields";
import { initialBusinessState } from "@/lib/business/action-state";
import { saveBusinessAction } from "@/lib/business/actions";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABEL,
  DAY_LABEL,
  type OpeningHour,
} from "@/lib/business/types";
import { cn } from "@/lib/utils";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

type BusinessFormProps = {
  mode: "create" | "edit";
  initial: {
    name: string;
    type: string;
    description: string;
    address: string;
    district: string;
    city: string;
    phone: string;
    email: string;
    openingHours: OpeningHour[];
  };
};

type DayHours = { open: string; close: string };

function initialDayHours(hours: OpeningHour[]): Record<number, DayHours> {
  const result: Record<number, DayHours> = {};

  for (const hour of hours) {
    result[hour.day] = { open: hour.open, close: hour.close };
  }

  return result;
}

export function BusinessForm({ mode, initial }: BusinessFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveBusinessAction,
    initialBusinessState,
  );
  const errors = state.fieldErrors ?? {};

  const [hours, setHours] = useState<Record<number, DayHours>>(() =>
    initialDayHours(initial.openingHours),
  );

  function toggleDay(day: number) {
    setHours((current) => {
      const next = { ...current };
      if (next[day]) {
        delete next[day];
      } else {
        next[day] = { open: "09:00", close: "18:00" };
      }
      return next;
    });
  }

  function setTime(day: number, field: keyof DayHours, value: string) {
    setHours((current) => {
      const dayHours = current[day];
      if (!dayHours) return current;
      return { ...current, [day]: { ...dayHours, [field]: value } };
    });
  }

  const serializedHours = JSON.stringify(
    Object.entries(hours)
      .map(([day, value]) => ({ day: Number(day), ...value }))
      .sort((a, b) => a.day - b.day),
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      {state.message ? (
        <FormAlert tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormAlert>
      ) : null}

      <div className="space-y-4">
        <TextField
          id="name"
          label="Nombre del establecimiento"
          defaultValue={initial.name}
          placeholder="Panadería El Trigal"
          required
          maxLength={120}
          error={errors.name}
        />

        <div className="space-y-1.5">
          <Label htmlFor="type">Rubro</Label>
          <select
            id="type"
            name="type"
            defaultValue={initial.type}
            aria-invalid={errors.type ? true : undefined}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30"
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {BUSINESS_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          {errors.type ? (
            <p className="text-xs text-destructive">{errors.type}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial.description}
            rows={3}
            maxLength={1000}
            placeholder="Cuéntale a los clientes qué vendes y qué excedentes sueles publicar."
            aria-invalid={errors.description ? true : undefined}
            className="min-h-24 px-2.5 py-2 text-sm"
          />
          {errors.description ? (
            <p className="text-xs text-destructive">{errors.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Máximo 1000 caracteres.
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Ubicación y contacto</legend>

        <TextField
          id="address"
          label="Dirección"
          defaultValue={initial.address}
          placeholder="Av. Garcilaso de la Vega 1234"
          autoComplete="street-address"
          required
          maxLength={200}
          error={errors.address}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="district"
            label="Distrito"
            defaultValue={initial.district}
            placeholder="Wanchaq"
            required
            maxLength={80}
            error={errors.district}
          />
          <TextField
            id="city"
            label="Ciudad"
            defaultValue={initial.city}
            required
            maxLength={80}
            error={errors.city}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="phone"
            label="Teléfono del local (opcional)"
            type="tel"
            inputMode="tel"
            defaultValue={initial.phone}
            placeholder="984 000 000"
            maxLength={30}
            error={errors.phone}
          />
          <TextField
            id="email"
            label="Correo de contacto (opcional)"
            type="email"
            inputMode="email"
            defaultValue={initial.email}
            placeholder="hola@mipanaderia.pe"
            maxLength={254}
            error={errors.email}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Horario de atención</legend>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Marca los días en que atiendes el local. Cada oferta define después su
          propia ventana de recojo.
        </p>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const value = hours[day];
            const enabled = Boolean(value);

            return (
              <div
                key={day}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2",
                  !enabled && "bg-muted/40",
                )}
              >
                <label className="flex min-w-28 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(day)}
                    className="size-4 accent-primary"
                  />
                  {DAY_LABEL[day]}
                </label>

                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    !enabled && "opacity-50",
                  )}
                >
                  <input
                    type="time"
                    value={value?.open ?? "09:00"}
                    onChange={(event) =>
                      setTime(day, "open", event.target.value)
                    }
                    disabled={!enabled}
                    aria-label={`Hora de apertura del ${DAY_LABEL[day].toLowerCase()}`}
                    className="h-9 rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
                  />
                  <span className="text-muted-foreground">a</span>
                  <input
                    type="time"
                    value={value?.close ?? "18:00"}
                    onChange={(event) =>
                      setTime(day, "close", event.target.value)
                    }
                    disabled={!enabled}
                    aria-label={`Hora de cierre del ${DAY_LABEL[day].toLowerCase()}`}
                    className="h-9 rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <input type="hidden" name="openingHours" value={serializedHours} />

        {errors.openingHours ? (
          <p className="text-xs text-destructive">{errors.openingHours}</p>
        ) : null}
      </fieldset>

      <Button type="submit" className="h-10" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        {isPending
          ? "Guardando…"
          : mode === "create"
            ? "Registrar establecimiento"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
