/**
 * ReCome · Cuentas de cliente y plan de reservas para la demo
 *
 * Datos de demostración: los nombres, correos y teléfonos son ficticios.
 * Todos usan el dominio `@recome.test`, que no recibe correos reales.
 *
 * `demo.mjs` crea estas cuentas y genera sus reservas respetando las reglas
 * reales del sistema (stock, límite de 5 activas, estados y eventos).
 */

export const clientes = [
  {
    email: "ana.torres@recome.test",
    fullName: "Ana Torres Quispe",
    phone: "984100101",
    plan: [
      { type: "DELIVERED", daysAgo: 6, quantity: 2 },
      { type: "CANCELLED", daysAgo: 3, quantity: 1 },
      { type: "CONFIRMED", daysAgo: 0, quantity: 1 },
      { type: "PENDING", daysAgo: 0, quantity: 1 },
    ],
  },
  {
    email: "jorge.mamani@recome.test",
    fullName: "Jorge Mamani Ccahuana",
    phone: "984100202",
    plan: [
      { type: "DELIVERED", daysAgo: 9, quantity: 1 },
      { type: "EXPIRED", daysAgo: 5, quantity: 1 },
      { type: "DELIVERED", daysAgo: 2, quantity: 2 },
      { type: "CONFIRMED", daysAgo: 0, quantity: 1 },
    ],
  },
  {
    email: "lucia.condori@recome.test",
    fullName: "Lucía Condori Huamán",
    phone: "984100303",
    plan: [
      { type: "CANCELLED", daysAgo: 7, quantity: 2 },
      { type: "DELIVERED", daysAgo: 4, quantity: 1 },
      { type: "PENDING", daysAgo: 0, quantity: 2 },
    ],
  },
  {
    email: "diego.choque@recome.test",
    fullName: "Diego Choque Ataucuri",
    phone: "984100404",
    plan: [
      { type: "DELIVERED", daysAgo: 3, quantity: 1 },
      { type: "EXPIRED", daysAgo: 1, quantity: 1 },
      { type: "CONFIRMED", daysAgo: 0, quantity: 1 },
    ],
  },
  {
    email: "maria.huaman@recome.test",
    fullName: "María Huamán Yupanqui",
    phone: "984100505",
    plan: [
      { type: "DELIVERED", daysAgo: 8, quantity: 1 },
      { type: "PENDING", daysAgo: 0, quantity: 1 },
      { type: "CONFIRMED", daysAgo: 0, quantity: 1 },
    ],
  },
  {
    email: "carlos.puma@recome.test",
    fullName: "Carlos Puma Ttito",
    phone: "984100606",
    plan: [
      { type: "DELIVERED", daysAgo: 10, quantity: 2 },
      { type: "CANCELLED", daysAgo: 2, quantity: 1 },
      { type: "PENDING", daysAgo: 0, quantity: 1 },
    ],
  },
];

/** Estados que puede generar el plan de la demo. */
export const INTENT_TYPES = [
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
];
