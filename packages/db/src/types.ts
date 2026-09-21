// Generado desde Supabase (proyecto ndsnftmzmjsxxjdlwozk).
// Para regenerar: npm run gen:types
// No editar a mano.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      catalogo_proveedor: {
        Row: {
          activo: boolean
          categoria: Database['public']['Enums']['categoria_cachucha'] | null
          codigo_supplier: string
          created_at: string
          fecha_revisado: string | null
          id: string
          link_yupoo: string
          notas: string | null
        }
        Insert: {
          activo?: boolean
          categoria?: Database['public']['Enums']['categoria_cachucha'] | null
          codigo_supplier: string
          created_at?: string
          fecha_revisado?: string | null
          id?: string
          link_yupoo: string
          notas?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: Database['public']['Enums']['categoria_cachucha'] | null
          codigo_supplier?: string
          created_at?: string
          fecha_revisado?: string | null
          id?: string
          link_yupoo?: string
          notas?: string | null
        }
        Relationships: []
      }
      lotes: {
        Row: {
          costo_envio_mxn: number
          created_at: string
          estado: Database['public']['Enums']['estado_lote']
          fecha_pedido: string
          fecha_recepcion: string | null
          id: string
          notas: string | null
          tipo_cambio_dia: number | null
          total_usd: number | null
        }
        Insert: {
          costo_envio_mxn?: number
          created_at?: string
          estado?: Database['public']['Enums']['estado_lote']
          fecha_pedido?: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          tipo_cambio_dia?: number | null
          total_usd?: number | null
        }
        Update: {
          costo_envio_mxn?: number
          created_at?: string
          estado?: Database['public']['Enums']['estado_lote']
          fecha_pedido?: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          tipo_cambio_dia?: number | null
          total_usd?: number | null
        }
        Relationships: []
      }
      cupones: {
        Row: {
          activo: boolean
          codigo: string
          creado_en: string
          minimo_mxn: number
          nota: string | null
          tipo: Database['public']['Enums']['tipo_descuento']
          usos: number
          usos_maximos: number | null
          valor: number
          vence: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          creado_en?: string
          minimo_mxn?: number
          nota?: string | null
          tipo: Database['public']['Enums']['tipo_descuento']
          usos?: number
          usos_maximos?: number | null
          valor: number
          vence?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          creado_en?: string
          minimo_mxn?: number
          nota?: string | null
          tipo?: Database['public']['Enums']['tipo_descuento']
          usos?: number
          usos_maximos?: number | null
          valor?: number
          vence?: string | null
        }
        Relationships: []
      }
      precios_proveedor: {
        Row: {
          actualizado_en: string
          categoria: Database['public']['Enums']['categoria_cachucha']
          desde_piezas: number
          precio_usd: number
        }
        Insert: {
          actualizado_en?: string
          categoria: Database['public']['Enums']['categoria_cachucha']
          desde_piezas: number
          precio_usd: number
        }
        Update: {
          actualizado_en?: string
          categoria?: Database['public']['Enums']['categoria_cachucha']
          desde_piezas?: number
          precio_usd?: number
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          actualizado_en: string
          clave: string
          descripcion: string | null
          valor: string
        }
        Insert: {
          actualizado_en?: string
          clave: string
          descripcion?: string | null
          valor: string
        }
        Update: {
          actualizado_en?: string
          clave?: string
          descripcion?: string | null
          valor?: string
        }
        Relationships: []
      }
      pedido_lineas: {
        Row: {
          cantidad: number
          categoria: Database['public']['Enums']['categoria_cachucha'] | null
          created_at: string
          estado: Database['public']['Enums']['estado_linea_pedido']
          id: string
          link_yupoo: string
          lote_id: string
          modelo_id: string | null
          nota: string | null
          orden: number
          precio_usd_unitario: number | null
          talla: string | null
        }
        Insert: {
          cantidad?: number
          categoria?: Database['public']['Enums']['categoria_cachucha'] | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_linea_pedido']
          id?: string
          link_yupoo: string
          lote_id: string
          modelo_id?: string | null
          nota?: string | null
          orden?: number
          precio_usd_unitario?: number | null
          talla?: string | null
        }
        Update: {
          cantidad?: number
          categoria?: Database['public']['Enums']['categoria_cachucha'] | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_linea_pedido']
          id?: string
          link_yupoo?: string
          lote_id?: string
          modelo_id?: string | null
          nota?: string | null
          orden?: number
          precio_usd_unitario?: number | null
          talla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pedido_lineas_lote_id_fkey'
            columns: ['lote_id']
            isOneToOne: false
            referencedRelation: 'lotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pedido_lineas_modelo_id_fkey'
            columns: ['modelo_id']
            isOneToOne: false
            referencedRelation: 'modelos'
            referencedColumns: ['id']
          },
        ]
      }
      modelos: {
        Row: {
          activo: boolean
          categoria: Database['public']['Enums']['categoria_cachucha']
          codigo: string
          color: string | null
          created_at: string
          descripcion: string | null
          equipo: string | null
          foto_url: string | null
          id: string
          link_yupoo: string
          nombre: string
          oferta_hasta: string | null
          oferta_nota: string | null
          oferta_tipo: Database['public']['Enums']['tipo_descuento'] | null
          oferta_valor: number | null
          precio_venta_mxn: number
        }
        Insert: {
          activo?: boolean
          categoria: Database['public']['Enums']['categoria_cachucha']
          codigo: string
          color?: string | null
          created_at?: string
          descripcion?: string | null
          equipo?: string | null
          foto_url?: string | null
          id?: string
          link_yupoo: string
          nombre: string
          oferta_hasta?: string | null
          oferta_nota?: string | null
          oferta_tipo?: Database['public']['Enums']['tipo_descuento'] | null
          oferta_valor?: number | null
          precio_venta_mxn: number
        }
        Update: {
          activo?: boolean
          categoria?: Database['public']['Enums']['categoria_cachucha']
          codigo?: string
          color?: string | null
          created_at?: string
          descripcion?: string | null
          equipo?: string | null
          foto_url?: string | null
          id?: string
          link_yupoo?: string
          nombre?: string
          oferta_hasta?: string | null
          oferta_nota?: string | null
          oferta_tipo?: Database['public']['Enums']['tipo_descuento'] | null
          oferta_valor?: number | null
          precio_venta_mxn?: number
        }
        Relationships: []
      }
      unidades: {
        Row: {
          apartado_hasta: string | null
          apartado_nombre: string | null
          apartado_telefono: string | null
          costo_unitario_mxn: number | null
          created_at: string
          estado: Database['public']['Enums']['estado_unidad']
          fecha_alta: string | null
          fecha_venta: string | null
          folio: string
          foto_real_url: string | null
          id: string
          linea_id: string | null
          lote_id: string | null
          modelo_id: string
          talla: string | null
          updated_at: string
        }
        Insert: {
          apartado_hasta?: string | null
          apartado_nombre?: string | null
          apartado_telefono?: string | null
          costo_unitario_mxn?: number | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_unidad']
          fecha_alta?: string | null
          fecha_venta?: string | null
          folio?: string
          foto_real_url?: string | null
          id?: string
          linea_id?: string | null
          lote_id?: string | null
          modelo_id: string
          talla?: string | null
          updated_at?: string
        }
        Update: {
          apartado_hasta?: string | null
          apartado_nombre?: string | null
          apartado_telefono?: string | null
          costo_unitario_mxn?: number | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_unidad']
          fecha_alta?: string | null
          fecha_venta?: string | null
          folio?: string
          foto_real_url?: string | null
          id?: string
          linea_id?: string | null
          lote_id?: string | null
          modelo_id?: string
          talla?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unidades_lote_id_fkey'
            columns: ['lote_id']
            isOneToOne: false
            referencedRelation: 'lotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unidades_linea_id_fkey'
            columns: ['linea_id']
            isOneToOne: false
            referencedRelation: 'pedido_lineas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unidades_modelo_id_fkey'
            columns: ['modelo_id']
            isOneToOne: false
            referencedRelation: 'modelos'
            referencedColumns: ['id']
          },
        ]
      }
      venta_items: {
        Row: {
          id: string
          precio_mxn: number
          unidad_id: string
          venta_id: string
        }
        Insert: {
          id?: string
          precio_mxn: number
          unidad_id: string
          venta_id: string
        }
        Update: {
          id?: string
          precio_mxn?: number
          unidad_id?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'venta_items_unidad_id_fkey'
            columns: ['unidad_id']
            isOneToOne: true
            referencedRelation: 'unidades'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_items_venta_id_fkey'
            columns: ['venta_id']
            isOneToOne: false
            referencedRelation: 'ventas'
            referencedColumns: ['id']
          },
        ]
      }
      ventas: {
        Row: {
          canal: Database['public']['Enums']['canal_venta']
          cliente_nombre: string | null
          cliente_telefono: string | null
          fecha: string
          id: string
          cupon_codigo: string | null
          descuento_mxn: number
          metodo_pago: Database['public']['Enums']['metodo_pago']
          notas: string | null
          subtotal_mxn: number | null
          total_mxn: number
        }
        Insert: {
          canal: Database['public']['Enums']['canal_venta']
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          fecha?: string
          id?: string
          cupon_codigo?: string | null
          descuento_mxn?: number
          metodo_pago: Database['public']['Enums']['metodo_pago']
          notas?: string | null
          subtotal_mxn?: number | null
          total_mxn: number
        }
        Update: {
          canal?: Database['public']['Enums']['canal_venta']
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          fecha?: string
          id?: string
          cupon_codigo?: string | null
          descuento_mxn?: number
          metodo_pago?: Database['public']['Enums']['metodo_pago']
          notas?: string | null
          subtotal_mxn?: number | null
          total_mxn?: number
        }
        Relationships: []
      }
    }
    Views: {
      catalogo_publico: {
        Row: {
          categoria: Database['public']['Enums']['categoria_cachucha'] | null
          codigo: string | null
          color: string | null
          descripcion: string | null
          equipo: string | null
          foto_url: string | null
          modelo_id: string | null
          nombre: string | null
          precio_efectivo_mxn: number | null
          precio_venta_mxn: number | null
          stock_disponible: number | null
          tallas_disponibles: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      apartar_unidad: {
        Args: {
          p_modelo_id: string
          p_nombre: string
          /** Null en las gorras ajustables: la funcion compara con IS NOT DISTINCT FROM. */
          p_talla: string | null
          p_telefono: string
        }
        Returns: string
      }
      agregar_unidades: {
        Args: {
          p_cantidad: number
          p_costo_unitario_mxn: number | null
          p_linea_id?: string | null
          p_lote_id: string | null
          p_modelo_id: string
          p_talla: string | null
        }
        Returns: string[]
      }
      confirmar_pedido: {
        Args: { p_lote_id: string; p_total_usd?: number | null }
        Returns: Array<{
          confirmadas: number
          descartadas: number
          piezas: number
          total_usd: number
        }>
      }
      prorratear_costos: {
        Args: { p_lote_id: string }
        Returns: Array<{ costo_unitario: number; piezas: number }>
      }
      eliminar_lote: {
        Args: { p_lote_id: string }
        Returns: Array<{ unidades_borradas: number; lineas_borradas: number }>
      }
      crear_modelo: {
        Args: {
          p_categoria: Database['public']['Enums']['categoria_cachucha']
          p_color: string | null
          p_descripcion: string | null
          p_equipo: string | null
          p_foto_url: string | null
          p_link_yupoo: string
          p_nombre: string
          p_precio_venta_mxn: number
        }
        Returns: Database['public']['Tables']['modelos']['Row']
      }
      recibir_lote: {
        Args: {
          p_fecha: string
          p_lote_id: string
          p_unidad_ids: string[] | null
        }
        Returns: Array<{ recibidas: number; faltantes: number }>
      }
      registrar_venta: {
        Args: {
          p_canal: Database['public']['Enums']['canal_venta']
          p_cliente_nombre: string | null
          p_cliente_telefono: string | null
          p_metodo_pago: Database['public']['Enums']['metodo_pago']
          p_cupon_codigo?: string | null
          p_notas: string | null
          p_unidad_ids: string[]
        }
        Returns: string
      }
    }
    Enums: {
      canal_venta: 'local_colotlan' | 'local_tepatitlan' | 'envio_nacional'
      categoria_cachucha: 'AA' | 'AAS' | 'UU' | 'UUS' | 'K' | 'DH'
      estado_linea_pedido: 'solicitada' | 'confirmada' | 'no_disponible'
      estado_lote: 'borrador' | 'pedido' | 'en_transito' | 'recibido'
      estado_unidad:
        | 'pedido'
        | 'en_transito'
        | 'disponible'
        | 'apartada'
        | 'vendida'
      metodo_pago: 'efectivo' | 'spei' | 'tarjeta' | 'otro'
      tipo_descuento: 'porcentaje' | 'monto'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database['public']

export type Tables<T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]
