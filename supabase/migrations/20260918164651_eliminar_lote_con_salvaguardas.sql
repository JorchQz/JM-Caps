-- Borrar un pedido que no se concreto es normal: se arma, el proveedor no
-- tiene nada, y queda basura. Lo que nunca debe pasar es que borrar un lote se
-- lleve inventario real o historial de ventas, asi que solo se permite cuando
-- ninguna pieza llego a existir fisicamente.

create or replace function public.eliminar_lote(p_lote_id uuid)
returns table (unidades_borradas integer, lineas_borradas integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_unidades integer := 0;
  v_lineas integer := 0;
  v_intocables integer := 0;
  v_detalle text;
begin
  if not exists (select 1 from lotes where id = p_lote_id) then
    raise exception 'El lote indicado no existe';
  end if;

  -- Una pieza disponible, apartada o vendida ya es inventario real: el lote
  -- llego. Borrarlo dejaria stock fantasma o rompereia una venta registrada.
  select count(*),
         string_agg(distinct estado::text, ', ')
    into v_intocables, v_detalle
    from unidades
   where lote_id = p_lote_id
     and estado in ('disponible', 'apartada', 'vendida');

  if v_intocables > 0 then
    raise exception
      'No se puede borrar: el lote tiene % pieza(s) en estado %. Ese lote ya llego, no es un pedido sin completar.',
      v_intocables, v_detalle;
  end if;

  delete from unidades
   where lote_id = p_lote_id
     and estado in ('pedido', 'en_transito');
  get diagnostics v_unidades = row_count;

  select count(*) into v_lineas from pedido_lineas where lote_id = p_lote_id;

  -- Las lineas del pedido se van en cascada con el lote.
  delete from lotes where id = p_lote_id;

  unidades_borradas := v_unidades;
  lineas_borradas := v_lineas;
  return next;
end;
$$;

comment on function public.eliminar_lote is
  'Borra un pedido no concretado con sus lineas y piezas pendientes. Rechaza lotes con inventario real.';

revoke all on function public.eliminar_lote(uuid) from anon;
grant execute on function public.eliminar_lote(uuid) to authenticated;
