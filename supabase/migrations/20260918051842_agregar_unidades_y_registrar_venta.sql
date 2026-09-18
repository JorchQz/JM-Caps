-- Alta de unidades y registro de venta como operaciones atomicas.
-- Sin esto, el panel tendria que hacer varios INSERT/UPDATE sueltos desde el
-- navegador y una falla a media operacion dejaria el inventario inconsistente.

create or replace function public.agregar_unidades(
  p_modelo_id uuid,
  p_cantidad integer,
  p_talla text default null,
  p_lote_id uuid default null,
  p_costo_unitario_mxn numeric default null
)
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ids uuid[];
  v_estado estado_unidad := 'disponible';
begin
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 200 then
    raise exception 'La cantidad debe estar entre 1 y 200';
  end if;

  if not exists (select 1 from modelos where id = p_modelo_id) then
    raise exception 'El modelo indicado no existe';
  end if;

  -- El estado inicial de la unidad sigue al estado del lote del que proviene.
  if p_lote_id is not null then
    select case l.estado
             when 'pedido' then 'pedido'::estado_unidad
             when 'en_transito' then 'en_transito'::estado_unidad
             else 'disponible'::estado_unidad
           end
      into v_estado
      from lotes l
     where l.id = p_lote_id;

    if not found then
      raise exception 'El lote indicado no existe';
    end if;
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

  return v_ids;
end;
$$;

comment on function public.agregar_unidades is
  'Da de alta N unidades fisicas de un modelo en una sola transaccion. Solo admin (RLS de unidades).';

create or replace function public.registrar_venta(
  p_unidad_ids uuid[],
  p_metodo_pago metodo_pago,
  p_canal canal_venta,
  p_cliente_nombre text default null,
  p_cliente_telefono text default null,
  p_notas text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venta_id uuid;
  v_total numeric := 0;
  v_conteo integer;
begin
  if p_unidad_ids is null or array_length(p_unidad_ids, 1) is null then
    raise exception 'No se indico ninguna unidad para la venta';
  end if;

  select count(*) into v_conteo
    from unidades u
   where u.id = any(p_unidad_ids)
     and u.estado in ('disponible', 'apartada')
   for update;

  if v_conteo <> array_length(p_unidad_ids, 1) then
    raise exception 'Alguna de las unidades ya no esta disponible o ya fue vendida';
  end if;

  select coalesce(sum(m.precio_venta_mxn), 0) into v_total
    from unidades u
    join modelos m on m.id = u.modelo_id
   where u.id = any(p_unidad_ids);

  insert into ventas (total_mxn, metodo_pago, canal, cliente_nombre, cliente_telefono, notas)
  values (v_total, p_metodo_pago, p_canal,
          nullif(btrim(coalesce(p_cliente_nombre, '')), ''),
          nullif(btrim(coalesce(p_cliente_telefono, '')), ''),
          nullif(btrim(coalesce(p_notas, '')), ''))
  returning id into v_venta_id;

  insert into venta_items (venta_id, unidad_id, precio_mxn)
  select v_venta_id, u.id, m.precio_venta_mxn
    from unidades u
    join modelos m on m.id = u.modelo_id
   where u.id = any(p_unidad_ids);

  update unidades
     set estado = 'vendida',
         fecha_venta = now(),
         apartado_hasta = null,
         apartado_nombre = null,
         apartado_telefono = null
   where id = any(p_unidad_ids);

  return v_venta_id;
end;
$$;

comment on function public.registrar_venta is
  'Registra una venta completa (encabezado, items y cambio de estado de las unidades) en una transaccion. Solo admin (RLS).';

revoke all on function public.agregar_unidades(uuid, integer, text, uuid, numeric) from anon;
revoke all on function public.registrar_venta(uuid[], metodo_pago, canal_venta, text, text, text) from anon;
grant execute on function public.agregar_unidades(uuid, integer, text, uuid, numeric) to authenticated;
grant execute on function public.registrar_venta(uuid[], metodo_pago, canal_venta, text, text, text) to authenticated;
