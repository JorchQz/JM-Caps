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

## Despliegue en Cloudflare

El panel se sirve como sitio estático desde Workers (no Pages: es el camino que
Cloudflare recomienda hoy para esto). Vive en ; el dominio
raíz queda libre para la tienda pública.

La configuración del Worker está en : sirve  y
usa  para que entrar directo a
 o recargar esa página no dé 404.

Proyecto en Cloudflare, conectado al repo de GitHub:

| Campo | Valor |
|---|---|
| Nombre del proyecto |  |
| Comando de compilación |  |
| Implementar comando | 
╭─────────────────────────────────╮
│ Did you mean "wrangler deploy"? │
╰─────────────────────────────────╯

wrangler

COMMANDS
  wrangler docs [search..]        📚 Open Wrangler's command documentation in your browser
  wrangler complete [shell]       ⌨️ Generate and handle shell completions

  wrangler email                  Manage Cloudflare Email services [open beta]

ACCOUNT
  wrangler auth                   🔐 Manage authentication
  wrangler login                  🔓 Login to Cloudflare
  wrangler logout                 🚪 Logout from Cloudflare
  wrangler whoami                 🕵️ Retrieve your user information

COMPUTE & AI
  wrangler agent-memory           🧠 Manage Agent Memory namespaces [private beta]
  wrangler ai                     🤖 Manage AI models
  wrangler ai-search              🔍 Manage AI Search instances [open beta]
  wrangler browser                🌐 Manage Browser Run sessions [open beta]
  wrangler containers             📦 Manage Containers
  wrangler delete [name]          🗑️ Delete a Worker from Cloudflare
  wrangler deploy [path]          🆙 Deploy a Worker to Cloudflare
  wrangler deployments            🚢 List and view the current and past deployments for your Worker
  wrangler dev [script]           👂 Start a local server for developing your Worker
  wrangler dispatch-namespace     🏗️ Manage dispatch namespaces
  wrangler flagship               🚩 Manage Flagship apps and feature flags [open beta]
  wrangler init [name]            📥 Initialize a basic Worker
  wrangler pages                  ⚡️ Configure Cloudflare Pages
  wrangler preview [script]       👀 Create a Preview deployment of the current Worker [open beta]
  wrangler queues                 📬 Manage Workers Queues
  wrangler rollback [version-id]  🔙 Rollback a deployment for a Worker
  wrangler secret                 🤫 Generate a secret that can be referenced in a Worker
  wrangler setup                  🪄 Setup a project to work on Cloudflare
  wrangler tail [worker]          🦚 Start a log tailing session for a Worker
  wrangler triggers               🎯 Updates the triggers of your current deployment [experimental]
  wrangler types [path]           📝 Generate types from your Worker configuration
  wrangler versions               🫧 List, view, upload and deploy Versions of your Worker to Cloudflare
  wrangler vpc                    🌐 Manage VPC [open beta]
  wrangler workflows              🔁 Manage Workflows

STORAGE & DATABASES
  wrangler artifacts              🧱 Manage Artifacts namespaces and repos [private beta]
  wrangler d1                     🗄️ Manage Workers D1 databases
  wrangler hyperdrive             🚀 Manage Hyperdrive databases
  wrangler kv                     🗂️ Manage Workers KV Namespaces
  wrangler pipelines              🚰 Manage Cloudflare Pipelines [open beta]
  wrangler r2                     📦 Manage R2 buckets & objects
  wrangler secrets-store          🔐 Manage the Secrets Store [open beta]
  wrangler vectorize              🧮 Manage Vectorize indexes

NETWORKING & SECURITY
  wrangler cert                   🪪 Manage client mTLS certificates and CA certificate chains used for secured connections [open beta]
  wrangler mtls-certificate       🪪 Manage certificates used for mTLS connections
  wrangler tunnel                 🚇 Manage Cloudflare Tunnels [experimental]
  wrangler turnstile              🛡️ Manage Turnstile widgets [alpha]

GLOBAL FLAGS
  -c, --config          Path to Wrangler configuration file  [string]
      --cwd             Run as if Wrangler was started in the specified directory instead of the current working directory  [string]
  -e, --env             Environment to use for operations, and for selecting .env and .dev.vars files  [string]
      --env-file        Path to an .env file to load - can be specified multiple times - values from earlier files are overridden by values in later files  [array]
  -h, --help            Show help  [boolean]
      --install-skills  Install Cloudflare skills for detected AI coding agents before running the command  [boolean] [default: false]
      --profile         Use a specific auth profile  [string]
  -v, --version         Show version number  [boolean]

Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose |
| Rama de producción |  |

Variables de compilación del proyecto (Settings > Build):  y
. Se necesitan al compilar, no en tiempo de ejecución:
Vite las incrusta en el bundle. Sin ellas el panel despliega pero abre con
error de configuración.

La versión de Node la fija  (22): Vite 7 pide 20.19 o superior y el
entorno de build de Cloudflare no siempre trae una reciente por defecto.

Cada push a  dispara un despliegue.

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
