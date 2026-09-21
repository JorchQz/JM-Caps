# Sistema de diseño

Para no volver a decidir lo mismo cada vez que se agrega una pantalla. Si vas a
construir algo nuevo, lee esto antes y reutiliza lo que ya existe.

**Los valores exactos viven en el CSS, no aquí.** Este documento explica las
decisiones y cuándo aplicar cada cosa; los hex y las medidas se leen de:

- Tienda pública: [`apps/tienda/src/estilos.css`](../apps/tienda/src/estilos.css)
- Panel de administración: [`apps/admin/src/styles.css`](../apps/admin/src/styles.css)

Si un valor se copiara aquí, tarde o temprano diría algo distinto al código.

---

## Son dos sistemas distintos, a propósito

No los unifiques.

| | Tienda pública | Panel de administración |
|---|---|---|
| Quién la usa | Clientes, casi siempre en celular con datos | Solo Iván, celular y computadora |
| Ánimo | Claro, de producto, con foto protagonista | Oscuro, denso, de herramienta de trabajo |
| Fondo | Gris jaspeado claro | Casi negro |
| Acento | Cobalto para la acción | Ámbar |
| Tipografía | Archivo, con eje de ancho | La del sistema |
| Prioridad | Que se vea el producto y se entienda rápido | Que quepa mucha información y se capture rápido |

Un panel bonito pero lento de capturar es un mal panel. Una tienda densa pero
completa es una mala tienda. Por eso no comparten estilos.

---

## Tienda pública

### Origen

El diseño salió de Claude Design. El prototipo original está en
[`docs/Claude Design/`](Claude%20Design/) y se puede abrir en el navegador para
comparar. El brief que lo generó está en
[`brief-diseno-tienda.md`](brief-diseno-tienda.md).

### Qué significa cada color

Los nombres de las variables están en español y describen el material, no el
uso, salvo cuando el uso es la regla.

- **`--gris`** es el fondo de la página. Es el gris de la visera interior de
  una gorra. No es blanco a propósito: hace que el producto sobre blanco salte.
- **`--nieve`** es blanco puro y se reserva para las superficies donde vive el
  producto: fotos, tarjetas, formularios.
- **`--tinta`** es el texto y también el fondo de encabezado, pie y
  confirmación. Las zonas oscuras enmarcan; no son decorativas.
- **`--tinta-suave`** es texto secundario. Si algo es importante, no va aquí.
- **`--cobalto`** es **la acción**. Un solo botón cobalto por pantalla: el que
  hace avanzar al cliente. Si hay dos, uno está de más.
- **`--ultima`** es rojo y **solo significa escasez real**: quedan una o dos
  piezas, o un error bloqueante. **Nunca se usa para decorar.** El día que se
  use para adornar, deja de comunicar urgencia y el cliente lo ignora.

### Tipografía

Una sola familia, **Archivo**, aprovechando su eje de ancho variable:

- **Expandida (`font-stretch` 112% a 125%)** para tallas, precios, el conteo de
  stock y los títulos. Es lo que da el aire deportivo.
- **Normal** para texto corrido.
- **`font-variant-numeric: tabular-nums`** en todo número que el ojo compare:
  tallas, precios, conteos, cuenta atrás. Sin eso las cifras bailan.

**La talla es un elemento tipográfico protagónico, no un dato en gris.** En la
cultura fitted la gente se identifica por su número y es lo primero que busca.

### Formas

Radios distintos según jerarquía, no uno solo para todo:

- 999px en chips de filtro
- 10px en tarjetas, botones de talla y el botón principal
- 8px en campos y botones secundarios
- 4px en chips de talla pequeños y la marca de escasez

Las áreas tocables miden mínimo 38px, y 44px o más las importantes. Los botones
de talla son 78×58 porque se tocan con el pulgar y equivocarse cuesta una venta.

### Movimiento

**Regla: el movimiento responde a una acción de la persona.** Nada entra solo
al hacer scroll — se ve genérico y estorba en un celular lento.

Las tres animaciones definidas, y solo esas:

- `jmPulso` — al elegir talla. Confirma la elección más repetida de la tienda.
- `jmEntra` — entrada de tarjetas y de la confirmación.
- `jmBrillo` — el esqueleto mientras carga.

Los botones se hunden un poco al presionarse (`scale(.96)` a `.99`). En celular
no hay hover, así que el estado presionado importa más que el de cursor.

Todo se desactiva con `prefers-reduced-motion`.

### Componentes listos para reutilizar

Antes de escribir CSS nuevo, revisa si ya existe:

| Para | Clases |
|---|---|
| Marco de página | `.encabezado`, `.encabezado-fila`, `.envoltura`, `.pie` |
| Cuadrícula de productos | `.rejilla`, `.tarjeta`, `.tarjeta-cuerpo`, `.tarjeta-nombre`, `.tarjeta-meta`, `.tarjeta-precio` |
| Foto | `.marco-foto`, `.sin-foto`, `.producto-foto` |
| Escasez | `.escasez` |
| Tallas | `.talla-mini`, `.talla-ajustable`, `.talla-boton`, `.selector-tallas`, `.tallas-lista` |
| Filtros | `.filtros`, `.ficha` |
| Formularios | `.formulario`, `.etiqueta`, `.campo`, `.error`, `.boton`, `.motivo` |
| Botones | `.boton`, `.boton-mensaje`, `.boton-whatsapp`, `.boton-fantasma`, `.volver` |
| Mensajes y estados | `.mensaje`, `.mensaje-titulo`, `.mensaje-texto` |
| Esqueleto | `.brillo`, `.esqueleto-titulo`, `.esqueleto-linea` |
| Pantalla de logro | `.confirmacion` y sus hijos, `.cuenta-atras` |
| Menú | `.boton-menu`, `.rayas`, `.menu-panel`, `.menu-pie` |
| Texto largo | `.documento` y sus hijos, vía el componente `Documento` |

