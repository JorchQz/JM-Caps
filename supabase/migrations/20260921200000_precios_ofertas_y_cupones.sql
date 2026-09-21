-- Precios, ofertas y cupones.
--
-- Tres piezas distintas que es facil confundir:
--
--   precio de lista  -> modelos.precio_venta_mxn, lo que vale la gorra.
--   oferta           -> un descuento que vive en el modelo y lo ve el cliente
--                       en la tienda con el precio anterior tachado.
--   cupon            -> un codigo que se aplica al total de una venta. No sale
--                       en la tienda: como no hay pago en linea, el cliente no
--                       puede canjearlo solo. El codigo se da por WhatsApp y se
--                       captura al cobrar.
--
-- La oferta guarda el descuento (porcentaje o monto), no el precio resultante.
-- Asi, si manana sube el precio de lista, la oferta lo sigue en vez de quedarse
-- congelada en una cifra que ya no corresponde.

do $bloque$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_descuento') then
    create type tipo_descuento as enum ('porcentaje', 'monto');
  end if;
end
$bloque$;

-- --------------------------------------------------------------- ofertas

alter table public.modelos
  add column if not exists oferta_tipo tipo_descuento,
  add column if not exists oferta_valor numeric(10, 2),
  add column if not exists oferta_hasta timestamptz,
  add column if not exists oferta_nota text;

alter table public.modelos
  drop constraint if exists modelos_oferta_coherente;

alter table public.modelos
  add constraint modelos_oferta_coherente check (
    (oferta_tipo is null and oferta_valor is null)
    or (
      oferta_tipo is not null
      and oferta_valor is not null
      and oferta_valor > 0
      and (oferta_tipo <> 'porcentaje' or oferta_valor <= 90)
    )
  );

comment on column public.modelos.oferta_valor is
  'Porcentaje (5 = 5% menos) o pesos de descuento, segun oferta_tipo. Null = sin oferta.';

comment on column public.modelos.oferta_hasta is
  'Cuando deja de aplicar la oferta. Null = hasta que se quite a mano.';

-- Una sola definicion del precio que realmente se cobra, para que la tienda, el
-- panel y la venta no puedan calcularlo cada quien por su lado y discrepar.
create or replace function public.precio_efectivo(
  p_precio numeric,
  p_tipo tipo_descuento,
  p_valor numeric,
  p_hasta timestamptz
)
returns numeric
language sql
stable
set search_path = public
as $funcion$
  select case
    when p_tipo is null or p_valor is null or p_valor <= 0 then p_precio
    when p_hasta is not null and p_hasta <= now() then p_precio
    when p_tipo = 'porcentaje' then greatest(round(p_precio * (1 - least(p_valor, 90) / 100)), 1)
    else greatest(round(p_precio - p_valor), 1)
  end;
$funcion$;

comment on function public.precio_efectivo is
  'Precio que se cobra hoy por un modelo: el de lista, o el rebajado si la oferta esta vigente.';

grant execute on function public.precio_efectivo(numeric, tipo_descuento, numeric, timestamptz)
  to anon, authenticated;

-- La tienda necesita los dos precios para poder tachar el anterior.
create or replace view public.catalogo_publico
with (security_invoker = true) as
 SELECT m.id AS modelo_id,
    m.codigo,
    m.categoria,
    m.nombre,
    m.color,
    m.precio_venta_mxn,
    m.foto_url,
    coalesce(
      array_remove(
        array_agg(DISTINCT u.talla) FILTER (WHERE u.estado = 'disponible'::estado_unidad),
        NULL
      ),
      '{}'::text[]
    ) AS tallas_disponibles,
    count(*) FILTER (WHERE u.estado = 'disponible'::estado_unidad) AS stock_disponible,
    m.equipo,
    m.descripcion,
    -- Va al final a proposito: create or replace no deja insertar una columna
    -- en medio de una vista que ya existe.
    public.precio_efectivo(m.precio_venta_mxn, m.oferta_tipo, m.oferta_valor, m.oferta_hasta)
      AS precio_efectivo_mxn
   FROM modelos m
     JOIN unidades u ON u.modelo_id = m.id
  WHERE m.activo = true
  GROUP BY m.id
 HAVING count(*) FILTER (WHERE u.estado = 'disponible'::estado_unidad) > 0;

comment on view public.catalogo_publico is
  'Catalogo que ve el cliente. Solo modelos activos con stock. tallas_disponibles vacio = pieza ajustable. precio_efectivo_mxn ya trae la oferta aplicada.';

-- El publico lee las columnas de la oferta porque sin ellas no puede pintar el
-- precio tachado. No revelan nada del proveedor ni del costo.
grant select (oferta_tipo, oferta_valor, oferta_hasta) on public.modelos to anon;

-- --------------------------------------------------------------- cupones

