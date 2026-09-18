export type TipoCambio = {
  valor: number
  fecha: string
  fuente: string
}

/**
 * Trae el tipo de cambio del dólar. Son dos fuentes gratuitas y sin llave: si
 * la primera no responde se intenta la segunda, porque quedarse sin el dato
 * bloquearía el costeo del pedido.
 *
 * Es una referencia de mercado, no lo que va a cobrar el banco: la transferencia
 * internacional suele salir 2 o 3 por ciento más cara. El valor se puede
 * sobrescribir a mano, y el que manda es el que quede guardado en el lote.
 */
export async function consultarTipoCambio(): Promise<TipoCambio> {
  const fuentes: Array<() => Promise<TipoCambio>> = [desdeFrankfurter, desdeErApi]
  const fallos: string[] = []

  for (const fuente of fuentes) {
    try {
      return await fuente()
    } catch (error) {
      fallos.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(
    `No se pudo consultar el tipo de cambio (${fallos.join('; ')}). Captúralo a mano.`,
  )
}

async function desdeFrankfurter(): Promise<TipoCambio> {
  const respuesta = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN', {
    signal: AbortSignal.timeout(8000),
  })
  if (!respuesta.ok) throw new Error(`Frankfurter respondió ${respuesta.status}`)

  const datos = (await respuesta.json()) as { date?: string; rates?: { MXN?: number } }
  const valor = datos.rates?.MXN
  if (typeof valor !== 'number') throw new Error('Frankfurter no devolvió el peso')

  return { valor, fecha: datos.date ?? '', fuente: 'Frankfurter (BCE)' }
}

async function desdeErApi(): Promise<TipoCambio> {
  const respuesta = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(8000),
  })
  if (!respuesta.ok) throw new Error(`ExchangeRate respondió ${respuesta.status}`)

  const datos = (await respuesta.json()) as {
    time_last_update_utc?: string
    rates?: { MXN?: number }
  }
  const valor = datos.rates?.MXN
  if (typeof valor !== 'number') throw new Error('ExchangeRate no devolvió el peso')

  const fecha = datos.time_last_update_utc
    ? new Date(datos.time_last_update_utc).toISOString().slice(0, 10)
    : ''

  return { valor, fecha, fuente: 'ExchangeRate-API' }
}
