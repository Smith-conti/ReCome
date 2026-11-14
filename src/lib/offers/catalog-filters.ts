import { BUSINESS_TYPES, type BusinessType } from "../business/types";

export type CatalogParams = Record<string, string | string[] | undefined>;
export function parseCatalogFilters(params: CatalogParams) {
  const get = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key] ?? "").trim();
  const values = Object.fromEntries(["q", "categoria", "tipo", "zona", "min", "max", "fecha", "desde", "hasta"].map(key => [key, get(key)]));
  values.q = values.q.slice(0, 80); values.zona = values.zona.slice(0, 80);
  const errors: string[] = [];
  function price(key: string) {
    if (!values[key]) return undefined;
    if (!/^\d{1,5}([.,]\d{1,2})?$/.test(values[key])) { errors.push("Indica precios válidos entre S/ 0 y S/ 99 999.99."); return undefined; }
    return Number(values[key].replace(",", "."));
  }
  const minPrice = price("min"), maxPrice = price("max");
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) errors.push("El precio mínimo no puede superar el máximo.");
  const businessType = BUSINESS_TYPES.includes(values.tipo as BusinessType) ? values.tipo as BusinessType : undefined;
  if (values.tipo && !businessType) errors.push("Selecciona un tipo de negocio válido.");
  let pickupFrom: string | undefined, pickupTo: string | undefined;
  const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if ((values.desde || values.hasta) && !values.fecha) errors.push("Selecciona una fecha para filtrar el horario.");
  if (values.fecha) {
    const date = new Date(values.fecha + "T00:00:00-05:00");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fecha) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== values.fecha) errors.push("Selecciona una fecha válida.");
    else if ((values.desde && !validTime(values.desde)) || (values.hasta && !validTime(values.hasta))) errors.push("Indica un horario válido.");
    else {
      pickupFrom = values.fecha + "T" + (values.desde || "00:00") + ":00-05:00";
      pickupTo = values.hasta ? values.fecha + "T" + values.hasta + ":00-05:00" : new Date(date.getTime()+86400000).toISOString();
      if (Date.parse(pickupFrom) >= Date.parse(pickupTo)) errors.push("El fin del horario debe ser posterior al inicio.");
    }
  }
  const rawPage = get("pagina");
  const page = /^\d{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  return { values, errors: [...new Set(errors)], page, search: values.q, categorySlug: values.categoria || undefined, district: values.zona || undefined, businessType, minPrice, maxPrice, pickupFrom, pickupTo };
}
export function catalogHref(values: Record<string, string>, changes: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries({...values, ...changes})) if (value) params.set(key,value);
  return params.size ? "/ofertas?" + params.toString() : "/ofertas";
}
