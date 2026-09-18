-- Lo que cuesta cada tipo de gorra con el proveedor. Un renglon por categoria
-- porque asi cotiza el: no por pieza, sino por tipo. El precio va en dolares
-- porque asi lo da, y el costo real en pesos solo se sabe el dia del pedido,
-- con el tipo de cambio de ese momento.

create table public.precios_proveedor (
  categoria categoria_cachucha primary key,
  precio_usd numeric check (precio_usd is null or precio_usd > 0),
  actualizado_en timestamptz not null default now(),
  notas text
);

alter table public.precios_proveedor enable row level security;

create policy admin_full_access on public.precios_proveedor
  for all to authenticated using (true) with check (true);

comment on table public.precios_proveedor is
  'Precio de compra por categoria, en dolares. Null significa que el proveedor todavia no lo da.';

-- Un renglon por categoria, sin precio hasta que el proveedor los pase.
insert into public.precios_proveedor (categoria)
select unnest(enum_range(null::categoria_cachucha));

-- La linea del pedido necesita saber de que tipo de gorra se trata para poder
-- costearse. El precio unitario es una excepcion opcional: si el proveedor
-- cotiza distinto una pieza en particular, gana sobre el precio de la categoria.
alter table public.pedido_lineas
  add column if not exists categoria categoria_cachucha,
  add column if not exists precio_usd_unitario numeric
    check (precio_usd_unitario is null or precio_usd_unitario > 0);

comment on column public.pedido_lineas.precio_usd_unitario is
  'Precio acordado para esta linea. Si es null se usa el de la categoria.';

-- Al confirmar el pedido se guarda el total en dolares calculado, que es lo que
-- despues sirve para prorratear el costo real entre las piezas del lote.
drop function if exists public.confirmar_pedido(uuid);

create function public.confirmar_pedido(p_lote_id uuid)
returns table (confirmadas integer, descartadas integer, piezas integer, total_usd numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_confirmadas integer := 0;
  v_descartadas integer := 0;
  v_piezas integer := 0;
  v_total numeric := 0;
begin
  if not exists (select 1 from lotes where id = p_lote_id) then
    raise exception 'El lote indicado no existe';
  end if;

  update pedido_lineas
     set estado = 'confirmada'
   where lote_id = p_lote_id
     and estado = 'solicitada';

  select count(*) filter (where l.estado = 'confirmada'),
         count(*) filter (where l.estado = 'no_disponible'),
         coalesce(sum(l.cantidad) filter (where l.estado = 'confirmada'), 0),
         coalesce(sum(l.cantidad * coalesce(l.precio_usd_unitario, p.precio_usd))
                  filter (where l.estado = 'confirmada'), 0)
    into v_confirmadas, v_descartadas, v_piezas, v_total
    from pedido_lineas l
    left join precios_proveedor p on p.categoria = l.categoria
   where l.lote_id = p_lote_id;

  if v_confirmadas = 0 then
    raise exception 'El pedido no tiene ninguna linea confirmada';
  end if;

  update lotes
     set estado = case when estado = 'borrador' then 'pedido'::estado_lote else estado end,
         total_usd = case when v_total > 0 then v_total else total_usd end
   where id = p_lote_id;

  return query select v_confirmadas, v_descartadas, v_piezas, v_total;
end;
$$;

comment on function public.confirmar_pedido is
  'Cierra el borrador: confirma lineas, pasa el lote a pedido y guarda el total en dolares.';

revoke all on function public.confirmar_pedido(uuid) from anon;
grant execute on function public.confirmar_pedido(uuid) to authenticated;
