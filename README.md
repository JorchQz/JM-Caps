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

El panel vive en `admin.jmcaps.com.mx`. El dominio raíz queda libre para la
tienda pública.

Configuración del proyecto de Pages (Workers & Pages > Create application >
Pages > Connect to Git, repositorio `JorchQz/JM-Caps`):

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `apps/admin/dist` |
| Root directory | vacío (la raíz del repo) |

Variables de entorno del proyecto: `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`, las dos de arriba. Sin ellas el panel compila pero
arranca con error de configuración.

La versión de Node la fija `.nvmrc` (22): Vite 7 pide 20.19 o superior y el
entorno de build de Cloudflare no siempre trae una reciente por defecto.

`apps/admin/public/_redirects` manda todas las rutas a `index.html`, que es lo
que necesita una SPA con rutas del lado del cliente. Sin eso, entrar directo a
`/lotes` o recargar esa página da 404.

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
