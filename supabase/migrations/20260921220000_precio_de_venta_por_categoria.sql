-- Precio de venta sugerido por tipo de gorra.
--
-- Hasta ahora vivia escrito en el codigo (CATEGORIAS[x].precioSugerido), asi
-- que cambiar de precio pedia tocar el repositorio y volver a desplegar. Es
-- una decision de negocio que cambia sola, sin que cambie el programa.
--
-- Ojo con lo que NO es: esto es el precio con el que nace un producto nuevo y
-- la base del boton "aplicar a todo el tipo". El precio que se cobra sigue
-- viviendo en cada modelo (modelos.precio_venta_mxn), porque una gorra puede
-- valer distinto a las de su tipo. Cambiar este numero no reprecia lo que ya
-- esta dado de alta: eso se hace a proposito desde la pantalla de precios.

create table if not exists public.precios_categoria (
  categoria categoria_cachucha primary key,
  precio_mxn numeric(10, 2) not null check (precio_mxn > 0),
  actualizado_en timestamptz not null default now()
);

comment on table public.precios_categoria is
  'Precio de venta con el que nace un producto nuevo de cada tipo. El precio real de cada gorra vive en modelos.precio_venta_mxn.';

alter table public.precios_categoria enable row level security;

drop policy if exists admin_full_access on public.precios_categoria;

create policy admin_full_access on public.precios_categoria
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.precios_categoria to authenticated;
revoke all on public.precios_categoria from anon;

-- Precios vigentes al 21 de septiembre de 2026: streetwear a 499, el resto a
-- 299. UU y UUS estan pausadas y arrancan igual que el resto; cuando se
-- retomen se les pone lo suyo.
insert into public.precios_categoria (categoria, precio_mxn) values
  ('AA', 299),
  ('AAS', 299),
  ('UU', 299),
  ('UUS', 299),
  ('K', 299),
  ('DH', 499)
on conflict (categoria) do nothing;
