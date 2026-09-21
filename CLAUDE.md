# JM Caps — Contexto del Proyecto

Este archivo le da a Claude Code todo el contexto necesario del negocio y la arquitectura antes de escribir código. Colócalo en la raíz del repositorio como `CLAUDE.md` — Claude Code lo carga automáticamente al iniciar sesión en la carpeta.

## Sobre el negocio

JM Caps es una tienda de gorras (cachuchas) en Colotlán, Jalisco, México, operada por Iván. Sin local comercial físico. Iván también opera JISSEZ (una plataforma EdTech), proyecto completamente separado — no relacionado con JM Caps.

**Modelo anterior (fracasó):** venta por preorden vía Wix, catálogo sincronizado por CSV desde Google Sheets, comprando del catálogo de un proveedor chino vía álbum de Yupoo. Falló porque en un pueblo chico el cliente quiere compra instantánea, no esperar semanas.

**Modelo nuevo:** invertir en stock real por adelantado, vender solo lo que ya se tiene físicamente.

## Mercado y logística

- Mercado inicial: Colotlán y Tepatitlán, Jalisco. Entrega local gratis.
- A Colotlán no llega paquetería directa — los pedidos del proveedor llegan a la dirección de la novia de Iván en Tepatitlán, quien viaja a Colotlán cada 1-2 semanas.
- Envío nacional: fase posterior. Se planea usar la API de Envia.com (ya integrada en otro proyecto de Iván, Paquetería Colotlán). Umbral sugerido de envío gratis: ~999 MXN (2-3 gorras) para no perder margen.

## Proveedor

- Catálogo del proveedor vía álbum de Yupoo (worldcaps.x.yupoo.com).
- Compra mínima: 10 productos por pedido. El proveedor genera un link de pago. Envío desde China.
- Precio en dólares, varía con el tipo de cambio del día del pedido. El panel trae el tipo de cambio de referencia automáticamente (Frankfurter, con ExchangeRate-API de respaldo), pero es interbancario: el banco cobra 2-3% más en una transferencia internacional, así que el valor se puede sobrescribir a mano.
- El link del álbum de cada diseño se conserva como referencia de compra (tabla `catalogo_proveedor` y campo `link_yupoo` en `modelos`, que es obligatorio), nunca se muestra al cliente.

## Categorías de producto (códigos internos)

| Código | Significado |
|---|---|
| AA | Estilo New Era fitted: cerradas, se venden por talla |
| AAS | Estilo New Era snapback: ajustables con broche — mismo precio que AA |
| UU | Calidad 1:1, fitted (mejores materiales, más cara) — pausado por ahora, rotación lenta al inicio |
| UUS | Calidad 1:1, snapback — pausado por ahora |
| K | Niños: llevan talla, en su propia escala más chica que la de adulto |
| DH | Estilo Dandy Hats / streetwear urbano, ajustables — sin logos de ligas deportivas, menor riesgo legal, mejor margen |

**Descontinuados** (no se vuelven a comprar): DE (diseños especiales) y JS (Jon Stan) — nunca se vendieron bien.

## Precios de referencia (venta al público, stock real)

- AA / AAS: 419 MXN
- DH: 799 MXN
- K: 399 MXN
- Costo real aproximado por unidad AA/AAS: ~155-160 MXN (varía con tipo de cambio, envío prorrateado del lote, e impuesto de importación del 33.5% desde China si el valor declarado lo activa)

## Consideraciones legales (México)

Las gorras con logos de ligas deportivas (MLB, etc.) son réplicas — existe riesgo bajo la Ley Federal de Protección a la Propiedad Industrial. El IMPI en la práctica persigue mercados físicos grandes a petición de la marca registrada, no vendedores individuales por WhatsApp/redes, pero el riesgo legal existe. Estrategia: priorizar DH (sin logos de marca) cuando se pueda, mantener perfil bajo, evitar publicidad masiva usando nombres de marcas registradas.

## Flujo de venta

