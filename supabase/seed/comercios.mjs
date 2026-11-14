/**
 * ReCome · Catálogo de comercios y ofertas de prueba
 *
 * Datos compartidos por `datos-prueba.mjs` (crea las cuentas y los comercios)
 * y `ofertas-vigentes.mjs` (refresca las ofertas con fechas futuras).
 *
 * Son datos de demostración: los nombres, direcciones y precios son ficticios
 * y deben eliminarse antes de desplegar.
 */

export const weekdays = (open, close) =>
  [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, open, close }));

export const businesses = [
  {
    name: "Panadería El Trigal",
    email: "eltrigal@recome.test",
    owner: "Rosa Quispe Huamán",
    type: "BAKERY",
    description:
      "Panadería de barrio con horno de leña. Vendemos el pan que sobra del día a precio reducido.",
    address: "Av. Garcilaso de la Vega 1234",
    district: "Wanchaq",
    phone: "984112233",
    latitude: -13.5224,
    longitude: -71.9689,
    opening_hours: weekdays("05:30", "21:00"),
    category: "panaderia",
    offers: [
      { title: "Canasta de panes del día", original: 12, price: 7, stock: 15, window: ["18:00", "21:00"], description: "Surtido de pan francés, yema y pan de campo horneados hoy." },
      { title: "Empanadas de queso (x3)", original: 10, price: 6, stock: 12, window: ["18:00", "21:00"], description: "Empanadas de queso andino recién horneadas." },
      { title: "Porción de torta de chocolate", original: 9, price: 5, stock: 8, window: ["17:00", "20:30"], description: "Bizcocho húmedo de cacao con ganache." },
    ],
  },
  {
    name: "Pastelería Doña Chela",
    email: "donachela@recome.test",
    owner: "Graciela Mendoza Farfán",
    type: "PASTRY",
    description:
      "Pastelería tradicional cusqueña. Tortas, alfajores y postres hechos en casa.",
    address: "Calle Plateros 348",
    district: "Cusco",
    phone: "984223344",
    latitude: -13.5167,
    longitude: -71.9785,
    opening_hours: weekdays("09:00", "20:30"),
    category: "pasteleria",
    offers: [
      { title: "Torta de tres leches", original: 55, price: 35, stock: 3, window: ["17:00", "20:00"], description: "Torta entera de 24 cm, para 8 porciones." },
      { title: "Alfajores artesanales (x6)", original: 18, price: 11, stock: 10, window: ["16:00", "20:00"], description: "Alfajores de manjar blanco con azúcar impalpable." },
      { title: "Cheesecake de maracuyá", original: 60, price: 38, stock: 4, window: ["17:30", "20:30"], description: "Cheesecake horneado con salsa de maracuyá." },
    ],
  },
  {
    name: "Café Qorikancha",
    email: "qorikancha@recome.test",
    owner: "Luis Alberto Ccoa Ttito",
    type: "CAFE",
    description:
      "Café de especialidad a dos cuadras del Qorikancha. Granos de La Convención.",
    address: "Av. El Sol 456",
    district: "Cusco",
    phone: "984334455",
    latitude: -13.5202,
    longitude: -71.9752,
    opening_hours: weekdays("07:00", "21:00"),
    category: "cafeteria",
    offers: [
      { title: "Café pasado + croissant", original: 14, price: 8, stock: 20, window: ["16:00", "20:00"], description: "Café de 12 oz y croissant de mantequilla del día." },
      { title: "Jugo de naranja 1 L", original: 12, price: 6, stock: 10, window: ["15:00", "19:00"], description: "Jugo natural exprimido en el local." },
      { title: "Sánguche de pollo deshilachado", original: 13, price: 8, stock: 12, window: ["16:00", "20:00"], description: "Pan ciabatta con pollo, lechuga y mayonesa de ají." },
    ],
  },
  {
    name: "Heladería Salkantay",
    email: "salkantay@recome.test",
    owner: "María Elena Puma Vargas",
    type: "ICE_CREAM",
    description:
      "Helados artesanales con frutas de la región: lúcuma, chirimoya y aguaymanto.",
    address: "Calle Tandapata 210, San Blas",
    district: "Cusco",
    phone: "984445566",
    latitude: -13.5143,
    longitude: -71.9736,
    opening_hours: weekdays("11:00", "21:30"),
    category: "heladeria",
    offers: [
      { title: "Pote de helado 1 L", original: 32, price: 19, stock: 6, window: ["18:00", "21:00"], description: "Elige hasta dos sabores. Pote sellado para llevar." },
      { title: "Copa doble de helado", original: 12, price: 7, stock: 15, window: ["17:00", "21:00"], description: "Dos bolas con topping de fruta fresca." },
    ],
  },
  {
    name: "Restaurante Tupananchis",
    email: "tupananchis@recome.test",
    owner: "Julio César Auccapuma Rojas",
    type: "RESTAURANT",
    description:
      "Comida casera cusqueña. Menú del día y platos para llevar.",
    address: "Av. Velasco Astete 890",
    district: "San Jerónimo",
    phone: "984556677",
    latitude: -13.5439,
    longitude: -71.9361,
    opening_hours: weekdays("11:30", "20:00"),
    category: "comida-preparada",
    offers: [
      { title: "Menú del día para llevar", original: 18, price: 11, stock: 25, window: ["14:00", "17:00"], description: "Sopa, segundo y refresco. Empaque incluido." },
      { title: "Sopa de quinua 1 L", original: 12, price: 7, stock: 10, window: ["14:00", "18:00"], description: "Sopa de quinua con verduras y hierbas andinas." },
      { title: "Pollo a la brasa (1/4)", original: 22, price: 14, stock: 18, window: ["17:00", "20:00"], description: "Cuarto de pollo con papas y ensalada." },
    ],
  },
  {
    name: "Panificadora Los Andes",
    email: "losandes@recome.test",
    owner: "Eloy Huamán Cárdenas",
    type: "BAKERY",
    description:
      "Panificadora del barrio de Santiago. Pan integral, bizcochos y masas dulces.",
    address: "Av. Huayruropata 1450",
    district: "Santiago",
    phone: "984667788",
    latitude: -13.5278,
    longitude: -71.9604,
    opening_hours: weekdays("06:00", "21:00"),
    category: "panaderia",
    offers: [
      { title: "Pan de molde integral", original: 14, price: 8, stock: 10, window: ["18:00", "21:00"], description: "Molde de 600 g con harina integral y linaza." },
      { title: "Bizcochos andinos (x10)", original: 15, price: 9, stock: 12, window: ["17:00", "20:30"], description: "Bizcochos de manteca con harina de trigo local." },
    ],
  },
  {
    name: "Dulcería Manzanapata",
    email: "manzanapata@recome.test",
    owner: "Ana Lucía Béjar Yupanqui",
    type: "PASTRY",
    description:
      "Dulces cusqueños tradicionales: turrón, mazamorra y rosquitas.",
    address: "Calle Santa Ana 320",
    district: "Cusco",
    phone: "984778899",
    latitude: -13.5148,
    longitude: -71.9816,
    opening_hours: weekdays("10:00", "21:00"),
    category: "pasteleria",
    offers: [
      { title: "Turrón de Doña Pepa (porción)", original: 10, price: 6, stock: 20, window: ["16:00", "20:00"], description: "Porción generosa con miel de chancaca." },
      { title: "Mazamorra morada 1 L", original: 12, price: 7, stock: 8, window: ["16:00", "20:00"], description: "Mazamorra con frutas secas, lista para servir." },
      { title: "Rosquitas de manteca (x12)", original: 14, price: 8, stock: 10, window: ["17:00", "21:00"], description: "Rosquitas horneadas del día." },
    ],
  },
];
