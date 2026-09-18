# JM Caps

Tienda de gorras en Colotlán, Jalisco. Monorepo con el panel de administración y,
más adelante, la tienda pública. El contexto de negocio completo está en
[CLAUDE.md](CLAUDE.md).

## Estructura

```
apps/admin        Panel de administración (React + Vite + TypeScript)
apps/tienda       Tienda pública que ve el cliente
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
| `npm run dev` | Panel de administración en modo desarrollo (5173) |
| `npm run dev:tienda` | Tienda pública en modo desarrollo (5174) |
| `npm run build:tienda` | Compila la tienda a `apps/tienda/dist` |
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

## Despliegue en Cloudflare

El panel se sirve como sitio estático desde Workers, no desde Pages: es el
camino al que Cloudflare manda los proyectos nuevos. Vive en
`admin.jmcaps.com`; el dominio raíz queda libre para la tienda pública.

El dominio está registrado en Cloudflare, así que la zona ya vive en la misma
cuenta y no hay nameservers externos de por medio.

La configuración del Worker está en `wrangler.jsonc`: sirve `apps/admin/dist` y
usa `not_found_handling: "single-page-application"` para que entrar directo a
`/lotes` o recargar esa página no dé 404.

Proyecto en Cloudflare, conectado al repositorio de GitHub:

| Campo | Valor |
|---|---|
| Nombre del proyecto | `jm-caps` |
| Comando de compilación | `npm run build` |
| Implementar comando | `npx wrangler deploy` |
| Rama de producción | `main` |

Variables de compilación del proyecto: `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`. Se necesitan al compilar, no en tiempo de ejecución,
porque Vite las incrusta en el bundle. Sin ellas el panel despliega pero abre
con error de configuración.

La versión de Node la fija `.nvmrc` (22): Vite 7 pide 20.19 o superior y el
entorno de build de Cloudflare no siempre trae una reciente por defecto.

Cada push a `main` dispara un despliegue.

## Cómo funciona el panel

Un pedido empieza como **borrador**: solo links de Yupoo, tallas y cantidades,
que es lo que el proveedor necesita para cotizar. Se le manda por WhatsApp como
PDF con links clicables o como texto plano. Cuando contesta qué tiene, se marca
lo no disponible, se ajusta y se confirma.

Solo entonces se capturan los productos, con el álbum abierto enfrente y sin
prisa. Las piezas nacen en estado `pedido`, así que no aparecen en el catálogo
público pero sí se sabe qué viene en camino.

La alta arranca siempre por el link del álbum de Yupoo, nunca por nombre o
color. Dos gorras negras del mismo equipo pueden ser productos distintos del
proveedor; el link es lo único que las distingue sin ambigüedad, y por eso
`modelos.link_yupoo` es `UNIQUE` y obligatorio. Si el link ya existe, las
piezas nuevas se suman a ese producto sin recapturar características.

Cuando llega el pedido se abre la recepción del lote y se confirma cuántas
piezas llegaron realmente de cada modelo y talla. Solo lo confirmado pasa a
stock; lo que falta se queda como reclamo al proveedor. El proveedor no siempre
manda lo que se pidió, y dar el lote por recibido en bloque pondría a la venta
gorras que no existen.

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
- `recibir_lote` — recepción con verificación pieza por pieza
- `confirmar_pedido` — cierra el borrador del pedido al proveedor

Las ocho migraciones anteriores (tablas, RLS, vista pública, `apartar_unidad`,
cron de expiración y bucket de fotos) están aplicadas en Supabase pero todavía
no volcadas a este repo. Para traerlas hace falta la contraseña de la base:

```bash
npx supabase link --project-ref ndsnftmzmjsxxjdlwozk
npx supabase db pull
```
