-- El link del album es la llave real del modelo: sin el no se sabe de que pieza
-- del proveedor vino el producto ni se puede reordenar. Se vuelve obligatorio.
alter table public.modelos
  alter column link_yupoo set not null;

-- Campos para que el cliente pueda filtrar y para no recapturar caracteristicas
-- cada vez que se vuelve a pedir el mismo diseno.
alter table public.modelos
  add column if not exists equipo text,
  add column if not exists descripcion text;

comment on column public.modelos.equipo is
  'Equipo o franquicia del diseno, cuando aplica. Nulo en streetwear sin logos.';
comment on column public.modelos.descripcion is
  'Descripcion breve de cara al cliente.';

create index if not exists modelos_equipo_idx on public.modelos (equipo) where equipo is not null;

-- La vista publica expone los campos nuevos para los filtros de la tienda.
create or replace view public.catalogo_publico
with (security_invoker = true) as
 SELECT m.id AS modelo_id,
    m.codigo,
    m.categoria,
    m.nombre,
    m.color,
    m.precio_venta_mxn,
    m.foto_url,
    array_agg(DISTINCT u.talla) FILTER (WHERE u.estado = 'disponible'::estado_unidad) AS tallas_disponibles,
    count(*) FILTER (WHERE u.estado = 'disponible'::estado_unidad) AS stock_disponible,
    m.equipo,
    m.descripcion
   FROM modelos m
     JOIN unidades u ON u.modelo_id = m.id
  WHERE m.activo = true
  GROUP BY m.id
 HAVING count(*) FILTER (WHERE u.estado = 'disponible'::estado_unidad) > 0;

-- crear_modelo ahora recibe las caracteristicas descriptivas.
drop function if exists public.crear_modelo(categoria_cachucha, text, numeric, text, text, text);

create or replace function public.crear_modelo(
  p_categoria categoria_cachucha,
  p_nombre text,
  p_precio_venta_mxn numeric,
  p_link_yupoo text,
  p_color text default null,
  p_foto_url text default null,
  p_equipo text default null,
  p_descripcion text default null
)
returns modelos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_link text := nullif(btrim(coalesce(p_link_yupoo, '')), '');
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_siguiente integer;
  v_codigo text;
  v_fila modelos;
begin
  if v_link is null then
    raise exception 'El link de Yupoo es obligatorio: es la llave que identifica al modelo';
  end if;

  if v_nombre is null then
    raise exception 'El nombre del modelo es obligatorio';
  end if;

  if p_precio_venta_mxn is null or p_precio_venta_mxn <= 0 then
    raise exception 'El precio de venta debe ser mayor a cero';
  end if;

  perform pg_advisory_xact_lock(hashtext('crear_modelo:' || p_categoria::text));

  select coalesce(max((regexp_replace(codigo, '^.*-', ''))::integer), 0) + 1
    into v_siguiente
    from modelos
   where categoria = p_categoria
     and codigo ~ ('^' || p_categoria::text || '-[0-9]+$');

  v_codigo := p_categoria::text || '-' || lpad(v_siguiente::text, 3, '0');

  insert into modelos (codigo, categoria, nombre, color, equipo, descripcion,
                       precio_venta_mxn, foto_url, link_yupoo, activo)
  values (v_codigo, p_categoria, v_nombre,
          nullif(btrim(coalesce(p_color, '')), ''),
          nullif(btrim(coalesce(p_equipo, '')), ''),
          nullif(btrim(coalesce(p_descripcion, '')), ''),
          p_precio_venta_mxn,
          nullif(btrim(coalesce(p_foto_url, '')), ''),
          v_link,
          true)
  returning * into v_fila;

  return v_fila;
end;
$$;

comment on function public.crear_modelo is
  'Da de alta un modelo generando su codigo consecutivo por categoria. Solo admin (RLS de modelos).';

revoke all on function public.crear_modelo(categoria_cachucha, text, numeric, text, text, text, text, text) from anon;
grant execute on function public.crear_modelo(categoria_cachucha, text, numeric, text, text, text, text, text) to authenticated;
