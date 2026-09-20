# Brief de diseño — Tienda pública JM Caps

Documento para entregar a Claude Design. Contiene todo lo necesario para diseñar
la tienda completa: contexto, audiencia, pantallas, datos reales disponibles,
estados, componentes reutilizables y restricciones técnicas.

El código que resulte se va a integrar en una aplicación React + TypeScript que
ya existe y ya funciona. La libertad creativa es total en lo visual. Lo que no
es negociable son las reglas de datos y de contenido, marcadas como **Regla**.

---

## 1. El negocio

JM Caps vende gorras en Colotlán, Jalisco, México. Es un negocio de una sola
persona, sin local comercial. No hay tienda física que visitar: el cliente
aparta por la web y la entrega es en mano.

**El modelo anterior fracasó y eso define todo el diseño.** Antes se vendía por
preorden: el cliente pedía, se compraba a China, y llegaba en semanas. En un
pueblo chico eso no funciona, la gente quiere la gorra ya. Ahora se invierte en
inventario real por adelantado y **solo se vende lo que está físicamente en
mano**.

Por eso la promesa central no es "mira nuestro catálogo" sino **"esto está aquí,
hoy, y se puede acabar"**. El diseño tiene que transmitir disponibilidad
inmediata y escasez real, nunca la sensación de un catálogo infinito.

### Cómo se cierra una venta

1. El cliente ve el catálogo en su celular.
2. Elige una gorra y su talla.
3. Deja nombre y WhatsApp, y la aparta **24 horas**.
4. Se abre WhatsApp con un mensaje ya escrito para coordinar entrega.
5. El dueño la lleva al punto acordado o al domicilio y cobra ahí mismo:
   efectivo, transferencia o tarjeta con terminal.

**No hay pago en línea. No hay carrito de varias piezas. No hay cuentas de
usuario. No hay envíos todavía** (eso viene en una fase posterior).

---

## 2. Quién la va a usar

Gente joven, aproximadamente de 15 a 30 años, en Colotlán y Tepatitlán. Cultura
de gorras: fitted, snapback, streetwear. Muchos conocen bien el producto y
saben su talla de memoria.

**Casi todos entran desde el celular, con datos móviles que a veces van lentos.**
El diseño es móvil primero, de verdad, no un escritorio encogido. Que cargue
rápido importa más que cualquier efecto.

### Qué busca esa persona, en orden

1. Ver rápido qué hay disponible hoy.
2. Encontrar **su talla**. En la cultura fitted la gente se identifica por su
   número: "soy 7 1/4". Es el primer filtro mental que aplican.
3. Ver cuánto cuesta.
4. Apartarla antes de que alguien más lo haga.

---

## 3. Los datos reales disponibles

**Regla: no inventes campos.** Si un dato no está en esta lista, no existe y no
se puede diseñar alrededor de él. Esto es lo que devuelve la base por cada
producto del catálogo:

| Campo | Tipo | Notas |
|---|---|---|
| `modelo_id` | texto (uuid) | Identificador, va en la URL |
| `nombre` | texto | Nombre comercial. Ejemplo: "Yankees clásica" |
| `equipo` | texto o nulo | Ejemplo: "Yankees". Nulo en streetwear sin logos |
| `color` | texto o nulo | Ejemplo: "Negro" |
| `descripcion` | texto o nulo | Una o dos líneas. A menudo estará vacío |
| `categoria` | AA, AAS, UU, UUS, K o DH | **Código interno, ver regla abajo** |
| `precio_venta_mxn` | número | Precio en pesos. 419, 799, 399 son los típicos |
| `foto_url` | texto o nulo | **Una sola foto por producto**, cuadrada |
| `tallas_disponibles` | lista de textos | Puede venir vacía, ver abajo |
| `stock_disponible` | número | Piezas físicas disponibles ahora mismo |

### Reglas sobre estos datos

**Regla: los códigos de categoría nunca se le muestran al cliente.** AA, AAS,
DH no significan nada para él, son códigos del proveedor. Se traducen así:

- AA y UU → "Cerrada, con talla"
- AAS y UUS → "Ajustable"
- K → "Niños"
- DH → "Streetwear"