El bloque `.mensaje` sirve para los cinco estados vacíos o de error. No hagas
uno nuevo: cambia el título, el texto y el botón.

### Estados que toda pantalla nueva debe cubrir

Es donde una tienda se siente abandonada o cuidada. Ninguna pantalla se da por
terminada sin resolverlos:

1. Cargando, con esqueleto y no con la palabra "cargando"
2. Vacío, explicando qué pasa e invitando a actuar
3. Sin resultados, ofreciendo deshacer el filtro
4. Error de carga, con botón de reintentar
5. Error de acción, mostrando el mensaje que manda la base

### Voz

- Español de México, de tú, directo.
- **La tienda habla en plural de negocio** (nosotros): "te la entregamos", "escríbenos". Los botones, en cambio, hablan como el cliente: "Apartar a mi nombre", "Avísame por WhatsApp".
- Sin coloquialismos ambiguos ni jerga interna. "Ahorita" puede significar ya o al rato, y el cliente no sabe qué es "la caja".
- **Los mensajes de error de la base también los lee el cliente**: la función `apartar_unidad` los escribe en la misma voz.
- **Sin emojis**, en ninguna parte.
- Los errores no piden disculpas ni son vagos: dicen qué pasó y qué hacer.
- Una pantalla vacía es una invitación a actuar, no un lamento.
- El botón dice lo que va a pasar: "Apartar a mi nombre", no "Enviar".
- **Los códigos internos AA, AAS, UU, UUS, K y DH jamás se le muestran al
  cliente.** Se traducen con `TIPOS_CLIENTE` en
  [`apps/tienda/src/lib/catalogo.ts`](../apps/tienda/src/lib/catalogo.ts).

Ejemplos del tono, tomados de la tienda: "Estamos surtiendo", "Esta ya se
apartó", "Alguien se adelantó mientras la veías", "Ajustable, le queda a
todos", "No pagas nada ahora".

### Páginas de texto largo

Los documentos legales y explicativos usan el componente `Documento`, que les
da medida de línea legible y un resumen arriba: casi nadie lee un documento
legal completo, así que la primera línea dice lo que de verdad importa.

Los datos del negocio que aparecen en ellos viven en
[`apps/tienda/src/lib/legales.ts`](../apps/tienda/src/lib/legales.ts), no
repartidos por el texto. Cambiar el correo o el domicilio se hace en un solo
lugar.

### Marca

El logo está en `apps/tienda/public/logo-blanco.svg` para fondos oscuros y
`logo-negro.svg` para claros. Se les quitó el manifiesto C2PA original, que
pesaba 8 KB y no se dibuja.

**Nunca uses logotipos de ligas, equipos o marcas** en la interfaz, ni siquiera
como icono. Los nombres de equipo solo aparecen como texto porque vienen de los
datos. Es una decisión legal, no estética.

---

## Panel de administración

Es una herramienta de trabajo y se diseña como tal: fondo `--fondo` casi negro,
superficies apiladas (`--superficie`, `--superficie-alta`) para separar bloques
sin líneas de más, y `--acento` ámbar solo en la acción principal.

Los colores de estado sí tienen significado fijo: `--exito` para disponible,
`--alerta` para apartado, `--error` para lo destructivo.

Componentes disponibles: `.tarjeta`, `.rejilla`, `.fila`, `.fila-separada`,
`.campo`, `.insignia` (con modificadores por estado), `.aviso`,
`.tabla-contenedor`, `.vacio`, `.tenue`, `.mono`, `.numero`.

Los componentes de React que ya existen están en
[`apps/admin/src/components/ui.tsx`](../apps/admin/src/components/ui.tsx):
`Campo`, `Aviso`, `MensajeError`, `InsigniaEstado`, `Cargando`, `Vacio`,
`EncabezadoPagina`. Úsalos en vez de escribir los tuyos.

Dos detalles con razón de ser: `.hoja-etiquetas` y sus hijos están en
milímetros reales porque se imprimen sobre papel, y el bloque `@media print`
oculta la navegación para que la hoja salga limpia.

---

## Al agregar una pantalla nueva

1. Decide a qué sistema pertenece: tienda o panel. No mezcles.
2. Reutiliza las clases de la tabla de componentes antes de escribir CSS.
3. Si necesitas un color, tómalo de las variables. Si ninguna sirve, es señal
   de que hay que discutirlo, no de agregar un hex suelto.
4. Resuelve los cinco estados de la sección anterior.
5. Móvil primero, probado a 360 px de ancho.
6. Sin emojis, todo en español, y los códigos internos no se le muestran al
   cliente.
