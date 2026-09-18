-- Correccion: FOR UPDATE no se puede combinar con funciones de agregacion,
-- asi que el bloqueo de filas se hace en una sentencia aparte antes de contar.

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
  v_esperado integer := array_length(p_unidad_ids, 1);
begin
  if p_unidad_ids is null or v_esperado is null or v_esperado = 0 then
    raise exception 'No se indico ninguna unidad para la venta';
  end if;

  -- Bloquea las filas primero (FOR UPDATE no se puede combinar con agregados)
  -- para que dos ventas simultaneas no puedan vender la misma pieza.
  perform 1 from unidades where id = any(p_unidad_ids) for update;

  select count(*) into v_conteo
    from unidades
   where id = any(p_unidad_ids)
     and estado in ('disponible', 'apartada');

  if v_conteo <> v_esperado then
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
