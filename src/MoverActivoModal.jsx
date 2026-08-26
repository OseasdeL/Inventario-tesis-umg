import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Send } from 'lucide-react';

export default function MoverActivoModal({ isOpen, onClose, activo, onConfirmarMovimiento }) {
  const [destinoSede, setDestinoSede] = useState('');
  const [destinoBodega, setDestinoBodega] = useState('');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (activo) {
      setDestinoSede(activo.sede);
      setDestinoBodega(activo.bodega);
      setObservacion('');
    }
  }, [activo]);

  if (!isOpen || !activo) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (destinoSede === activo.sede && destinoBodega === activo.bodega) {
      alert('Debes seleccionar una ubicación diferente a la actual.');
      return;
    }

    onConfirmarMovimiento({
      activoId: activo.id,
      origen: { sede: activo.sede, bodega: activo.bodega },
      destino: { sede: destinoSede, bodega: destinoBodega },
      observacion,
      fecha: new Date().toLocaleString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Encabezado */}
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg">Registrar Movimiento</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Tarjeta con info del activo */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold border border-blue-100">{activo.qr}</span>
              <span className="text-slate-500 font-medium">Estado: {activo.estado}</span>
            </div>
            <p className="text-slate-900 font-bold">Inventario: <span className="font-mono">{activo.inventario}</span></p>
            <p className="text-slate-600">Serie: <span className="font-mono">{activo.serial}</span></p>
          </div>

          {/* Ubicación Actual (Origen) */}
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-xs sm:text-sm">
            <p className="font-bold text-amber-900 mb-0.5 uppercase tracking-wider text-[10px]">Ubicación Actual (Origen)</p>
            <p className="text-amber-950 font-medium">{activo.sede} — <span className="font-normal">{activo.bodega}</span></p>
          </div>

          {/* Ubicación Destino */}
          <div className="space-y-3 pt-1">
            <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Ubicación Destino</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sede Destino</label>
                <select 
                  value={destinoSede}
                  onChange={(e) => setDestinoSede(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sede Central">Sede Central</option>
                  <option value="Planta Norte">Planta Norte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bodega / Estación Destino</label>
                <select 
                  value={destinoBodega}
                  onChange={(e) => setDestinoBodega(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Estación Recepción">Estación Recepción</option>
                  <option value="Bodega Cómputo">Bodega Cómputo</option>
                  <option value="Taller Técnico">Taller Técnico</option>
                </select>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Motivo del Traslado</label>
            <textarea 
              rows="2"
              placeholder="Ej. Traslado solicitado para mantenimiento preventivo."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Send className="w-4 h-4" /> Confirmar Traslado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}