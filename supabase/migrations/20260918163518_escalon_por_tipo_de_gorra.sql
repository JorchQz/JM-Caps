-- Confirmado con el proveedor: la oferta por volumen es por tipo de gorra, no
-- por diseno. 30 AA repartidas en varios disenos alcanzan el escalon de 30.
-- DH lleva su propia escalera porque es mas cara y mas dificil de fabricar.
update public.configuracion
   set valor = 'categoria',
       descripcion = 'Que cantidad decide el escalon de precio: diseno, categoria o pedido. Confirmado por el proveedor: es por tipo de gorra.',
       actualizado_en = now()
 where clave = 'base_escalon';
