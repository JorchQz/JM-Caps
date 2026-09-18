import type { LineaConModelo } from './consultas'

type DatosPedido = {
  fecha: string
  lineas: LineaConModelo[]
  notas?: string | null
}

function nombreLinea(linea: LineaConModelo, indice: number): string {
  if (linea.modelo) {
    const partes = [linea.modelo.nombre, linea.modelo.color].filter(Boolean)
    return partes.join(' ')
  }
  return `Artículo ${indice + 1}`
}

function detalleLinea(linea: LineaConModelo): string {
  const talla = linea.talla ? `talla ${linea.talla}` : 'ajustable'
  return `${linea.cantidad} pz · ${talla}`
}

/**
 * Texto para pegar en el chat. Algunos proveedores contestan más rápido sobre
 * el mensaje que sobre un adjunto, así que el PDF no es la única salida.
 */
export function textoPedido({ fecha, lineas }: DatosPedido): string {
  const piezas = lineas.reduce((suma, linea) => suma + linea.cantidad, 0)
  const renglones = lineas.map((linea, indice) => {
    const nombre = nombreLinea(linea, indice)
    const nota = linea.nota ? `\n   Nota: ${linea.nota}` : ''
    return `${indice + 1}. ${nombre} — ${detalleLinea(linea)}\n   ${linea.link_yupoo}${nota}`
  })

  return [
    `Pedido JM Caps — ${fecha}`,
    `${lineas.length} artículos, ${piezas} piezas en total`,
    '',
    ...renglones,
    '',
    'Confírmame cuáles están disponibles y el total, por favor.',
  ].join('\n')
}

/**
 * PDF con los links clicables, para adjuntar en WhatsApp. Cada renglón lleva el
 * link completo visible además del enlace, por si el proveedor lo lee impreso o
 * su visor no respeta las anotaciones.
 */
export async function generarPdfPedido({ fecha, lineas, notas }: DatosPedido): Promise<Blob> {
  // jsPDF arrastra bastante peso y solo se usa aqui: se carga al momento de
  // generar el PDF para no cargarlo en cada visita al panel.
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margen = 48
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2
  const altoPagina = doc.internal.pageSize.getHeight()
  let y = margen

  const piezas = lineas.reduce((suma, linea) => suma + linea.cantidad, 0)

  function saltoSiHaceFalta(alto: number) {
    if (y + alto <= altoPagina - margen) return
    doc.addPage()
    y = margen
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Pedido JM Caps', margen, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(90)
  doc.text(`Fecha: ${fecha}`, margen, y)
  y += 15
  doc.text(`${lineas.length} artículos · ${piezas} piezas en total`, margen, y)
  y += 20

  doc.setDrawColor(200)
  doc.line(margen, y, margen + anchoUtil, y)
  y += 20

  lineas.forEach((linea, indice) => {
    saltoSiHaceFalta(64)

    doc.setTextColor(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`${indice + 1}. ${nombreLinea(linea, indice)}`, margen, y)

    doc.setFont('helvetica', 'normal')
    doc.text(detalleLinea(linea), margen + anchoUtil, y, { align: 'right' })
    y += 15

    doc.setFontSize(9.5)
    doc.setTextColor(30, 80, 190)
    const link = doc.splitTextToSize(linea.link_yupoo, anchoUtil) as string[]
    for (const renglon of link) {
      saltoSiHaceFalta(14)
      doc.textWithLink(renglon, margen, y, { url: linea.link_yupoo })
      y += 12
    }

    if (linea.nota) {
      doc.setTextColor(110)
      doc.setFontSize(9.5)
      const nota = doc.splitTextToSize(`Nota: ${linea.nota}`, anchoUtil) as string[]
      for (const renglon of nota) {
        saltoSiHaceFalta(14)
        doc.text(renglon, margen, y)
        y += 12
      }
    }

    y += 10
    doc.setDrawColor(230)
    saltoSiHaceFalta(10)
    doc.line(margen, y - 5, margen + anchoUtil, y - 5)
    y += 6
  })

  if (notas) {
    saltoSiHaceFalta(40)
    doc.setTextColor(60)
    doc.setFontSize(10)
    const texto = doc.splitTextToSize(notas, anchoUtil) as string[]
    for (const renglon of texto) {
      saltoSiHaceFalta(14)
      doc.text(renglon, margen, y)
      y += 13
    }
  }

  return doc.output('blob')
}

export async function descargarPdfPedido(datos: DatosPedido): Promise<void> {
  const blob = await generarPdfPedido(datos)
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `pedido-jm-caps-${datos.fecha}.pdf`
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
