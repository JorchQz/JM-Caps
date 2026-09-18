-- Las piezas ajustables no tienen talla, y array_agg metia un NULL dentro del
-- arreglo: la tienda pintaria un selector con una opcion en blanco. Ahora un
-- modelo ajustable devuelve lista vacia, que es la senal de "no lleva talla".

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
    m.descripcion
   FROM modelos m
     JOIN unidades u ON u.modelo_id = m.id
  WHERE m.activo = true
  GROUP BY m.id
 HAVING count(*) FILTER (WHERE u.estado = 'disponible'::estado_unidad) > 0;

comment on view public.catalogo_publico is
  'Catalogo que ve el cliente. Solo modelos activos con stock. tallas_disponibles vacio = pieza ajustable.';
