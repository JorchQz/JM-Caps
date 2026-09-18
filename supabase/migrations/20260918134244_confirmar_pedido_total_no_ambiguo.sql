-- Correccion: total_usd es a la vez parametro de salida de la funcion y
-- columna de lotes, asi que dentro del UPDATE hay que calificar la columna.

create or replace function public.confirmar_pedido(p_lote_id uuid)
returns table (confirmadas integer, descartadas integer, piezas integer, total_usd numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_confirmadas integer := 0;
  v_descartadas integer := 0;
  v_piezas integer := 0;
  v_total numeric := 0;
begin
  if not exists (select 1 from lotes where id = p_lote_id) then
    raise exception 'El lote indicado no existe';
  end if;

  update pedido_lineas
     set estado = 'confirmada'
   where lote_id = p_lote_id
     and estado = 'solicitada';

  select count(*) filter (where l.estado = 'confirmada'),
         count(*) filter (where l.estado = 'no_disponible'),
         coalesce(sum(l.cantidad) filter (where l.estado = 'confirmada'), 0),
         coalesce(sum(l.cantidad * coalesce(l.precio_usd_unitario, p.precio_usd))
                  filter (where l.estado = 'confirmada'), 0)
    into v_confirmadas, v_descartadas, v_piezas, v_total
    from pedido_lineas l
    left join precios_proveedor p on p.categoria = l.categoria
   where l.lote_id = p_lote_id;

  if v_confirmadas = 0 then
    raise exception 'El pedido no tiene ninguna linea confirmada';
  end if;

  update lotes
     set estado = case when lotes.estado = 'borrador' then 'pedido'::estado_lote else lotes.estado end,
         total_usd = case when v_total > 0 then v_total else lotes.total_usd end
   where lotes.id = p_lote_id;

  confirmadas := v_confirmadas;
  descartadas := v_descartadas;
  piezas := v_piezas;
  total_usd := v_total;
  return next;
end;
$$;

comment on function public.confirmar_pedido is
  'Cierra el borrador: confirma lineas, pasa el lote a pedido y guarda el total en dolares.';

revoke all on function public.confirmar_pedido(uuid) from anon;
grant execute on function public.confirmar_pedido(uuid) to authenticated;
