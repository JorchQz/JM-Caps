-- Antes de que un pedido exista, se arma con el proveedor: que links, cuantas
-- piezas y en que tallas. El proveedor contesta que no siempre hay todo, se
-- ajusta, y hasta que confirma se vuelve un pedido real.
alter type public.estado_lote add value if not exists 'borrador' before 'pedido';
