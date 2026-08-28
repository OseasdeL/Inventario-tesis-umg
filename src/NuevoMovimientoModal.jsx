import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, Package, Cable, AlertCircle, Loader2, Radio, ArrowLeftRight } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function NuevoMovimientoModal({ isOpen, onClose, usuario, onMovimientoCreado }) {
  const [sedes, setSedes] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [bodegaInfo, setBodegaInfo] = useState(null); // Guarda los datos de la bodega (ej: { id: 4, Nombre: 'BCPC1' })
  const [activosDisponibles, setActivosDisponibles] = useState([]);
  const [consumiblesDisponibles, setConsumiblesDisponibles] = useState([]);

  // Formulario principal
  const [sedeId, setSedeId] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('bodega_a_estacion');
  const [estacionOrigenId, setEstacionOrigenId] = useState('');
  const [estacionDestinoId, setEstacionDestinoId] = useState('');
  const [observacion, setObservacion] = useState('');

  // Carrito de ítems
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);

  // Selección temporal
  const [activoTemp, setActivoTemp] = useState('');
  const [estadoRetornoTemp, setEstadoRetornoTemp] = useState('Disponible');
  const [consumibleTemp, setConsumibleTemp] = useState('');
  const [cantidadConsumibleTemp, setCantidadConsumibleTemp] = useState(1);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarSedes();
      resetForm();
    }
  }, [isOpen]);

  // Al seleccionar una sede, cargamos su Bodega y sus Estaciones
  useEffect(() => {
    if (isOpen && sedeId) {
      cargarBodegaCentral(sedeId);
      cargarEstaciones(sedeId);
    }
  }, [sedeId, isOpen]);

  // Al cambiar la bodega, la estación de origen o el tipo de movimiento, cargamos los items
  useEffect(() => {
    if (isOpen && sedeId) {
      cargarItemsDisponibles();
    }
  }, [bodegaInfo, estacionOrigenId, tipoMovimiento]);

  const resetForm = () => {
    setSedeId('');
    setTipoMovimiento('bodega_a_estacion');
    setEstacionOrigenId('');
    setEstacionDestinoId('');
    setBodegaInfo(null);
    setObservacion('');
    setItemsSeleccionados([]);
    setActivoTemp('');
    setEstadoRetornoTemp('Disponible');
    setConsumibleTemp('');
    setCantidadConsumibleTemp(1);
    setError('');
  };

  const cargarSedes = async () => {
    try {
      const { data, error } = await supabase.from('sedes').select('id, nombre');
      if (error) throw error;
      if (data) setSedes(data);
    } catch (err) {
      console.error('Error al cargar sedes:', err);
    }
  };

