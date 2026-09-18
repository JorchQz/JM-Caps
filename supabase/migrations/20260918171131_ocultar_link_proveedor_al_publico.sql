-- El link de Yupoo es la referencia de compra: dice quien es el proveedor y de
-- que pieza exacta se trata. El publico no debe poder leerlo, ni siquiera
-- consultando la tabla directo por la API. Solo se le dejan las columnas que
-- necesita la vista del catalogo.
revoke select on public.modelos from anon;
grant select (id, codigo, categoria, nombre, equipo, color, descripcion,
              precio_venta_mxn, foto_url, activo)
  on public.modelos to anon;
