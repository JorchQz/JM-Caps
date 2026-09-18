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
- Precio en dólares, varía con el tipo de cambio del día del pedido.
- El link del álbum de cada diseño se conserva como referencia de compra (tabla `catalogo_proveedor` y campo `link_proveedor_referencia` en `modelos`), nunca se muestra al cliente.

## Categorías de producto (códigos internos)

| Código | Significado |
|---|---|
| AA | Calidad AA, fitted (ajuste cerrado) |
| AAS | Calidad AA, snapback (ajustable) — mismo precio que AA |
| UU | Calidad 1:1, fitted (mejores materiales, más cara) — pausado por ahora, rotación lenta al inicio |
| UUS | Calidad 1:1, snapback — pausado por ahora |
| K | Niños |
| DH | Estilo Dandy Hats / streetwear urbano — sin logos de ligas deportivas, menor riesgo legal, mejor margen |

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
5. Pago: efectivo o transferencia SPEI, contra entrega en persona. **No hay pago en línea todavía.**
6. **No hay bot de WhatsApp todavía** — la atención personal es la ventaja competitiva en un pueblo chico. Se reconsidera solo si el volumen de mensajes lo justifica.

## Modelo de datos: "modelo" vs "unidad" (clave para entender el esquema)

- Un **modelo** = el producto que ve el cliente = una combinación única de diseño + color + categoría (ej. "Yankees Negro AA"). Tiene un precio, una foto, un código único.
- Una **unidad** = una gorra física real. Cada unidad pertenece a un modelo y tiene su propia talla, costo real, lote de origen y estado.
- **La llave para saber si un modelo ya existe es el link exacto de Yupoo (`modelos.link_yupoo`), NO el nombre, color o diseño.** Puede haber más de una gorra negra de los Dodgers en 7 1/8 que en realidad son productos distintos del proveedor — el link del álbum es lo único que identifica sin ambigüedad de cuál se trata. El campo tiene restricción `UNIQUE` en la base de datos.
- Cuando llega mercancía nueva, el flujo de alta es: pegar/buscar el link exacto de Yupoo de esa pieza →
  - Si ya existe un `modelo` con ese `link_yupoo` → las unidades nuevas se asocian a ESE `modelo_id`, nunca se crea un producto duplicado. Si la talla ya existía, sube la cantidad disponible en esa talla; si es una talla nueva para ese diseño, se agrega como nueva opción en el selector de esa misma tarjeta.
  - Si no existe ningún modelo con ese link → se da de alta un modelo nuevo (nombre, color, categoría, precio, foto), usando ese link como su identificador permanente.
- El panel de admin debe buscar por `link_yupoo` antes de registrar unidades nuevas — no debe dejar que el admin busque por nombre/color, porque ahí es donde se pierde el rastro.

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
- `id` (uuid, pk), `codigo` (text, unique), `categoria` (enum: AA/AAS/UU/UUS/K/DH), `nombre` (text), `color` (text), `precio_venta_mxn` (numeric), `foto_url` (text), `link_yupoo` (text, **unique** — es la llave real para saber si un modelo ya existe al dar de alta mercancía nueva), `activo` (boolean)

**`unidades`** — una fila = una gorra física. El `id` es el valor que va en el código de barras/QR.
- `id` (uuid, pk), `modelo_id` (fk → modelos), `lote_id` (fk → lotes), `talla` (text, null si es ajustable), `costo_unitario_mxn` (numeric), `estado` (enum: pedido/en_transito/disponible/apartada/vendida), `apartado_hasta` (timestamptz), `apartado_nombre` (text), `apartado_telefono` (text), `foto_real_url` (text — foto de la unidad física real, no la del proveedor), `fecha_alta` (timestamptz), `fecha_venta` (timestamptz)

**`lotes`** — cada pedido al proveedor
- `id` (uuid, pk), `fecha_pedido` (date), `fecha_recepcion` (date), `tipo_cambio_dia` (numeric), `total_usd` (numeric), `costo_envio_mxn` (numeric — para prorratear entre unidades), `estado` (enum: pedido/en_transito/recibido)

**`ventas`** — encabezado de cada venta
- `id` (uuid, pk), `fecha`, `total_mxn`, `metodo_pago` (enum: efectivo/spei/otro), `canal` (enum: local_colotlan/local_tepatitlan/envio_nacional), `cliente_nombre`, `cliente_telefono`

**`venta_items`** — une ventas con las unidades específicas vendidas
- `id` (uuid, pk), `venta_id` (fk), `unidad_id` (fk, unique — cada unidad se vende una sola vez), `precio_mxn`

**`catalogo_proveedor`** — solo referencia interna de compra, nunca se muestra al cliente
- `id`, `codigo_supplier`, `categoria`, `link_yupoo`, `activo`, `notas`

### Vista pública

**`catalogo_publico`** (creada con `security_invoker = true`, solo columnas seguras) — agrupa unidades disponibles por modelo, calcula `tallas_disponibles` y `stock_disponible`. Es lo único que la tienda pública debe consultar para armar el catálogo.

### Función RPC pública

**`apartar_unidad(p_modelo_id, p_talla, p_nombre, p_telefono)`** — reserva una unidad disponible de ese modelo/talla, pone `estado = 'apartada'` y `apartado_hasta = now() + 24h`. Es la única forma en que el público puede modificar inventario. `SECURITY DEFINER` intencional.

### Automatización

pg_cron corre cada 15 minutos y libera automáticamente las unidades cuyo apartado venció (regresan a `estado = 'disponible'`).

### Seguridad (RLS)

- RLS activo en las 6 tablas.
- El público (`anon`) solo puede: leer `catalogo_publico`, leer columnas seguras de `modelos`/`unidades` (sin costos ni datos de apartado) filtradas por `activo`/`disponible`, y ejecutar `apartar_unidad()`.
- Cualquier usuario autenticado (el admin) tiene acceso completo a todo, vía políticas `admin_full_access`. El usuario admin se crea manualmente en Authentication → Users del dashboard de Supabase.
- Bucket de Storage `fotos-productos`: lectura pública, solo un usuario autenticado puede subir/editar/borrar.

## Estado actual del proyecto

1. ✅ Análisis de negocio y mejores prácticas — hecho
2. ✅ Esquema de base de datos en Supabase — hecho (tablas, RLS, vista, función, cron, storage)
3. ⏳ Repositorio en GitHub — en proceso
4. ⏳ **Panel de administración — siguiente paso.** Debe permitir: dar de alta lotes, dar de alta unidades nuevas buscando primero por `link_yupoo` si el modelo ya existe (no por nombre/color — ahí se pierde el rastro), generar/vincular código de barras por unidad, subir fotos reales, marcar ventas, ver apartados activos y su vencimiento.
5. Después del panel: cargar el primer lote real de inventario.
6. Después: diseño de la tienda pública con Claude Design, usando datos y fotos reales (no relleno).
7. Conectar ese diseño al backend de Supabase (catálogo, selector de talla, apartado).

## Preferencias

- Sin emojis en ninguna parte de la interfaz ni del código de cara al usuario.
- Todo el contenido de cara al cliente, en español.