create table if not exists public.cupones (
  codigo text primary key,
  tipo tipo_descuento not null,
  valor numeric(10, 2) not null check (valor > 0),
  minimo_mxn numeric(10, 2) not null default 0 check (minimo_mxn >= 0),
  usos_maximos integer check (usos_maximos is null or usos_maximos > 0),
  usos integer not null default 0 check (usos >= 0),
  vence date,
  activo boolean not null default true,
  nota text,
  creado_en timestamptz not null default now(),
  constraint cupones_codigo_limpio
    check (codigo = upper(btrim(codigo)) and length(codigo) between 3 and 24),
  constraint cupones_porcentaje_razonable
    check (tipo <> 'porcentaje' or valor <= 90)
);

comment on table public.cupones is
  'Codigos de descuento sobre el total de una venta. Nunca se exponen al publico: se dan por WhatsApp y se capturan al cobrar.';

comment on column public.cupones.usos is
  'Lo incrementa registrar_venta. No se toca a mano.';

alter table public.cupones enable row level security;

drop policy if exists admin_full_access on public.cupones;

create policy admin_full_access on public.cupones
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.cupones to authenticated;
revoke all on public.cupones from anon;

-- ------------------------------------------------- descuento en la venta

alter table public.ventas
  add column if not exists subtotal_mxn numeric(10, 2),
  add column if not exists descuento_mxn numeric(10, 2) not null default 0,
  add column if not exists cupon_codigo text references public.cupones(codigo);

comment on column public.ventas.subtotal_mxn is
  'Suma de las piezas con su oferta aplicada, antes del cupon. total_mxn es lo que de verdad se cobro.';

-- Las ventas viejas no tenian descuento: su subtotal es su total.
update public.ventas set subtotal_mxn = total_mxn where subtotal_mxn is null;

-- ------------------------------------------------------- registrar_venta

drop function if exists public.registrar_venta(uuid[], metodo_pago, canal_venta, text, text, text);

create or replace function public.registrar_venta(
  p_unidad_ids uuid[],
  p_metodo_pago metodo_pago,
  p_canal canal_venta,
  p_cliente_nombre text default null,
  p_cliente_telefono text default null,
  p_notas text default null,
  p_cupon_codigo text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $funcion$
declare
  v_venta_id uuid;
  v_subtotal numeric := 0;
  v_descuento numeric := 0;
  v_conteo integer;
  v_esperado integer := array_length(p_unidad_ids, 1);
  v_codigo text := nullif(upper(btrim(coalesce(p_cupon_codigo, ''))), '');
  v_cupon cupones%rowtype;
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

  select coalesce(
           sum(precio_efectivo(m.precio_venta_mxn, m.oferta_tipo, m.oferta_valor, m.oferta_hasta)),
           0
         )
    into v_subtotal
    from unidades u
    join modelos m on m.id = u.modelo_id
   where u.id = any(p_unidad_ids);

  if v_codigo is not null then
    -- Se bloquea el cupon: dos cobros al mismo tiempo no deben pasarse del
    -- limite de usos.
    select * into v_cupon from cupones where codigo = v_codigo for update;

    if not found then
      raise exception 'No existe el cupon %', v_codigo;
    end if;

    if not v_cupon.activo then
      raise exception 'El cupon % esta desactivado', v_codigo;
    end if;

    if v_cupon.vence is not null and v_cupon.vence < current_date then
      raise exception 'El cupon % vencio el %', v_codigo, v_cupon.vence;
    end if;

    if v_cupon.usos_maximos is not null and v_cupon.usos >= v_cupon.usos_maximos then
      raise exception 'El cupon % ya se uso las % veces permitidas', v_codigo, v_cupon.usos_maximos;
    end if;

    if v_subtotal < v_cupon.minimo_mxn then
      raise exception 'El cupon % pide una compra minima de %', v_codigo, v_cupon.minimo_mxn;
    end if;

    v_descuento := case
      when v_cupon.tipo = 'porcentaje' then round(v_subtotal * v_cupon.valor / 100)
      else v_cupon.valor
    end;

    -- Un cupon puede dejar la venta en cero, nunca en negativo.
    v_descuento := least(v_descuento, v_subtotal);

    update cupones set usos = usos + 1 where codigo = v_codigo;
  end if;

  insert into ventas (
    total_mxn, subtotal_mxn, descuento_mxn, cupon_codigo,
    metodo_pago, canal, cliente_nombre, cliente_telefono, notas
  )
  values (
    v_subtotal - v_descuento, v_subtotal, v_descuento, v_codigo,
    p_metodo_pago, p_canal,
    nullif(btrim(coalesce(p_cliente_nombre, '')), ''),
    nullif(btrim(coalesce(p_cliente_telefono, '')), ''),
    nullif(btrim(coalesce(p_notas, '')), '')
  )
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
  'Venta completa en una sola transaccion: encabezado, items al precio con oferta, cupon validado y contado, y las piezas a vendida.';
