-- Estos mensajes los lee el cliente en la tienda, no el administrador: van en
-- la misma voz que el resto (plural de negocio) y con acentos.

create or replace function public.apartar_unidad(
  p_modelo_id uuid,
  p_talla text,
  p_nombre text,
  p_telefono text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unidad_id uuid;
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_telefono text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_activos integer;
begin
  if v_nombre is null or length(v_nombre) < 2 then
    raise exception 'Escribe tu nombre para saber a quién le guardamos la gorra.';
  end if;

  if length(v_telefono) < 10 then
    raise exception 'El WhatsApp va a 10 dígitos, para poder contactarte.';
  end if;

  -- Un cliente puede apartar varias gorras, pero no vaciar el catalogo.
  select count(*) into v_activos
    from unidades
   where estado = 'apartada'
     and apartado_hasta > now()
     and regexp_replace(coalesce(apartado_telefono, ''), '\D', '', 'g') = v_telefono;

  if v_activos >= 3 then
    raise exception 'Ya tienes 3 gorras apartadas. Escríbenos por WhatsApp para cerrar esas primero.';
  end if;

  select u.id into v_unidad_id
    from unidades u
    join modelos m on m.id = u.modelo_id
   where u.modelo_id = p_modelo_id
     and u.talla is not distinct from p_talla
     and u.estado = 'disponible'
     and m.activo = true
   limit 1
     for update of u skip locked;

  if v_unidad_id is null then
    raise exception 'Alguien se adelantó con esa talla. Elige otra de las disponibles.';
  end if;

  update unidades
     set estado = 'apartada',
         apartado_hasta = now() + interval '24 hours',
         apartado_nombre = v_nombre,
         apartado_telefono = v_telefono,
         updated_at = now()
   where id = v_unidad_id;

  return v_unidad_id;
end;
$$;

comment on function public.apartar_unidad is
  'Unico punto donde el publico modifica inventario. Valida datos y limita a 3 apartados activos por telefono. Los mensajes de error los lee el cliente.';
