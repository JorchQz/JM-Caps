-- El proveedor no cobra un precio fijo por tipo: cobra por volumen, y la
-- escalera de DH es distinta a la de las demas. Un renglon por escalon.

drop table if exists public.precios_proveedor;

create table public.precios_proveedor (
  categoria categoria_cachucha not null,
  desde_piezas integer not null check (desde_piezas > 0),
  precio_usd numeric not null check (precio_usd > 0),
  actualizado_en timestamptz not null default now(),
  primary key (categoria, desde_piezas)
);

alter table public.precios_proveedor enable row level security;

create policy admin_full_access on public.precios_proveedor
  for all to authenticated using (true) with check (true);

comment on table public.precios_proveedor is
  'Escalera de precios de compra por categoria y volumen, en dolares.';
comment on column public.precios_proveedor.desde_piezas is
  'Aplica a partir de esta cantidad de piezas. Gana siempre el escalon mas alto que se alcance.';

-- Precios que dio el proveedor el 2026-09-18. UU y UUS quedan sin escalones:
-- estan pausadas y no se pidieron precios de esas.
insert into public.precios_proveedor (categoria, desde_piezas, precio_usd) values
  ('AA', 10, 8.50), ('AA', 30, 8.00), ('AA', 100, 7.50),
  ('AAS', 10, 8.50), ('AAS', 30, 8.00), ('AAS', 100, 7.50),
  ('K', 10, 8.50), ('K', 30, 8.00), ('K', 100, 7.50),
  ('DH', 10, 16.00), ('DH', 50, 15.00), ('DH', 100, 14.00);

-- Ajustes del negocio que cambian sin tocar codigo.
create table public.configuracion (
  clave text primary key,
  valor text not null,
  descripcion text,
  actualizado_en timestamptz not null default now()
);

alter table public.configuracion enable row level security;

create policy admin_full_access on public.configuracion
  for all to authenticated using (true) with check (true);

-- Que cantidad decide el escalon de precio. El proveedor dijo "producto de 30
-- piezas": puede significar 30 del mismo diseno o 30 en todo el pedido. Se deja
-- en la lectura conservadora hasta que el proveedor lo aclare.
insert into public.configuracion (clave, valor, descripcion) values
  ('base_escalon', 'diseno',
   'Que cantidad decide el escalon de precio: diseno, categoria o pedido.');

-- El total lo calcula el panel, que es donde vive la logica de escalones, y lo
-- manda al confirmar para guardarlo en el lote.
drop function if exists public.confirmar_pedido(uuid);

create function public.confirmar_pedido(
  p_lote_id uuid,
  p_total_usd numeric default null
)
returns table (confirmadas integer, descartadas integer, piezas integer, total_usd numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_confirmadas integer := 0;
  v_descartadas integer := 0;
  v_piezas integer := 0;
begin
  if not exists (select 1 from lotes where id = p_lote_id) then
    raise exception 'El lote indicado no existe';
  end if;

  update pedido_lineas
     set estado = 'confirmada'
   where lote_id = p_lote_id
     and estado = 'solicitada';

  select count(*) filter (where estado = 'confirmada'),
         count(*) filter (where estado = 'no_disponible'),
         coalesce(sum(cantidad) filter (where estado = 'confirmada'), 0)
    into v_confirmadas, v_descartadas, v_piezas
    from pedido_lineas
   where lote_id = p_lote_id;

  if v_confirmadas = 0 then
    raise exception 'El pedido no tiene ninguna linea confirmada';
  end if;

  update lotes
     set estado = case when lotes.estado = 'borrador' then 'pedido'::estado_lote else lotes.estado end,
         total_usd = case when p_total_usd > 0 then p_total_usd else lotes.total_usd end
   where lotes.id = p_lote_id;

  confirmadas := v_confirmadas;
  descartadas := v_descartadas;
  piezas := v_piezas;
  total_usd := coalesce(p_total_usd, 0);
  return next;
end;
$$;

comment on function public.confirmar_pedido is
  'Cierra el borrador: confirma lineas, pasa el lote a pedido y guarda el total en dolares.';

revoke all on function public.confirmar_pedido(uuid, numeric) from anon;
grant execute on function public.confirmar_pedido(uuid, numeric) to authenticated;
