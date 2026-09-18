-- Alta de modelo con codigo consecutivo generado en la base.
-- Calcular el consecutivo en el navegador abre una carrera: dos altas
-- simultaneas leerian el mismo maximo y una chocaria contra modelos_codigo_key.

create or replace function public.crear_modelo(
  p_categoria categoria_cachucha,
  p_nombre text,
  p_precio_venta_mxn numeric,
  p_link_yupoo text,
  p_color text default null,
  p_foto_url text default null
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

  -- Serializa el calculo del consecutivo por categoria.
  perform pg_advisory_xact_lock(hashtext('crear_modelo:' || p_categoria::text));

  select coalesce(max((regexp_replace(codigo, '^.*-', ''))::integer), 0) + 1
    into v_siguiente
    from modelos
   where categoria = p_categoria
     and codigo ~ ('^' || p_categoria::text || '-[0-9]+$');

  v_codigo := p_categoria::text || '-' || lpad(v_siguiente::text, 3, '0');

  insert into modelos (codigo, categoria, nombre, color, precio_venta_mxn, foto_url, link_yupoo, activo)
  values (v_codigo, p_categoria, v_nombre,
          nullif(btrim(coalesce(p_color, '')), ''),
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

revoke all on function public.crear_modelo(categoria_cachucha, text, numeric, text, text, text) from anon;
grant execute on function public.crear_modelo(categoria_cachucha, text, numeric, text, text, text) to authenticated;