1. Catálogo público en la web: solo muestra productos con stock disponible > 0.
2. Selector de talla en la misma ficha de producto — solo aparecen las tallas realmente disponibles en stock físico (no un catálogo teórico de tallas).
3. **Apartar:** el cliente llena nombre + teléfono → se reserva la unidad por 24h → se genera un mensaje de WhatsApp prellenado para coordinar entrega y pago.
4. El apartado expira solo a las 24h si no se concreta (automatizado con pg_cron en Supabase, cada 15 min).
5. Pago: efectivo, transferencia SPEI o tarjeta con la terminal Mercado Pago Point, contra entrega en persona. **No hay pago en línea todavía.** La terminal se usa por separado: se teclea el monto ahí. Integrarla al panel es posible (API de Point: crear la orden y recibir el webhook) pero exige un backend con el access token guardado como secreto, y no se justifica hasta que el volumen lo pida.
6. **No hay bot de WhatsApp todavía** — la atención personal es la ventaja competitiva en un pueblo chico. Se reconsidera solo si el volumen de mensajes lo justifica.

## Modelo de datos: "modelo" vs "unidad" (clave para entender el esquema)

- Un **modelo** = el producto que ve el cliente = una combinación única de diseño + color + categoría (ej. "Yankees Negro AA"). Tiene un precio, una foto, un código único.
- Una **unidad** = una gorra física real. Cada unidad pertenece a un modelo y tiene su propia talla, costo real, lote de origen y estado.
- **La llave para saber si un modelo ya existe es el link exacto de Yupoo (`modelos.link_yupoo`), NO el nombre, color o diseño.** Puede haber más de una gorra negra de los Dodgers en 7 1/8 que en realidad son productos distintos del proveedor — el link del álbum es lo único que identifica sin ambigüedad de cuál se trata. El campo tiene restricción `UNIQUE` en la base de datos.
- Cuando llega mercancía nueva, el flujo de alta es: pegar/buscar el link exacto de Yupoo de esa pieza →
  - Si ya existe un `modelo` con ese `link_yupoo` → las unidades nuevas se asocian a ESE `modelo_id`, nunca se crea un producto duplicado. Si la talla ya existía, sube la cantidad disponible en esa talla; si es una talla nueva para ese diseño, se agrega como nueva opción en el selector de esa misma tarjeta.
  - Si no existe ningún modelo con ese link → se da de alta un modelo nuevo (nombre, color, categoría, precio, foto), usando ese link como su identificador permanente.
- El panel de admin debe buscar por `link_yupoo` antes de registrar unidades nuevas — no debe dejar que el admin busque por nombre/color, porque ahí es donde se pierde el rastro.

## Flujo de alta de mercancía (se captura al pedir, no al recibir)

1. Se **arma el pedido** en estado `borrador`: link de Yupoo, tipo de gorra, talla y cantidad de cada artículo, que es lo que el proveedor necesita para cotizar. El panel va sumando el costo en dólares con los precios de `precios_proveedor` y lo convierte a pesos con el tipo de cambio que se capture, siempre como aproximado: el costo real en pesos depende del tipo de cambio del día del pago. Se le manda por WhatsApp como PDF con links clicables o como texto. Casi siempre contesta que algo ya no hay: se marca esa línea como no disponible y se ajustan cantidades.
2. Cuando el proveedor confirma, el pedido pasa a `pedido` y **recién entonces** se capturan los productos: tipo de gorra, nombre, equipo (si aplica), color, descripción breve y precio. El panel lista las líneas que faltan por capturar, con su link ya resuelto. Las unidades quedan en estado `pedido`, así que **no aparecen en el catálogo público** pero sí se sabe qué viene en camino.
3. Cuando llega la caja a Tepatitlán se abre la **recepción del lote**: el panel lista lo que se esperaba y se confirma cuántas piezas llegaron realmente de cada modelo y talla. Solo lo confirmado pasa a `disponible`.
4. Lo que no llegó se queda en estado `pedido` como reclamo abierto al proveedor — nunca se da por recibido automáticamente, porque eso pondría a la venta stock inexistente.
5. Al volver a pedir el mismo diseño no se recaptura nada: el link ya existe y las piezas nuevas se suman a ese producto.

## Stack técnico