// Cargar la bodega asociada a la sede seleccionada
  const cargarBodegaCentral = async (idSede) => {
    if (!idSede) {
      setBodegaInfo(null);
      return;
    }

    try {
      const idNumerico = Number(idSede);
      console.log('🔍 Buscando bodega para sede_id:', idNumerico);

      const { data, error } = await supabase
        .from('bodegas')
        .select('*') // Traemos todas las columnas para evitar errores de select
        .eq('sede_id', idNumerico);

      if (error) {
        console.error('❌ Error de Supabase al consultar bodegas:', error);
        throw error;
      }

      console.log('📦 Respuesta de Supabase en bodegas:', data);

      if (data && data.length > 0) {
        // Asignamos la bodega encontrada
        setBodegaInfo(data[0]);
      } else {
        console.warn(`⚠️ No se encontró ningún registro en 'bodegas' donde sede_id = ${idNumerico}`);
        setBodegaInfo(null);
      }
    } catch (err) {
      console.error('Error al cargar bodega:', err);
      setBodegaInfo(null);
    }
  };

  // Cargar las estaciones pertenecientes a la sede
  const cargarEstaciones = async (idSede) => {
    try {
      const { data, error } = await supabase
        .from('estaciones')
        .select('id, nombre')
        .eq('sede_id', parseInt(idSede, 10));

      if (error) throw error;
      setEstaciones(data || []);
    } catch (err) {
      console.error('Error al cargar estaciones:', err);
    }
  };

  // Cargar Activos y Consumibles disponibles según el origen
  const cargarItemsDisponibles = async () => {
    try {
      if (tipoMovimiento === 'bodega_a_estacion') {
        // Traer activos de la Bodega / Sede
        let queryActivos = supabase
          .from('activos')
          .select('id, inventario, serial, estado, especificacion')
          .eq('sede_id', parseInt(sedeId, 10))
          .is('estacion_id', null)
          .eq('estado', 'Disponible');

        if (bodegaInfo?.id) {
          queryActivos = queryActivos.eq('bodega_id', bodegaInfo.id);
        }

        const { data: dataActivos, error: errAct } = await queryActivos;
        if (errAct) console.error('Error activos:', errAct);
        setActivosDisponibles(dataActivos || []);

        // Traer consumibles de la Bodega / Sede
        let queryConsumibles = supabase
          .from('consumibles')
          .select('id, nombre, cantidad_stock')
          .eq('sede_id', parseInt(sedeId, 10))
          .gt('cantidad_stock', 0)
          .is('estacion_id', null);

        if (bodegaInfo?.id) {
          queryConsumibles = queryConsumibles.eq('bodega_id', bodegaInfo.id);
        }

        const { data: dataConsumibles, error: errCons } = await queryConsumibles;
        if (errCons) console.error('Error consumibles:', errCons);
        setConsumiblesDisponibles(dataConsumibles || []);

      } else {
        // Traslado desde Estación
        if (!estacionOrigenId) {
          setActivosDisponibles([]);
          setConsumiblesDisponibles([]);
          return;
        }

        const { data: dataActivos } = await supabase
          .from('activos')
          .select('id, inventario, serial, estado,especificacion')
          .eq('estacion_id', parseInt(estacionOrigenId, 10));
        setActivosDisponibles(dataActivos || []);

        const { data: dataConsumibles } = await supabase
          .from('consumibles')
          .select('id, nombre, cantidad_stock')
          .eq('estacion_id', parseInt(estacionOrigenId, 10));
        setConsumiblesDisponibles(dataConsumibles || []);
      }
    } catch (err) {
      console.error('Error al cargar ítems disponibles:', err);
    }
  };

  const handleCambioTipoMovimiento = (nuevoTipo) => {
    setTipoMovimiento(nuevoTipo);
    setEstacionOrigenId('');
    setEstacionDestinoId('');
    setItemsSeleccionados([]);
    setActivoTemp('');
    setConsumibleTemp('');
  };

  const handleAgregarActivo = () => {
    if (!activoTemp) return;
    const activoObj = activosDisponibles.find(a => String(a.id) === String(activoTemp));
    if (!activoObj) return;

    setItemsSeleccionados([
      ...itemsSeleccionados,
      {
        tipo: 'activo',
        id: activoObj.id,
        nombre: `${activoObj.inventario || 'S/N'} | ${activoObj.especificacion || 'Activo'} - Serie: ${activoObj.serial || 'N/A'}`,
        cantidad: 1,
        estado_retorno_bodega: tipoMovimiento === 'estacion_a_bodega' ? estadoRetornoTemp : null
      }
    ]);
    setActivoTemp('');
  };

  const handleAgregarConsumible = () => {
    if (!consumibleTemp) return;
    const consObj = consumiblesDisponibles.find(c => String(c.id) === String(consumibleTemp));
    if (!consObj) return;

    if (cantidadConsumibleTemp > consObj.cantidad_stock) {
      setError(`Stock insuficiente para ${consObj.nombre}. Disponible: ${consObj.cantidad_stock}`);
      return;
    }
    setError('');

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
          cantidad: Number(cantidadConsumibleTemp),
          estado_retorno_bodega: null
        }
      ]);
    }
    setConsumibleTemp('');
    setCantidadConsumibleTemp(1);
  };

  const handleEliminarItem = (index) => {
    setItemsSeleccionados(itemsSeleccionados.filter((_, i) => i !== index));
  };

  const handleGuardarMovimiento = async () => {
    if (!sedeId) {
      setError('Por favor selecciona la sede');
      return;
    }
    if (tipoMovimiento !== 'bodega_a_estacion' && !estacionOrigenId) {
      setError('Por favor selecciona la estación de origen');
      return;
    }
    if (tipoMovimiento !== 'estacion_a_bodega' && !estacionDestinoId) {
      setError('Por favor selecciona la estación de destino');
      return;
    }
    if (tipoMovimiento === 'estacion_a_estacion' && estacionOrigenId === estacionDestinoId) {
      setError('La estación origen y destino no pueden ser la misma');
      return;
    }
    if (itemsSeleccionados.length === 0) {
      setError('Debes agregar al menos un activo o consumible al paquete');
      return;
    }

    setCargando(true);
    setError('');

    try {
      // Determinar bodega de origen y destino dinámicamente
      const esBodegaOrigen = tipoMovimiento === 'bodega_a_estacion';
      const esBodegaDestino = tipoMovimiento === 'estacion_a_bodega';

      const idBodega = bodegaInfo ? bodegaInfo.id : null;

      const payloadMovimiento = {
        sede_id: parseInt(sedeId, 10),
        tipo_origen: esBodegaOrigen ? 'bodega' : 'estacion',
        bodega_origen_id: esBodegaOrigen ? idBodega : null,
        estacion_origen_id: esBodegaOrigen ? null : parseInt(estacionOrigenId, 10),

        tipo_destino: esBodegaDestino ? 'bodega' : 'estacion',
        bodega_destino_id: esBodegaDestino ? idBodega : null,
        estacion_destino_id: esBodegaDestino ? null : parseInt(estacionDestinoId, 10),

        tecnico_id: usuario?.id || null,
        estado: 'Pendiente',
        observacion: observacion.trim()
      };

      // 1. Insertar el movimiento principal
      const { data: movData, error: errMov } = await supabase
        .from('movimientos')
        .insert([payloadMovimiento])
        .select()
        .single();

      if (errMov) throw errMov;

      // 2. Insertar los detalles del movimiento (activos y consumibles)
      const detallesInsertar = itemsSeleccionados.map(item => ({
        movimiento_id: movData.id,
        tipo_item: item.tipo,
        activo_id: item.tipo === 'activo' ? item.id : null,
        consumible_id: item.tipo === 'consumible' ? item.id : null,
        cantidad: item.cantidad,
        estado_retorno_bodega: item.estado_retorno_bodega
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

  const activosDisponiblesFiltrados = activosDisponibles.filter(
    a => !itemsSeleccionados.some(i => i.tipo === 'activo' && i.id === a.id)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base">Solicitar Traslado Multiactivo</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Seleccionar Sede */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sede de la Gestión</label>
            <select
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value);
                setItemsSeleccionados([]);
              }}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar Sede --</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* 2. Tipo de Movimiento */}
          {sedeId && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Tipo de Traslado</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCambioTipoMovimiento('bodega_a_estacion')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                    tipoMovimiento === 'bodega_a_estacion'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" /> Bodega → Estación
                </button>

                <button
                  type="button"
                  onClick={() => handleCambioTipoMovimiento('estacion_a_bodega')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                    tipoMovimiento === 'estacion_a_bodega'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Radio className="w-4 h-4" /> Estación → Bodega
                </button>

                <button
                  type="button"
                  onClick={() => handleCambioTipoMovimiento('estacion_a_estacion')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                    tipoMovimiento === 'estacion_a_estacion'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" /> Estación → Estación
                </button>
              </div>
            </div>
          )}

          {/* 3. Rutas (Origen y Destino) */}
          {sedeId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Origen</label>
                {tipoMovimiento === 'bodega_a_estacion' ? (
                  <div className="text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-100 font-semibold text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                        {bodegaInfo
                          ? (bodegaInfo.Nombre || bodegaInfo.nombre)
                          : (
                              sedeId === '1' ? 'BCPC1' :
                              sedeId === '2' ? 'BCPC2' :
                              sedeId === '3' ? 'BCPZ4' :
                              sedeId === '4' ? 'BCR383' : 'Bodega Central'
                            )
                        }
                    </span>
                  </div>
                ) : (
                  <select
                    value={estacionOrigenId}
                    onChange={(e) => {
                      setEstacionOrigenId(e.target.value);
                      setItemsSeleccionados([]);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Estación Origen --</option>
                    {estaciones.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destino</label>
                {tipoMovimiento === 'estacion_a_bodega' ? (
                  <div className="text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-100 font-semibold text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{bodegaInfo ? bodegaInfo.Nombre : 'Cargando bodega...'}</span>
                  </div>
                ) : (
                  <select
                    value={estacionDestinoId}
                    onChange={(e) => setEstacionDestinoId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Estación Destino --</option>
                    {estaciones
                      .filter(e => String(e.id) !== String(estacionOrigenId))
                      .map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Agregar Activos */}
          {sedeId && (tipoMovimiento === 'bodega_a_estacion' || estacionOrigenId) && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" /> Agregar Equipo / Activo Fijo
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={activoTemp}
                  onChange={(e) => setActivoTemp(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">-- Seleccionar Activo Disponible --</option>
                  {activosDisponiblesFiltrados.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.inventario || 'S/N'} | {a.especificacion || 'Equipo'} - Serie: {a.serial || 'N/A'}
                    </option>
                  ))}
                </select>

                {tipoMovimiento === 'estacion_a_bodega' && (
                  <select
                    value={estadoRetornoTemp}
                    onChange={(e) => setEstadoRetornoTemp(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="En diagnostico">En diagnóstico</option>
                    <option value="Dano irreparable">Daño irreparable</option>
                    <option value="Para cobro">Para cobro</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleAgregarActivo}
                  disabled={!activoTemp}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {/* Agregar Consumibles */}
          {sedeId && (tipoMovimiento === 'bodega_a_estacion' || estacionOrigenId) && (
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
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {/* Lista de Ítems */}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.tipo === 'activo' ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVO</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">CONSUMIBLE</span>
                      )}
                      <span className="font-medium text-slate-800">{item.nombre}</span>
                      <span className="text-slate-500 font-bold">x{item.cantidad}</span>
                      {item.estado_retorno_bodega && (
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          [{item.estado_retorno_bodega}]
                        </span>
                      )}
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
              placeholder="Ej: Traslado para mantenimiento de estación de trabajo..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        {/* Footer */}
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