**Regla: `tallas_disponibles` vacía significa que la gorra es ajustable**, no
que se agotó. Una gorra ajustable no lleva talla y no debe mostrar selector de
tallas; en su lugar se le dice al cliente que le queda a todos.

**Regla: solo aparecen productos con stock real mayor a cero.** Un producto
agotado desaparece del catálogo por completo. No existe "agotado" como estado
visible, no hay que diseñar esa tarjeta.

**Regla: las tallas que se muestran son las que hay físicamente.** Si de un
modelo solo queda la 7 1/4, esa es la única que se ve. Nunca un catálogo
teórico de tallas con unas deshabilitadas.

**Regla: `descripcion`, `equipo`, `color` y `foto_url` pueden venir vacíos.**
El diseño tiene que verse bien sin ellos, no solo con el caso ideal lleno.

### Escalas de talla

Adulto: 7, 7 1/8, 7 1/4, 7 3/8, 7 1/2, 7 5/8, 7 3/4, 7 7/8, 8
Niño: 6, 6 1/8, 6 1/4, 6 3/8, 6 1/2, 6 5/8, 6 3/4, 6 7/8

Se escriben con fracciones, como texto. Al mostrarlas hay que ordenarlas por
valor numérico, no alfabéticamente.

### Ejemplo de datos reales

```json
[
  {
    "modelo_id": "a3f2...",
    "nombre": "Yankees clásica",
    "equipo": "Yankees",
    "color": "Negro",
    "descripcion": "Bordado frontal, visera plana.",
    "categoria": "AA",
    "precio_venta_mxn": 419,
    "foto_url": "https://.../yankees-negra.webp",
    "tallas_disponibles": ["7 1/4", "7 3/8"],
    "stock_disponible": 3
  },
  {
    "modelo_id": "b7c1...",
    "nombre": "Café streetwear",
    "equipo": null,
    "color": "Café",
    "descripcion": null,
    "categoria": "DH",
    "precio_venta_mxn": 799,
    "foto_url": null,
    "tallas_disponibles": [],
    "stock_disponible": 1
  }
]
```

El catálogo completo va a tener entre 10 y 60 productos. No hay paginación
todavía; caben todos en una pantalla con scroll.

---

## 4. Las pantallas

Son **dos rutas** y varios estados dentro de ellas. No hay más páginas.

### 4.1 Catálogo (`/`) — la portada

Es donde cae todo el mundo. Tiene que responder "qué hay hoy" en tres segundos.

**Contiene, en orden:**

1. **Encabezado** con el nombre de la marca y la zona de entrega. Se queda fijo
   al hacer scroll.
2. **Portada breve**. Lo más característico de este negocio es el inventario
   real, así que aquí va un dato vivo: cuántas gorras hay disponibles hoy, y una
   línea corta explicando que la entrega es el mismo día. No es un banner
   publicitario ni un carrusel: no hay fotos de estilo de vida ni modelos, solo
   producto sobre fondo blanco.
3. **Filtros**. Por tipo, por talla y por equipo. Se arman con lo que
   existe: si nadie tiene talla 8, esa opción no aparece. Deben poder
   combinarse y quitarse fácil. En celular caben en un carril horizontal.
4. **Cuadrícula de productos**. Dos columnas en celular, tres o cuatro en
   pantallas grandes.

**Cada tarjeta muestra:** foto, nombre, color, precio, y las tallas disponibles.
Las tallas son lo que más rápido tiene que poder escanear el ojo.

**Marca de escasez:** cuando quedan una o dos piezas se señala. Es dato real,
no urgencia inventada, así que debe verse creíble y no estridente.

### 4.2 Ficha de producto (`/gorra/:id`)

**Contiene:** foto grande, nombre, equipo, color, tipo traducido, precio,
descripción si existe, selector de talla, y el formulario para apartar.

El **selector de talla** es el momento decisivo de la pantalla. Botones grandes,
cómodos para el pulgar, con el número bien legible. Si solo hay una talla
disponible, conviene que venga ya seleccionada. Si la gorra es ajustable, no
hay selector.

El **formulario de apartado** pide solo nombre y WhatsApp. Nada más. Tiene que
quedar clarísimo que **no se paga nada en ese momento**: mucha gente abandona
por miedo a que le cobren en línea.

El botón principal no puede activarse si falta elegir talla, y debe decir por
qué en vez de quedarse muerto.

