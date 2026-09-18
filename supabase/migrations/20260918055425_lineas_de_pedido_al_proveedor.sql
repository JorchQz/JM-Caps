-- Lineas del pedido que se le manda al proveedor: link, talla y cantidad.
-- Viven aparte de modelos/unidades a proposito: en esta etapa todavia no se
-- sabe que va a llegar, y crear productos que el proveedor puede rechazar
-- ensuciaria el catalogo.

create type public.estado_linea_pedido as enum ('solicitada', 'confirmada', 'no_disponible');

create table public.pedido_lineas (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes (id) on delete cascade,
  link_yupoo text not null,
  talla text,
  cantidad integer not null default 1 check (cantidad > 0 and cantidad <= 200),
  estado estado_linea_pedido not null default 'solicitada',
  nota text,
  -- Se resuelve solo cuando el link ya existe en el catalogo: evita recapturar
  -- caracteristicas de un diseno que ya se pidio antes.
  modelo_id uuid references public.modelos (id) on delete set null,
  unidades_creadas integer not null default 0,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index pedido_lineas_unicas_idx
  on public.pedido_lineas (lote_id, link_yupoo, coalesce(talla, ''));

create index pedido_lineas_lote_idx on public.pedido_lineas (lote_id);

alter table public.pedido_lineas enable row level security;

create policy admin_full_access on public.pedido_lineas
  for all to authenticated using (true) with check (true);

comment on table public.pedido_lineas is
  'Borrador del pedido al proveedor. No es inventario: el inventario nace al confirmar.';

-- La firma vieja se elimina: con el parametro nuevo opcional, las llamadas de
-- cinco argumentos quedarian ambiguas entre las dos versiones.
drop function if exists public.agregar_unidades(uuid, integer, text, uuid, numeric);

create function public.agregar_unidades(
  p_modelo_id uuid,
  p_cantidad integer,
  p_talla text default null,
  p_lote_id uuid default null,
  p_costo_unitario_mxn numeric default null,
  p_linea_id uuid default null
)
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ids uuid[];
  v_estado estado_unidad := 'disponible';
  v_estado_lote estado_lote;
begin
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 200 then
    raise exception 'La cantidad debe estar entre 1 y 200';
  end if;

  if not exists (select 1 from modelos where id = p_modelo_id) then
    raise exception 'El modelo indicado no existe';
  end if;

  if p_lote_id is not null then
    select estado into v_estado_lote from lotes where id = p_lote_id;

    if not found then
      raise exception 'El lote indicado no existe';
    end if;

    if v_estado_lote = 'borrador' then
      raise exception 'Este pedido sigue en borrador: confirmalo con el proveedor antes de capturar productos';
    end if;

    -- El estado inicial de la unidad sigue al estado del lote del que proviene.
    v_estado := case v_estado_lote
                  when 'pedido' then 'pedido'::estado_unidad
                  when 'en_transito' then 'en_transito'::estado_unidad
                  else 'disponible'::estado_unidad
                end;
  end if;

  with nuevas as (
    insert into unidades (modelo_id, lote_id, talla, costo_unitario_mxn, estado, fecha_alta)
    select p_modelo_id,
           p_lote_id,
           nullif(btrim(coalesce(p_talla, '')), ''),
           p_costo_unitario_mxn,
           v_estado,
           now()
    from generate_series(1, p_cantidad)
    returning id
  )
  select array_agg(id) into v_ids from nuevas;

  if p_linea_id is not null then
    update pedido_lineas
       set unidades_creadas = unidades_creadas + p_cantidad,
           modelo_id = coalesce(modelo_id, p_modelo_id)
     where id = p_linea_id;
  end if;

  return v_ids;
end;
$$;

comment on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) is
  'Da de alta N unidades fisicas de un modelo en una sola transaccion. Solo admin (RLS de unidades).';

revoke all on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) from anon;
grant execute on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) to authenticated;

-- Confirmar el pedido: lo que el proveedor no tenia se queda marcado como no
-- disponible y no estorba; el resto pasa a confirmada y ya se puede capturar.
create or replace function public.confirmar_pedido(p_lote_id uuid)
returns table (confirmadas integer, descartadas integer, piezas integer)
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

  update lotes set estado = 'pedido' where id = p_lote_id and estado = 'borrador';

  return query select v_confirmadas, v_descartadas, v_piezas;
end;
$$;

comment on function public.confirmar_pedido is
  'Cierra el borrador: marca las lineas vigentes como confirmadas y pasa el lote a pedido.';

revoke all on function public.confirmar_pedido(uuid) from anon;
grant execute on function public.confirmar_pedido(uuid) to authenticated;