- **Base de datos y auth:** Supabase, proyecto "Tienda Online JM Caps", en la organización de Supabase **"JM Caps"** (separada de "JM Labs", donde vive JISSEZ — son cuentas/organizaciones distintas, ojo al conectar el MCP de Supabase correcto en cada sesión).
  - URL: `https://ndsnftmzmjsxxjdlwozk.supabase.co`
  - Anon/publishable key (segura para el cliente, protegida por RLS): `sb_publishable_0_6gm4EB_u1vFUmc8GYbsA_Kz9POhjw`
  - La **service role key NUNCA va en este archivo ni en el repo** — si se necesita para alguna tarea de servidor, se maneja como variable de entorno/secreto en Cloudflare, nunca se sube a git.
- **Hosting:** Cloudflare (Pages/Workers)
- **Control de versiones:** GitHub
- **Desarrollo:** VS Code + Claude Code
- **Diseño visual de la tienda pública:** Claude Design — fase posterior, después de tener el panel de admin funcionando y datos reales cargados.

## Esquema de base de datos (ya aplicado en Supabase, no crear de nuevo)

### Tablas

**`modelos`** — el producto visible al cliente
- `id` (uuid, pk), `codigo` (text, unique — lo genera la base, formato `AA-001`), `categoria` (enum: AA/AAS/UU/UUS/K/DH), `nombre` (text), `equipo` (text, null en diseños sin logo), `color` (text), `descripcion` (text), `precio_venta_mxn` (numeric), `foto_url` (text), `link_yupoo` (text, **unique y not null** — es la llave real para saber si un modelo ya existe al dar de alta mercancía nueva), `activo` (boolean)

**`unidades`** — una fila = una gorra física. El `folio` es el valor que va en el QR de la etiqueta y el que se escanea al vender.
- `id` (uuid, pk), `folio` (text, unique — número corto de 6 dígitos, se genera solo), `modelo_id` (fk → modelos), `linea_id` (fk → pedido_lineas, de qué línea del pedido salió), `lote_id` (fk → lotes), `talla` (text, null si es ajustable), `costo_unitario_mxn` (numeric), `estado` (enum: pedido/en_transito/disponible/apartada/vendida), `apartado_hasta` (timestamptz), `apartado_nombre` (text), `apartado_telefono` (text), `foto_real_url` (text — foto de la unidad física real, no la del proveedor), `fecha_alta` (timestamptz), `fecha_venta` (timestamptz)

**`lotes`** — cada pedido al proveedor
- `id` (uuid, pk), `fecha_pedido` (date), `fecha_recepcion` (date), `tipo_cambio_dia` (numeric), `total_usd` (numeric), `costo_envio_mxn` (numeric — para prorratear entre unidades), `estado` (enum: borrador/pedido/en_transito/recibido)

**`pedido_lineas`** — el borrador de lo que se le pide al proveedor. No es inventario: el inventario nace al confirmar.
- `id` (uuid, pk), `lote_id` (fk), `link_yupoo` (text), `categoria` (enum — define el precio de compra), `talla` (text), `cantidad` (int), `precio_usd_unitario` (numeric, null — solo si el proveedor cotizó distinto esa pieza), `estado` (enum: solicitada/confirmada/no_disponible), `nota` (text — para el proveedor), `modelo_id` (fk, se resuelve solo si el link ya existe), `unidades_creadas` (int — avance de captura), `orden` (int)

**`precios_proveedor`** — la escalera de precios de compra. El proveedor cobra por volumen y cada categoría tiene su propia escalera. Gana siempre el escalón más alto que alcanza el pedido. Se edita desde la pantalla del pedido.
- `categoria` + `desde_piezas` (pk compuesta), `precio_usd` (numeric), `actualizado_en` (timestamptz)

Precios vigentes (dados por el proveedor el 18 de septiembre de 2026), en dólares por pieza:

| Categoría | 10+ | 30+ | 50+ | 100+ |
|---|---|---|---|---|
| AA / AAS / K | 8.50 | 8.00 | — | 7.50 |
| DH | 16.00 | — | 15.00 | 14.00 |

UU y UUS no tienen precios: están pausadas.

