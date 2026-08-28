import React, { useState } from 'react';
import { Clock, History, CheckCircle2, XCircle, Package } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function PanelAprobacionesAdmin({ movimientos = [], usuarioAdmin, onMovimientoProcesado }) {
  const [tabActiva, setTabActiva] = useState('pendientes');
  const esAdmin = usuarioAdmin?.rol === 'admin';

  const pendientes = movimientos.filter(m => m.estado?.toLowerCase() === 'pendiente');
  const historial = movimientos.filter(m => m.estado?.toLowerCase() !== 'pendiente');

  const manejarAprobacion = async (movimientoId, nuevoEstado) => {
    if (!esAdmin) return;

    try {
      const { error: errorMov } = await supabase
        .from('movimientos')
        .update({ 
          estado: nuevoEstado,
          aprobado_por_id: usuarioAdmin.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', movimientoId);

      if (errorMov) throw errorMov;

      if (nuevoEstado === 'aprobado') {
        const movActual = movimientos.find(m => m.id === movimientoId);
        if (movActual && movActual.bodega_destino_id) {
          const activosATransferir = movActual.movimiento_detalles
            ?.filter(d => d.tipo_item === 'activo' && d.activos?.id)
            .map(d => d.activos.id);

          if (activosATransferir && activosATransferir.length > 0) {
            await supabase
              .from('activos')
              .update({ bodega_id: movActual.bodega_destino_id })
              .in('id', activosATransferir);
          }
        }
      }

      if (onMovimientoProcesado) onMovimientoProcesado();
    } catch (err) {
      console.error('Error al procesar la aprobación:', err);
    }
  };

  const listaAMostrar = tabActiva === 'pendientes' ? pendientes : historial;

  return (
    <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
      {/* Encabezado y Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-purple-100 pb-3">
        <h2 className="font-bold text-purple-950 text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-700" />
          {esAdmin ? 'Gestión de Solicitudes (Admin)' : 'Gestión de Solicitudes'}
        </h2>

        <div className="flex bg-purple-100/70 p-1 rounded-xl text-xs font-semibold text-purple-800 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setTabActiva('pendientes')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              tabActiva === 'pendientes' ? 'bg-white text-purple-900 shadow-xs' : 'hover:text-purple-950'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pendientes
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendientes.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva('historial')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              tabActiva === 'historial' ? 'bg-white text-purple-900 shadow-xs' : 'hover:text-purple-950'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial
            <span className="bg-purple-200 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {historial.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Solicitudes */}
      {listaAMostrar.length === 0 ? (
        <div className="text-center py-8 text-purple-400 text-xs italic bg-white/60 rounded-xl border border-purple-100">
          No hay solicitudes {tabActiva === 'pendientes' ? 'pendientes por revisar' : 'en el historial'}.
        </div>
      ) : (
        <div className="space-y-3">
          {listaAMostrar.map((mov) => {
            const origenNombre = mov.tipo_origen === 'bodega'
              ? (mov.bodega_origen?.nombre || 'Bodega Central')
              : (mov.estacion_origen?.nombre || 'Estación Origen');

            const destinoNombre = mov.tipo_destino === 'bodega'
              ? (mov.bodega_destino?.nombre || 'Bodega Central')
              : (mov.estacion_destino?.nombre || 'Estación Destino');

            const esEstadoPendiente = mov.estado?.toLowerCase() === 'pendiente';

            // Determinar si fue creado por un admin o técnico y obtener su nombre
            const usuarioCreador = mov.usuarios;
            const esAdminCreador = usuarioCreador?.rol?.toLowerCase() === 'admin';
            const etiquetaUsuario = esAdminCreador ? 'Admin:' : 'Técnico:';
            const nombreUsuario = usuarioCreador?.nombre || `ID: ${mov.tecnico_id || 'Desconocido'}`;

            return (
              <div key={mov.id} className="bg-white border border-purple-100 p-4 rounded-xl shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(mov.fecha_solicitud || mov.created_at).toLocaleString()} — {etiquetaUsuario} <strong className="text-slate-600">{nombreUsuario}</strong>
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      De <span className="text-purple-700">{origenNombre}</span> a <span className="text-purple-700">{destinoNombre}</span>
                    </p>
                  </div>

                  {esAdmin && esEstadoPendiente ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => manejarAprobacion(mov.id, 'rechazado')}
                        className="flex-1 sm:flex-none border border-rose-200 text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </button>
                      <button
                        onClick={() => manejarAprobacion(mov.id, 'aprobado')}
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar Traslado
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 self-start sm:self-auto ${
                      mov.estado?.toLowerCase() === 'aprobado'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : mov.estado?.toLowerCase() === 'rechazado'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {mov.estado}
                    </span>
                  )}
                </div>

                {/* Ítems Incluidos */}
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Ítems incluidos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mov.movimiento_detalles?.map((det) => (
                      <span key={det.id} className="bg-white text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200/80 shadow-2xs flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-500" />
                        {det.tipo_item === 'activo'
                          ? `${det.activos?.inventario || 'Activo'}${det.activos?.serial ? ` (${det.activos.serial})` : ''}`
                          : `${det.consumibles?.nombre || 'Consumible'} x${det.cantidad}`
                        }
                      </span>
                    ))}
                  </div>
                </div>

                {mov.observacion && (
                  <p className="text-slate-500 italic text-xs">"{mov.observacion}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}