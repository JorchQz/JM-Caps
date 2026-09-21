import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NEGOCIO } from '../lib/legales'

/**
 * Marco para las páginas de texto largo. Les da una medida de línea legible y
 * un resumen arriba: casi nadie lee un documento legal completo, así que la
 * primera línea dice lo que de verdad importa.
 */
export function Documento({
  titulo,
  resumen,
  children,
}: {
  titulo: string
  resumen: string
  children: ReactNode
}) {
  // Al entrar a un documento desde el catálogo, la página conserva el scroll
  // anterior y el texto arranca a la mitad.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [titulo])

  return (
    <article className="documento">
      <h1 className="documento-titulo">{titulo}</h1>
      <p className="documento-resumen">{resumen}</p>
      <div className="documento-cuerpo">{children}</div>

      <footer className="documento-pie">
        <p>Última actualización: {NEGOCIO.actualizado}.</p>
        <Link to="/">Volver al catálogo</Link>
      </footer>
    </article>
  )
}
