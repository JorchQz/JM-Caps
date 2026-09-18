import { useEffect, useRef, useState } from 'react'

/**
 * Escáner de códigos con la cámara del celular.
 *
 * Se decodifica en el propio navegador: nada de la imagen sale del teléfono ni
 * se sube a ningún lado. La librería se carga solo al abrir el escáner, para no
 * pesar en cada visita al panel.
 *
 * La cámara exige HTTPS. En localhost el navegador la permite como excepción,
 * pero si alguna vez se abre el panel por IP en la red local no va a funcionar.
 */
export function EscanerQR({
  alLeer,
  alCerrar,
}: {
  alLeer: (texto: string) => void
  alCerrar: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  // El callback cambia en cada render del padre. Si el efecto dependiera de él,
  // la cámara se apagaría y volvería a abrir constantemente.
  const alLeerRef = useRef(alLeer)
  alLeerRef.current = alLeer

  useEffect(() => {
    let activo = true
    let flujo: MediaStream | null = null
    let cuadro = 0
    // Evita que un código quede leyéndose muchas veces mientras sigue enfrente.
    let ultimo = ''
    let ultimoEn = 0

    async function arrancar() {
      try {
        const { default: jsQR } = await import('jsqr')

        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!activo) {
          flujo.getTracks().forEach((pista) => pista.stop())
          return
        }

        const elemento = video.current
        if (!elemento) return
        elemento.srcObject = flujo
        await elemento.play()
        setListo(true)

        const canvas = lienzo.current
        const contexto = canvas?.getContext('2d', { willReadFrequently: true })
        if (!canvas || !contexto) return

        const revisar = () => {
          if (!activo) return

          if (elemento.readyState === elemento.HAVE_ENOUGH_DATA) {
            canvas.width = elemento.videoWidth
            canvas.height = elemento.videoHeight
            contexto.drawImage(elemento, 0, 0, canvas.width, canvas.height)

            const imagen = contexto.getImageData(0, 0, canvas.width, canvas.height)
            const codigo = jsQR(imagen.data, imagen.width, imagen.height, {
              inversionAttempts: 'dontInvert',
            })

            const leido = codigo?.data.trim()
            const ahora = Date.now()

            // Sigue escaneando después de leer: al cobrar varias gorras se pasan
            // una tras otra sin tener que reabrir la cámara cada vez.
            if (leido && (leido !== ultimo || ahora - ultimoEn > 2500)) {
              ultimo = leido
              ultimoEn = ahora
              // Una vibración corta confirma la lectura sin mirar la pantalla:
              // al cobrar, la vista está en la gorra, no en el celular.
              navigator.vibrate?.(60)
              alLeerRef.current(leido)
            }
          }

          cuadro = requestAnimationFrame(revisar)
        }

        cuadro = requestAnimationFrame(revisar)
      } catch (fallo) {
        if (!activo) return
        const mensaje = fallo instanceof Error ? fallo.message : String(fallo)
        setError(
          mensaje.includes('Permission') || mensaje.includes('denied')
            ? 'No diste permiso de cámara. Actívalo en el candado de la barra de direcciones.'
            : `No se pudo abrir la cámara: ${mensaje}. Captura el folio a mano.`,
        )
      }
    }

    void arrancar()

    return () => {
      activo = false
      cancelAnimationFrame(cuadro)
      flujo?.getTracks().forEach((pista) => pista.stop())
    }
    // Sin dependencias a proposito: la camara se abre una vez y vive hasta
    // que se cierra el escaner.
  }, [])

  return (
    <div className="escaner">
      <div className="escaner-marco">
        <video ref={video} playsInline muted />
        <canvas ref={lienzo} hidden />
        {!listo && !error ? <p className="tenue">Abriendo la cámara...</p> : null}
        {listo ? <div className="escaner-guia" /> : null}
      </div>

      {error ? <div className="aviso error">{error}</div> : null}

      <div className="fila" style={{ marginTop: 10 }}>
        <button type="button" onClick={alCerrar}>
          Cerrar cámara
        </button>
        <span className="tenue" style={{ fontSize: '0.85rem' }}>
          Apunta al código de la etiqueta
        </span>
      </div>
    </div>
  )
}