**`configuracion`** — ajustes del negocio que cambian sin tocar código.
- `clave` (text, pk), `valor` (text), `descripcion` (text)
- `base_escalon`: qué cantidad decide el escalón de precio — `diseno`, `categoria` o `pedido`. **Está en `categoria`, confirmado por el proveedor:** la oferta por volumen aplica por tipo de gorra, así que 30 AA repartidas en varios diseños ya alcanzan el escalón de 30. DH tiene su propia escalera porque es más cara y más difícil de fabricar.

**`ventas`** — encabezado de cada venta
- `id` (uuid, pk), `fecha`, `total_mxn`, `metodo_pago` (enum: efectivo/spei/otro), `canal` (enum: local_colotlan/local_tepatitlan/envio_nacional), `cliente_nombre`, `cliente_telefono`

**`venta_items`** — une ventas con las unidades específicas vendidas
- `id` (uuid, pk), `venta_id` (fk), `unidad_id` (fk, unique — cada unidad se vende una sola vez), `precio_mxn`

**`catalogo_proveedor`** — solo referencia interna de compra, nunca se muestra al cliente
- `id`, `codigo_supplier`, `categoria`, `link_yupoo`, `activo`, `notas`

### Vista pública

**`catalogo_publico`** (creada con `security_invoker = true`, solo columnas seguras) — agrupa unidades disponibles por modelo, calcula `tallas_disponibles` y `stock_disponible`. Es lo único que la tienda pública debe consultar para armar el catálogo.

### Funciones RPC

**`apartar_unidad(p_modelo_id, p_talla, p_nombre, p_telefono)`** — pública. Reserva una unidad disponible de ese modelo/talla, pone `estado = 'apartada'` y `apartado_hasta = now() + 24h`. Es la única forma en que el público puede modificar inventario. `SECURITY DEFINER` intencional.

Las siguientes son solo para el admin (`security invoker`, sujetas a RLS). Existen porque son operaciones de varios pasos: hacerlas con llamadas sueltas desde el navegador puede dejar el inventario inconsistente a media operación.

- **`crear_modelo(p_categoria, p_nombre, p_precio_venta_mxn, p_link_yupoo, p_color, p_foto_url, p_equipo, p_descripcion)`** — da de alta el modelo generando el código consecutivo por categoría sin carrera entre altas simultáneas.
- **`agregar_unidades(p_modelo_id, p_cantidad, p_talla, p_lote_id, p_costo_unitario_mxn, p_linea_id)`** — crea N piezas físicas. El estado inicial sigue al del lote: si el lote está en `pedido`, las piezas nacen en `pedido`. Rechaza lotes en `borrador`: el proveedor todavía no confirma qué va a mandar.
- **`confirmar_pedido(p_lote_id)`** — cierra el borrador: marca como confirmadas las líneas vigentes y pasa el lote a `pedido`.
- **`recibir_lote(p_lote_id, p_fecha, p_unidad_ids)`** — marca el lote recibido y pasa a `disponible` solo las piezas confirmadas. Sin lista, se da por recibido todo.
- **`registrar_venta(p_unidad_ids, p_metodo_pago, p_canal, p_cliente_nombre, p_cliente_telefono, p_notas)`** — venta completa (encabezado, items y cambio de estado). Bloquea las filas antes de cobrar para que dos ventas simultáneas no vendan la misma pieza.

### Automatización

pg_cron corre cada 15 minutos y libera automáticamente las unidades cuyo apartado venció (regresan a `estado = 'disponible'`).

### Seguridad (RLS)

- RLS activo en las 9 tablas.
- Además de RLS hay permisos por columna: el rol `anon` **no** puede leer `modelos.link_yupoo` (revela al proveedor) ni `unidades.folio`, `costo_unitario_mxn` o los datos del apartado. La vista `catalogo_publico` es `security_invoker`, así que depende de esos permisos y no los rodea.
- El público (`anon`) solo puede: leer `catalogo_publico`, leer columnas seguras de `modelos`/`unidades` (sin costos ni datos de apartado) filtradas por `activo`/`disponible`, y ejecutar `apartar_unidad()`.
- Cualquier usuario autenticado (el admin) tiene acceso completo a todo, vía políticas `admin_full_access`. El usuario admin se crea manualmente en Authentication → Users del dashboard de Supabase.
- Bucket de Storage `fotos-productos`: lectura pública, solo un usuario autenticado puede subir/editar/borrar.

