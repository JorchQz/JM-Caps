-- Recepcion de lote con verificacion pieza por pieza.
-- El proveedor no siempre manda lo que se pidio: marcar el lote como recibido
-- sin confirmar que llego cada pieza pondria stock inexistente a la venta.
-- Lo que no llego se queda en estado 'pedido' como reclamo pendiente.

create or replace function public.recibir_lote(
  p_lote_id uuid,
  p_fecha date default current_date,
  p_unidad_ids uuid[] default null
)
returns table (recibidas integer, faltantes integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recibidas integer := 0;
  v_faltantes integer := 0;
begin
  if not exists (select 1 from lotes where id = p_lote_id) then
    raise exception 'El lote indicado no existe';
  end if;

  update unidades
     set estado = 'disponible',
         fecha_alta = now()
   where lote_id = p_lote_id
     and estado in ('pedido', 'en_transito')
     and (p_unidad_ids is null or id = any(p_unidad_ids));

  get diagnostics v_recibidas = row_count;

  select count(*) into v_faltantes
    from unidades
   where lote_id = p_lote_id
     and estado in ('pedido', 'en_transito');

  update lotes
     set estado = 'recibido',
         fecha_recepcion = p_fecha
   where id = p_lote_id;

  return query select v_recibidas, v_faltantes;
end;
$$;

comment on function public.recibir_lote is
  'Marca un lote como recibido y pasa a disponible solo las piezas confirmadas. Solo admin (RLS).';

revoke all on function public.recibir_lote(uuid, date, uuid[]) from anon;
grant execute on function public.recibir_lote(uuid, date, uuid[]) to authenticated;
