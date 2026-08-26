import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, Package, Cable, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function NuevoMovimientoModal({ isOpen, onClose, usuario, onMovimientoCreado }) {
  const [bodegas, setBodegas] = useState([]);
  const [activosDisponibles, setActivosDisponibles] = useState([]);
  const [consumiblesDisponibles, setConsumiblesDisponibles] = useState([]);

  // Formulario principal
  const [bodegaOrigen, setBodegaOrigen] = useState('');
  const [bodegaDestino, setBodegaDestino] = useState('');
  const [observacion, setObservacion] = useState('');

  // Carrito de ítems seleccionados
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);

  // Controles de selección temporal
  const [activoTemp, setActivoTemp] = useState('');
  const [consumibleTemp, setConsumibleTemp] = useState('');
  const [cantidadConsumibleTemp, setCantidadConsumibleTemp] = useState(1);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setBodegaOrigen('');
    setBodegaDestino('');
    setObservacion('');
    setItemsSeleccionados([]);
    setActivoTemp('');
    setConsumibleTemp('');
    setCantidadConsumibleTemp(1);
    setError('');
  };

  const cargarCatalogos = async () => {
    try {
      // 1. Cargar Bodegas con Sedes
      const { data: dataBodegas } = await supabase
        .from('bodegas')
        .select('id, nombre, sedes(nombre)');
      if (dataBodegas) setBodegas(dataBodegas);

      // 2. Cargar Activos
      const { data: dataActivos } = await supabase
        .from('activos')
        .select('id, inventario, serial, categoria, bodega_id');
      if (dataActivos) setActivosDisponibles(dataActivos);

      // 3. Cargar Consumibles
      const { data: dataConsumibles } = await supabase
        .from('consumibles')
        .select('id, nombre, cantidad_stock');
      if (dataConsumibles) setConsumiblesDisponibles(dataConsumibles);

    } catch (err) {
      console.error('Error al cargar datos para el movimiento:', err);
    }
  };

  // Filtrar activos según la bodega de origen elegida
  const activosEnOrigen = activosDisponibles.filter(
    a => String(a.bodega_id) === String(bodegaOrigen) &&
    !itemsSeleccionados.some(i => i.tipo === 'activo' && i.id === a.id)
  );

  // Agregar Activo al carrito
  const handleAgregarActivo = () => {
    if (!activoTemp) return;
    const activoObj = activosDisponibles.find(a => String(a.id) === String(activoTemp));
    if (!activoObj) return;

    setItemsSeleccionados([
      ...itemsSeleccionados,
      {
        tipo: 'activo',
        id: activoObj.id,
        nombre: `${activoObj.inventario} - ${activoObj.categoria} (Serie: ${activoObj.serial})`,
        cantidad: 1
      }
    ]);
    setActivoTemp('');
  };

  // Agregar Consumible al carrito
  const handleAgregarConsumible = () => {
    if (!consumibleTemp) return;
    const consObj = consumiblesDisponibles.find(c => String(c.id) === String(consumibleTemp));
    if (!consObj) return;

    if (cantidadConsumibleTemp > consObj.cantidad_stock) {
      setError(`Stock insuficiente para ${consObj.nombre}. Disponible: ${consObj.cantidad_stock}`);
      return;
    }
    setError('');

    // Si ya existe en el carrito, sumar la cantidad
    const existente = itemsSeleccionados.find(i => i.tipo === 'consumible' && i.id === consObj.id);
    if (existente) {
      setItemsSeleccionados(itemsSeleccionados.map(i => {
        if (i.tipo === 'consumible' && i.id === consObj.id) {
          return { ...i, cantidad: i.cantidad + Number(cantidadConsumibleTemp) };
        }
        return i;
      }));
    } else {
      setItemsSeleccionados([
        ...itemsSeleccionados,
        {
          tipo: 'consumible',
          id: consObj.id,
          nombre: consObj.nombre,
          cantidad: Number(cantidadConsumibleTemp)
        }
      ]);
    }
    setConsumibleTemp('');
    setCantidadConsumibleTemp(1);
  };

  // Eliminar elemento del carrito
  const handleEliminarItem = (index) => {
    setItemsSeleccionados(itemsSeleccionados.filter((_, i) => i !== index));
  };

  // Guardar Solicitud en Supabase
  const handleGuardarMovimiento = async () => {
    if (!bodegaOrigen || !bodegaDestino) {
      setError('Por favor selecciona la bodega de origen y destino');
      return;
    }
    if (bodegaOrigen === bodegaDestino) {
      setError('La bodega origen y destino no pueden ser la misma');
      return;
    }
    if (itemsSeleccionados.length === 0) {
      setError('Debes agregar al menos un activo o consumible al paquete');
      return;
    }

    setCargando(true);
    setError('');

    try {
      // 1. Insertar Cabecera del Movimiento (Estado: 'pendiente')
      const { data: movData, error: errMov } = await supabase
        .from('movimientos')
        .insert([{
          tecnico_id: usuario.id,
          bodega_origen_id: bodegaOrigen,
          bodega_destino_id: bodegaDestino,
          estado: 'pendiente',
          observacion: observacion.trim()
        }])
        .select()
        .single();

      if (errMov) throw errMov;

      // 2. Insertar Detalles
      const detallesInsertar = itemsSeleccionados.map(item => ({
        movimiento_id: movData.id,
        tipo_item: item.tipo,
        activo_id: item.tipo === 'activo' ? item.id : null,
        consumible_id: item.tipo === 'consumible' ? item.id : null,
        cantidad: item.cantidad
      }));

      const { error: errDet } = await supabase
        .from('movimiento_detalles')
        .insert(detallesInsertar);

      if (errDet) throw errDet;

      if (onMovimientoCreado) onMovimientoCreado();
      onClose();

    } catch (err) {
      console.error('Error al registrar movimiento:', err);
      setError(`Error de base de datos: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base">Solicitar Traslado Multiactivo</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rutas (Origen y Destino) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bodega Origen</label>
              <select
                value={bodegaOrigen}
                onChange={(e) => {
                  setBodegaOrigen(e.target.value);
                  setItemsSeleccionados([]); // Limpiar carrito al cambiar origen
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre} ({b.sedes?.nombre})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bodega Destino</label>
              <select
                value={bodegaDestino}
                onChange={(e) => setBodegaDestino(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre} ({b.sedes?.nombre})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Agregar Activos Fijos */}
          {bodegaOrigen && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" /> Agregar Equipo / Activo Fijo
              </label>
              <div className="flex gap-2">
                <select
                  value={activoTemp}
                  onChange={(e) => setActivoTemp(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">-- Seleccionar Activo en Bodega --</option>
                  {activosEnOrigen.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.inventario} | {a.categoria} - Serie: {a.serial}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAgregarActivo}
                  disabled={!activoTemp}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {/* Agregar Consumibles */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Cable className="w-4 h-4 text-emerald-600" /> Agregar Consumibles (Cables, Conectores)
            </label>
            <div className="flex gap-2">
              <select
                value={consumibleTemp}
                onChange={(e) => setConsumibleTemp(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="">-- Seleccionar Consumible --</option>
                {consumiblesDisponibles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Stock disponible: {c.cantidad_stock})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={cantidadConsumibleTemp}
                onChange={(e) => setCantidadConsumibleTemp(e.target.value)}
                className="w-16 text-xs border border-slate-300 rounded-lg p-2 text-center"
              />

              <button
                type="button"
                onClick={handleAgregarConsumible}
                disabled={!consumibleTemp}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Lista de Ítems Agregados (Carrito) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="text-xs font-bold text-slate-800">
              Resumen del Paquete ({itemsSeleccionados.length} ítems)
            </label>
            {itemsSeleccionados.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">
                Aún no has agregado ningún equipo o consumible al traslado.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {itemsSeleccionados.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      {item.tipo === 'activo' ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVO</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">CONSUMIBLE</span>
                      )}
                      <span className="font-medium text-slate-800">{item.nombre}</span>
                      <span className="text-slate-500 font-bold">x{item.cantidad}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminarItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones / Motivo</label>
            <textarea
              rows="2"
              placeholder="Ej: Traslado para mantenimiento de estación de trabajo en laboratorio..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardarMovimiento}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                Enviar Solicitud <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}