import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Aviso, Campo } from '../components/ui'

export function Login() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (errorAuth) {
      setError(
        errorAuth.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : errorAuth.message,
      )
      setEnviando(false)
    }
    // Si entra, ProveedorSesion detecta el cambio y cambia de pantalla.
  }

  return (
    <div className="pantalla-login">
      <form className="caja-login tarjeta" onSubmit={(evento) => void entrar(evento)}>
        <div className="marca" style={{ marginBottom: 6 }}>
          JM <span>Caps</span>
        </div>
        <p className="tenue" style={{ marginTop: 0, marginBottom: 20, fontSize: '0.9rem' }}>
          Panel de administración
        </p>

        {error ? <Aviso tipo="error">{error}</Aviso> : null}

        <Campo etiqueta="Correo">
          <input
            type="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </Campo>

        <Campo etiqueta="Contraseña">
          <input
            type="password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            autoComplete="current-password"
            required
          />
        </Campo>

        <button type="submit" className="principal" disabled={enviando} style={{ width: '100%' }}>
          {enviando ? 'Entrando' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