### 4.3 Confirmación de apartado

Reemplaza la ficha cuando el apartado se logra. Es el momento más importante de
toda la tienda y merece el mejor tratamiento.

**Tiene que comunicar tres cosas:**

1. La gorra ya es suya, a su nombre.
2. Tiene **24 horas**. Si no escribe, vuelve al catálogo automáticamente.
3. El siguiente paso es escribir por WhatsApp, y hay un botón que lo hace.

El botón de WhatsApp es la acción principal de esta pantalla. Debe sentirse
como el cierre natural, no como una opción entre varias.

### 4.4 Estados que hay que diseñar

No son páginas pero se ven igual de seguido, y son donde una tienda se siente
abandonada o cuidada:

| Estado | Cuándo aparece | Qué debe lograr |
|---|---|---|
| Cargando catálogo | Primera carga | Que no se sienta roto. Considera esqueletos de tarjeta |
| Catálogo vacío | No hay stock de nada | Explicar que se está surtiendo, invitar a volver. No es un error |
| Sin resultados | Los filtros no coinciden | Ofrecer quitar filtros. Nunca dejar la pantalla en blanco |
| Error de carga | Falla la red | Decir qué pasó y cómo reintentar. Sin tecnicismos |
| Producto no encontrado | La gorra se vendió mientras la veía | Muy importante: pasa de verdad. Explicar sin culpar y llevar al catálogo |
| Error al apartar | Alguien se adelantó, o datos inválidos | El mensaje viene de la base ya escrito en español, hay que darle lugar visible |

**Regla: los errores no piden disculpas ni son vagos.** Dicen qué pasó y qué
hacer. Una pantalla vacía es una invitación a actuar, no un lamento.

### 4.5 Pie de página

Zona de entrega, formas de pago aceptadas, y un enlace para escribir por
WhatsApp con dudas. Nada de menús largos ni enlaces inventados: no hay más
páginas que estas.

---

## 5. Componentes que se repiten

Conviene diseñarlos una vez y reutilizarlos. Son los que voy a extraer del
código que entregues:

- **Tarjeta de producto** — la unidad de la cuadrícula.
- **Chip de talla** — en dos tamaños: chico informativo en la tarjeta, grande y
  pulsable en la ficha.
- **Chip de filtro** — con estado activo e inactivo claramente distintos.
- **Botón principal** — la acción de apartar y la de WhatsApp.
- **Campo de formulario** — etiqueta, campo y error.
- **Bloque de mensaje** — sirve para vacío, error y aviso.
- **Marca de escasez** — la señal de últimas piezas.
- **Contenedor de foto** — con su versión sin foto, que se va a ver seguido al
  principio.

---

## 6. Movimiento y transiciones

**Regla: el movimiento responde a una acción de la persona, no ocurre solo.**
Nada de entradas con desvanecido en cada sección al hacer scroll: eso se ve
genérico y además estorba en un celular lento.

Dónde sí vale la pena:

- **Seleccionar una talla**: debe sentirse firme e inmediato. Es la
  microinteracción más repetida de la tienda.
- **Aplicar o quitar un filtro**: el cambio de la cuadrícula debe ser legible,
  que se entienda que la lista cambió y no que se rompió.
- **Confirmar el apartado**: el único momento que merece una transición
  orquestada, porque es el logro del cliente.
- **Presionar botones**: respuesta táctil clara. En celular no hay hover, así
  que el estado presionado importa más que el de paso de cursor.

**Regla: respeta `prefers-reduced-motion`.** Toda animación debe poder
desactivarse.

---

## 7. El diseño actual, como punto de partida

Ya existe una versión funcional. **No estás obligado a conservarla**: si tienes
una dirección mejor, tómala. Se incluye para que sepas de dónde se parte y qué
decisiones ya se pensaron.

### Paleta actual

```
--gris:        #DCDAD5   fondo, el gris de la visera interior de una gorra
--gris-hondo:  #C9C6C0   bordes suaves, estados desactivados
--tinta:       #16181A   texto y superficies oscuras
--tinta-suave: #5C6066   texto secundario
--nieve:       #FFFFFF   fondo de las fotos, tarjetas
--cobalto:     #1F44D8   acción principal
--ultima:      #C5301F   solo para últimas piezas
--borde:       #B9B6AF
```

