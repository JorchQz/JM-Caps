import type { ReactNode } from 'react'
import { ESTADOS_UNIDAD, type EstadoUnidad } from '@jm-caps/db'

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string
  ayuda?: string
  children: ReactNode
}) {
  return (
    <label className="campo">
      <span className="etiqueta-campo">{etiqueta}</span>
      {children}
      {ayuda ? <span className="ayuda">{ayuda}</span> : null}
    </label>
  )
}

export function Aviso({
  tipo = 'neutro',
  children,
}: {
  tipo?: 'neutro' | 'error' | 'exito'
  children: ReactNode
}) {
  if (!children) return null
  return <div className={`aviso ${tipo === 'neutro' ? '' : tipo}`}>{children}</div>
}

export function MensajeError({ error }: { error: unknown }) {
  if (!error) return null
  const texto = error instanceof Error ? error.message : String(error)
  return <Aviso tipo="error">{texto}</Aviso>
}

export function InsigniaEstado({ estado }: { estado: EstadoUnidad }) {
  return <span className={`insignia ${estado}`}>{ESTADOS_UNIDAD[estado]}</span>
}

export function Cargando({ texto = 'Cargando' }: { texto?: string }) {
  return <p className="vacio">{texto}...</p>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
}) {
  return (
    <header className="encabezado-pagina">
      <div>
        <h1>{titulo}</h1>
        {descripcion ? <p>{descripcion}</p> : null}
      </div>
      {acciones ? <div className="fila">{acciones}</div> : null}
    </header>
  )
}
