-- Se quitan los cupones.
--
-- Un cupon solo tiene sentido si el cliente puede canjearlo solo, y aqui no
-- hay pago en linea: el cobro es en persona. Un codigo que el vendedor teclea
-- de su propio lado no es un cupon, es un descuento a mano, y para eso ya
-- estan las ofertas por modelo.
--
-- Las ofertas se quedan intactas: columnas oferta_* en modelos, la funcion
-- precio_efectivo y la columna precio_efectivo_mxn de catalogo_publico.
--
-- Sin cupon no hay descuento sobre el total de la venta, asi que subtotal_mxn
-- y total_mxn siempre serian el mismo numero. Se quitan las tres columnas en
-- vez de dejarlas siempre iguales: una columna que nunca cambia miente sobre
-- lo que el sistema sabe hacer.

alter table public.ventas
  drop column if exists cupon_codigo,
  drop column if exists descuento_mxn,
  drop column if exists subtotal_mxn;

drop table if exists public.cupones;

-- El enum se queda: lo usan las ofertas.

drop function if exists public.registrar_venta(
  uuid[], metodo_pago, canal_venta, text, text, text, text
);

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
as $funcion$
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

  -- Se cobra el precio con la oferta ya aplicada, no el de lista.
  select coalesce(
           sum(precio_efectivo(m.precio_venta_mxn, m.oferta_tipo, m.oferta_valor, m.oferta_hasta)),
           0
         )
    into v_total
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
  select v_venta_id, u.id,
         precio_efectivo(m.precio_venta_mxn, m.oferta_tipo, m.oferta_valor, m.oferta_hasta)
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
$funcion$;

comment on function public.registrar_venta is
  'Venta completa en una sola transaccion: encabezado, items al precio con oferta aplicada, y las piezas a vendida.';
