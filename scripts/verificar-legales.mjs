/**
 * Verifica que los documentos legales sigan diciendo la verdad.
 *
 * Los términos y el aviso de privacidad describen reglas que viven en otro
 * lado: el plazo del apartado y el límite por persona los aplica la base de
 * datos, el teléfono sale del entorno. Si una de esas reglas cambia y el
 * documento no, el documento pasa a mentirle al cliente, y eso en un aviso de
 * privacidad tiene consecuencias legales, no solo de imagen.
 *
 * Esta revisión compara ambos lados y falla si dejaron de coincidir.
 *
 *   npm run verificar:legales
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// La carpeta del proyecto tiene espacios en el nombre: convertir la URL a mano
// deja los %20 dentro de la ruta y nada abre.
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const LEGALES = join(RAIZ, 'apps/tienda/src/lib/legales.ts')
const MIGRACIONES = join(RAIZ, 'supabase/migrations')

/** Archivos cuyo contenido obliga a revisar la fecha de actualización. */
const DOCUMENTOS = [
  'apps/tienda/src/lib/legales.ts',
  'apps/tienda/src/paginas/Terminos.tsx',
  'apps/tienda/src/paginas/Privacidad.tsx',
  'apps/tienda/src/paginas/ComoComprar.tsx',
]

const problemas = []
const avisos = []

const legales = readFileSync(LEGALES, 'utf8')

function constante(nombre) {
  const encontrado = legales.match(new RegExp(`export const ${nombre} = (\\d+)`))
  return encontrado ? Number(encontrado[1]) : null
}

function campo(nombre) {
  const encontrado = legales.match(new RegExp(`${nombre}: '([^']*)'`))
  return encontrado ? encontrado[1] : null
}

// ---------------------------------------------------------------- 1. datos

for (const nombre of ['responsable', 'domicilio', 'correo']) {
  const valor = campo(nombre)
  if (!valor || valor.startsWith('PENDIENTE')) {
    problemas.push(
      `Falta el dato "${nombre}" en legales.ts. El aviso de privacidad no cumple la LFPDPPP sin él.`,
    )
  }
}

// --------------------------------------------- 2. reglas que viven en la base

// Se busca la definición más reciente de apartar_unidad: es la que está viva.
const migracionApartado = readdirSync(MIGRACIONES)
  .filter((archivo) => archivo.endsWith('.sql'))
  .sort()
  .reverse()
  .find((archivo) =>
    readFileSync(join(MIGRACIONES, archivo), 'utf8').includes('function public.apartar_unidad'),
  )

if (!migracionApartado) {
  problemas.push('No se encontró ninguna migración que defina apartar_unidad.')
} else {
  const sql = readFileSync(join(MIGRACIONES, migracionApartado), 'utf8')

  const horasBase = sql.match(/interval '(\d+) hours?'/)
  const horasCodigo = constante('HORAS_APARTADO')
  if (horasBase && horasCodigo !== Number(horasBase[1])) {
    problemas.push(
      `El apartado dura ${horasBase[1]} h en la base (${migracionApartado}) pero los documentos dicen ${horasCodigo} h.`,
    )
  }

  const topeBase = sql.match(/v_activos >= (\d+)/)
  const topeCodigo = constante('MAX_APARTADOS')
  if (topeBase && topeCodigo !== Number(topeBase[1])) {
    problemas.push(
      `La base permite ${topeBase[1]} apartados por persona pero los términos dicen ${topeCodigo}.`,
    )
  }
}

// ------------------------------------------------------------- 3. contacto

const ejemploEntorno = readFileSync(join(RAIZ, 'apps/tienda/.env.example'), 'utf8')
const whatsappEntorno = (ejemploEntorno.match(/VITE_WHATSAPP=(\S+)/)?.[1] ?? '').replace(/\D/g, '')
const whatsappLegal = (campo('whatsapp') ?? '').replace(/\D/g, '')

if (whatsappEntorno && whatsappLegal && !whatsappLegal.endsWith(whatsappEntorno)) {
  problemas.push(
    `El WhatsApp de los documentos (${campo('whatsapp')}) no coincide con el de .env.example (${whatsappEntorno}).`,
  )
}

// -------------------------------------------------- 4. fecha de actualización

const fechaTexto = campo('actualizado')
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const partes = fechaTexto?.match(/(\d{1,2}) de (\w+) de (\d{4})/)
const fechaDeclarada = partes
  ? new Date(Number(partes[3]), MESES.indexOf(partes[2].toLowerCase()), Number(partes[1]))
  : null

if (!fechaDeclarada || Number.isNaN(fechaDeclarada.getTime())) {
  problemas.push(`La fecha "${fechaTexto}" no se entiende. Usa el formato "20 de septiembre de 2026".`)
} else {
  for (const documento of DOCUMENTOS) {
    let ultimoCambio
    try {
      const salida = execSync(`git log -1 --format=%cI -- "${documento}"`, {
        cwd: RAIZ,
        encoding: 'utf8',
      }).trim()
      if (!salida) continue
      ultimoCambio = new Date(salida)
    } catch {
      continue
    }

    // Un día de margen: la fecha declarada no lleva hora.
    const margen = new Date(fechaDeclarada.getTime() + 24 * 3600 * 1000)
    if (ultimoCambio > margen) {
      avisos.push(
        `${documento} cambió el ${ultimoCambio.toISOString().slice(0, 10)}, después de la fecha declarada (${fechaTexto}). Si el cambio fue de fondo, actualiza "actualizado" en legales.ts.`,
      )
    }
  }
}

// ---------------------------------------------------------------- resultado

for (const aviso of avisos) console.log(`AVISO  ${aviso}`)
for (const problema of problemas) console.error(`ERROR  ${problema}`)

if (problemas.length === 0 && avisos.length === 0) {
  console.log('Los documentos legales coinciden con las reglas vigentes.')
}

process.exit(problemas.length > 0 ? 1 : 0)
