-- Problema 1: unidades_creadas era un contador que solo subia. Al borrar una
-- pieza, la linea seguia contandola y aparecia como capturada cuando no lo
-- estaba. Se cambia por una relacion real: la pieza sabe de que linea salio, y
-- el avance se cuenta, no se guarda. Asi se corrige solo.

alter table public.unidades
  add column if not exists linea_id uuid references public.pedido_lineas (id) on delete set null;

create index if not exists unidades_linea_idx on public.unidades (linea_id) where linea_id is not null;

comment on column public.unidades.linea_id is
  'Linea del pedido que origino esta pieza. Sirve para saber cuanto falta capturar.';

alter table public.pedido_lineas drop column if exists unidades_creadas;

-- agregar_unidades deja de mover contadores y solo marca el origen.
drop function if exists public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid);

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
    insert into unidades (modelo_id, lote_id, linea_id, talla, costo_unitario_mxn, estado, fecha_alta)
    select p_modelo_id,
           p_lote_id,
           p_linea_id,
           nullif(btrim(coalesce(p_talla, '')), ''),
           p_costo_unitario_mxn,
           v_estado,
           now()
    from generate_series(1, p_cantidad)
    returning id
  )
  select array_agg(id) into v_ids from nuevas;

  -- El modelo de la linea se resuelve la primera vez que se captura algo de ella.
  if p_linea_id is not null then
    update pedido_lineas
       set modelo_id = coalesce(modelo_id, p_modelo_id)
     where id = p_linea_id;
  end if;

  return v_ids;
end;
$$;

comment on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) is
  'Da de alta N unidades fisicas de un modelo en una sola transaccion. Solo admin (RLS de unidades).';

revoke all on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) from anon;
grant execute on function public.agregar_unidades(uuid, integer, text, uuid, numeric, uuid) to authenticated;

-- Problema 2: el prorrateo repartia el costo entre todas las piezas del lote,
-- incluidas las que nunca llegaron. Eso abarata artificialmente lo que si
-- tienes en mano y le pone costo a piezas que no existen. Ahora solo cuentan
-- las que llegaron, que son las que se van a vender.
create or replace function public.prorratear_costos(p_lote_id uuid)
returns table (costo_unitario numeric, piezas integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lote lotes;
  v_piezas integer;
  v_costo numeric;
begin
  select * into v_lote from lotes where id = p_lote_id;
  if not found then
    raise exception 'El lote indicado no existe';
  end if;

  select count(*) into v_piezas
    from unidades
   where lote_id = p_lote_id
     and estado in ('disponible', 'apartada', 'vendida');

  if v_piezas = 0 then
    raise exception 'Este lote todavia no tiene piezas recibidas: recibelo antes de prorratear el costo';
  end if;

  if coalesce(v_lote.total_usd, 0) = 0 or coalesce(v_lote.tipo_cambio_dia, 0) = 0 then
    raise exception 'Falta el total en dolares o el tipo de cambio del lote';
  end if;

  v_costo := round(
    ((v_lote.total_usd * v_lote.tipo_cambio_dia) + coalesce(v_lote.costo_envio_mxn, 0)) / v_piezas,
    2
  );

  update unidades
     set costo_unitario_mxn = v_costo
   where lote_id = p_lote_id
     and estado in ('disponible', 'apartada', 'vendida');

  costo_unitario := v_costo;
  piezas := v_piezas;
  return next;
end;
$$;

comment on function public.prorratear_costos is
  'Reparte el costo del lote entre las piezas que realmente llegaron. Solo admin (RLS).';

revoke all on function public.prorratear_costos(uuid) from anon;
grant execute on function public.prorratear_costos(uuid) to authenticated;