La idea: el fondo gris jaspeado evoca el interior de una gorra y hace que el
producto sobre blanco salte. El rojo está reservado exclusivamente para la
escasez real; si se usara para decorar perdería significado.

### Tipografía actual

Una sola familia, **Archivo**, aprovechando su eje de ancho: expandida para
tallas, precios y títulos; normal para texto corrido. Las tallas y los precios
van con numerales tabulares.

### Estructura actual

```
┌──────────────────────────────┐
│ JM CAPS        Colotlán      │  encabezado fijo
├──────────────────────────────┤
│ 14 gorras listas hoy         │  el conteo real como titular
│ Todas están aquí...          │
├──────────────────────────────┤
│ [Con talla][7 1/4][Yankees]  │  filtros en carril horizontal
├──────────────────────────────┤
│ ┌────────┐  ┌────────┐       │
│ │ foto   │  │ foto   │       │  dos columnas en celular
│ ├────────┤  ├────────┤       │
│ │Yankees │  │Dodgers │       │
│ │$419    │  │$419    │       │
│ │7¼  7⅜  │  │Ajust.  │       │  tallas visibles en la tarjeta
│ └────────┘  └────────┘       │
└──────────────────────────────┘
```

### Lo que sí conviene conservar como principio

- El inventario real como protagonista, no la marca.
- La talla como elemento tipográfico destacado.
- El color de escasez reservado y con significado.
- Todo alineado a la izquierda, sin centrados de folleto.

---

## 8. Restricciones que no se pueden romper

- **Todo en español de México.** Tono directo y llano, de tú.
- **Sin emojis en ninguna parte.** Es preferencia explícita del dueño.
- **Móvil primero**, probado en pantallas de 360 px de ancho.
- **Sin pago en línea.** No diseñes carrito, checkout, tarjetas ni pasarelas.
- **Sin cuentas de usuario.** No hay registro, login ni perfil.
- **Una sola gorra por apartado.** No hay carrito de varias piezas.
- **Las fotos son cuadradas y sobre fondo blanco**, tomadas con celular. No
  habrá fotografía de estilo de vida ni modelos.
- **Una sola foto por producto.** Si diseñas galería, márcala como propuesta
  aparte: requiere trabajo adicional en la base.
- **Consideración legal:** varias gorras llevan logos de ligas deportivas. No
  se debe usar ningún logotipo de liga, equipo o marca en la interfaz, ni en
  iconos, ni en el encabezado. Los nombres de equipo solo aparecen como texto,
  porque vienen de los datos.

---

## 9. Qué entregar y en qué formato

El código se va a integrar en una app React 19 + TypeScript existente, con
enrutamiento ya resuelto y datos que llegan de una base. Para que la
integración sea limpia:

- **React con TypeScript**, componentes funcionales.
- **CSS plano en un archivo**, con variables de color en `:root`. La app actual
  no usa framework de estilos. Si prefieres Tailwind, dilo claramente al
  entregar para poder convertirlo, pero CSS plano ahorra ese paso.
- **Nombres de clase y de componentes en español**, como el resto del proyecto.
- **Sin librerías nuevas** de animación, iconos o UI, salvo que sean
  imprescindibles y lo señales. El peso importa: el cliente entra con datos
  móviles.
- **Los datos llegan por props.** No hagas llamadas a APIs ni inventes
  `fetch`: el componente recibe el arreglo de productos ya cargado.
- **Accesibilidad de base**: foco visible con teclado, contraste suficiente,
  campos con etiqueta real, botones que son botones.

### Sobre las imágenes de muestra

Usa marcadores neutros o fondos planos. **No uses fotos de gorras con logos de
marcas reales** ni imágenes de bancos que después no se puedan sustituir. Las
fotos reales van a ser cuadradas, de producto sobre pared blanca.

---

## 10. Resumen de lo que hay que diseñar

1. Catálogo con encabezado, portada, filtros y cuadrícula.
2. Ficha de producto con selector de talla y formulario de apartado.
3. Confirmación de apartado con salida a WhatsApp.
4. Los seis estados de la sección 4.4.
5. Pie de página.
6. Los ocho componentes reutilizables de la sección 5.
7. Las microinteracciones de la sección 6.

Con eso queda cubierta la tienda completa.