## Estado actual del proyecto

1. ✅ Análisis de negocio y mejores prácticas — hecho
2. ✅ Esquema de base de datos en Supabase — hecho (tablas, RLS, vista, funciones, cron, storage)
3. ✅ Panel de administración — hecho, en `apps/admin`: armado del pedido al proveedor (PDF y texto para WhatsApp), captura de productos desde el pedido confirmado, recepción de lote con verificación, inventario con stock por talla, etiquetas QR por pieza, venta por escaneo, apartados y prorrateo de costos.
4. ⏳ Repositorio en GitHub — falta subirlo (el repo local ya existe).
5. ⏳ **Siguiente paso: crear el usuario admin** en Authentication → Users del dashboard (con Auto Confirm activado) y cargar el primer lote real.
6. Después: diseño de la tienda pública con Claude Design, usando datos y fotos reales (no relleno).
7. Conectar ese diseño al backend de Supabase (catálogo, filtros por equipo/categoría/color, selector de talla, apartado).

Pendiente menor: las ocho migraciones originales del esquema están aplicadas en Supabase pero no volcadas al repo. Para traerlas hace falta la contraseña de la base (`npx supabase link` + `npx supabase db pull`).

## Trabajo sin red

El panel se usa entregando gorras en casa del cliente, donde la red de datos falla. Está instalado como PWA: abre sin señal, guarda una copia local del inventario vendible (mostrando de cuándo es) y, si se cobra sin red, la venta se encola en el dispositivo y sube sola al recuperar señal. La base vuelve a validar cada venta encolada, así que si una pieza ya se vendió por otro lado la venta se rechaza y queda marcada con el motivo en vez de duplicarse.

Lo confirmado vive en Supabase, así que un pedido se puede empezar en la computadora y terminar en el celular. Lo único que no cruza de dispositivo es lo que está a medio escribir: el borrador del formulario y el carrito de una venta sin cerrar, que se guardan en el navegador de ese aparato.

## Documentos legales: mantenerlos verdaderos

La tienda tiene aviso de privacidad, términos y condiciones y una página de cómo comprar. Describen reglas que viven en otro lado — el plazo del apartado y el tope por persona los aplica `apartar_unidad` en la base — así que **cambiar una regla sin cambiar el documento hace que el documento le mienta al cliente**, y en un aviso de privacidad eso tiene consecuencias legales.

**Antes de dar por terminado cualquier cambio que toque el apartado, los datos que se recaban, los plazos, el contacto, las zonas de entrega, las formas de pago o las devoluciones, corre:**

```bash
npm run verificar:legales
```

Compara los documentos contra las reglas vigentes en el código y en las migraciones, y falla si dejaron de coincidir. Si el cambio fue de fondo, actualiza también `actualizado` en `apps/tienda/src/lib/legales.ts`: esa fecha se mueve a mano y a propósito, porque debe reflejar una revisión deliberada y no un cambio de formato.

Todo dato o número que aparezca en esos documentos va en `legales.ts`, nunca escrito dentro del texto. Si se escribe en dos lugares, uno de los dos va a quedar obsoleto.

## Diseño

**Antes de construir cualquier pantalla nueva, lee [`docs/sistema-de-diseno.md`](docs/sistema-de-diseno.md).** Ahí está qué colores significan qué, qué componentes ya existen para reutilizar, las reglas de movimiento, la voz de los textos y los estados que toda pantalla debe cubrir. Los valores exactos viven en los CSS de cada app, no duplicados en el documento.

Tienda y panel comparten paleta, tipografía y logo: los tokens viven en `packages/ui` y los importan las dos apps. Lo que cambia entre ellas es la densidad, no el color. El diseño salió de Claude Design y el prototipo original está en `docs/Claude Design/`.

## Preferencias

- Sin emojis en ninguna parte de la interfaz ni del código de cara al usuario.
- Todo el contenido de cara al cliente, en español.
