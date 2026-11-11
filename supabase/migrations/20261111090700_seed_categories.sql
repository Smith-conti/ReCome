-- ReCome · Fase 2
-- Datos iniciales: categorías de ofertas.
-- Idempotente: se puede ejecutar varias veces sin duplicar filas.

insert into public.categories (name, slug, description)
values
  ('Panadería', 'panaderia', 'Panes, masas y productos de bollería.'),
  ('Pastelería', 'pasteleria', 'Tortas, postres y bocaditos dulces.'),
  ('Cafetería', 'cafeteria', 'Café, infusiones y acompañamientos.'),
  ('Heladería', 'heladeria', 'Helados, postres fríos y bebidas frías.'),
  ('Comida preparada', 'comida-preparada', 'Platos listos para llevar o consumir.'),
  ('Otros', 'otros', 'Otros excedentes de alimentos no clasificados.')
on conflict (slug) do nothing;
