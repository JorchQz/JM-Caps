-- Se cobra con terminal Mercado Pago, y registrarlo como "otro" pierde el dato
-- que mas importa: la tarjeta cobra comision y el efectivo no, asi que el
-- margen real de una venta depende de como se pago.
alter type public.metodo_pago add value if not exists 'tarjeta' after 'spei';
