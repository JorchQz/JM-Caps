# JM Caps

Tienda de gorras en Colotlán, Jalisco. Monorepo con el panel de administración y,
más adelante, la tienda pública. El contexto de negocio completo está en
[CLAUDE.md](CLAUDE.md).

## Estructura

```
apps/admin        Panel de administración (React + Vite + TypeScript)
packages/db       Cliente de Supabase, tipos generados y reglas de dominio
supabase/         Migraciones SQL aplicadas al proyecto
```

## Puesta en marcha

```bash
npm install
cp apps/admin/.env.example apps/admin/.env
npm run dev
```

El panel queda en http://localhost:5173. Para entrar hace falta un usuario en
Authentication > Users del dashboard de Supabase; no hay registro público a
propósito, el panel es solo para el administrador.

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Panel de administración en modo desarrollo |
| `npm run build` | Compila el panel a `apps/admin/dist` |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run gen:types` | Regenera `packages/db/src/types.ts` desde Supabase |

## Variables de entorno

Solo dos, ambas públicas por diseño: toda la protección real está en las
políticas RLS de la base.

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

La service role key no va en el repo ni en el cliente. Si alguna tarea de
servidor llega a necesitarla, se registra como secreto en Cloudflare.

## Despliegue en Cloudflare Pages

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `apps/admin/dist`
- Variables de entorno: las dos de arriba
- `apps/admin/public/_redirects` ya manda todas las rutas a `index.html`, que es
  lo que necesita una SPA con rutas del lado del cliente.

## Cómo funciona el panel

**Recibir mercancía** es el flujo central y arranca siempre por el link del
álbum de Yupoo, nunca por nombre o color. Dos gorras negras del mismo equipo
pueden ser productos distintos del proveedor; el link es lo único que las
distingue sin ambigüedad, y por eso `modelos.link_yupoo` tiene restricción
`UNIQUE`. Si el link ya existe, las piezas nuevas se suman a ese modelo; si no,
se da de alta un modelo nuevo con ese link como identificador permanente.

Un **modelo** es el producto que ve el cliente. Una **unidad** es una gorra
física concreta, con su talla, su costo y su estado. El identificador de la
unidad es lo que va en la etiqueta QR y lo que se escanea al cobrar, para que
nunca se descuente la talla equivocada del inventario.

## Base de datos

El esquema vive en el proyecto de Supabase "Tienda Online JM Caps"
(organización JM Caps). Las migraciones de este repo cubren las funciones que
usa el panel:

- `crear_modelo` — alta de modelo generando el código consecutivo por categoría
- `agregar_unidades` — alta de N piezas físicas en una sola transacción
- `registrar_venta` — venta completa (encabezado, items y cambio de estado)

Las ocho migraciones anteriores (tablas, RLS, vista pública, `apartar_unidad`,
cron de expiración y bucket de fotos) están aplicadas en Supabase pero todavía
no volcadas a este repo. Para traerlas hace falta la contraseña de la base:

```bash
npx supabase link --project-ref ndsnftmzmjsxxjdlwozk
npx supabase db pull
```
