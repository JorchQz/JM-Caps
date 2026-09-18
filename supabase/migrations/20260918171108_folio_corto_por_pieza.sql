-- El codigo de barras guardaba el uuid de la pieza: 36 caracteres que hacen un
-- QR denso, dificil de escanear chico y imposible de teclear si la etiqueta se
-- maltrata. Un folio corto resuelve las dos cosas: QR mas simple y un numero
-- que se puede dictar por telefono o capturar a mano.

create sequence if not exists public.unidades_folio_seq start 1;

alter table public.unidades
  add column if not exists folio text;

update public.unidades
   set folio = lpad(nextval('public.unidades_folio_seq')::text, 6, '0')
 where folio is null;

alter table public.unidades
  alter column folio set default lpad(nextval('public.unidades_folio_seq')::text, 6, '0');

alter table public.unidades
  alter column folio set not null;

create unique index if not exists unidades_folio_idx on public.unidades (folio);

comment on column public.unidades.folio is
  'Numero corto impreso en la etiqueta. Es lo que va en el QR y lo que se escanea al vender.';

-- El publico no debe poder recorrer el inventario por folio.
revoke select on public.unidades from anon;
grant select (id, modelo_id, talla, estado) on public.unidades to anon;
