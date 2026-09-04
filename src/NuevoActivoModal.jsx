import React, { useState, useEffect } from 'react';
import { X, Plus, PackagePlus, AlertCircle, Loader2, Warehouse, QrCode } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function NuevoActivoModal({ 
  isOpen, 
  onClose, 
  onActivoCreado, 
  onAbrirScanner, // Prop para abrir el scanner especificando el destino ('inventario' o 'serial')
  inventario,
  setInventario,
  serial,
  setSerial
}) {
  // Catálogos
  const [sedes, setSedes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [tiposActivo, setTiposActivo] = useState([]);
  const [marcas, setMarcas] = useState([]);

  // Formulario
  const [tipoActivoId, setTipoActivoId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [especificacion, setEspecificacion] = useState('');
  const [propiedad, setPropiedad] = useState('Propio');
  const [estado, setEstado] = useState('Disponible');

  // Ubicación fija en Bodega
  const [sedeId, setSedeId] = useState('');
  const [bodegaId, setBodegaId] = useState('');

  // Interfaz
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      resetForm();
    }
  }, [isOpen]);

  // Al seleccionar una Sede, cargar sus bodegas y seleccionar automáticamente la principal
  useEffect(() => {
    if (sedeId) {
      cargarBodegasPorSede(sedeId);
    } else {
      setBodegas([]);
      setBodegaId('');
    }
  }, [sedeId]);

  const resetForm = () => {
    if (setInventario) setInventario('');
    if (setSerial) setSerial('');
    setTipoActivoId('');
    setMarcaId('');
    setEspecificacion('');
    setPropiedad('Propio');
    setEstado('Disponible');
    setSedeId('');
    setBodegaId('');
    setError('');
  };

  const cargarCatalogos = async () => {
    try {
      const [resSedes, resTipos, resMarcas] = await Promise.all([
        supabase.from('sedes').select('id, nombre'),
        supabase.from('tipos_activo').select('id, nombre'),
        supabase.from('marcas').select('id, nombre')
      ]);

      if (resSedes.data) setSedes(resSedes.data);
      if (resTipos.data) setTiposActivo(resTipos.data);
      if (resMarcas.data) setMarcas(resMarcas.data);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
      setError('Error al conectar con la base de datos.');
    }
  };

  const cargarBodegasPorSede = async (idSede) => {
    try {
      const { data, error: bError } = await supabase
        .from('bodegas')
        .select('id, nombre')
        .eq('sede_id', idSede);

      if (bError) throw bError;

      setBodegas(data || []);

      if (data && data.length > 0) {
        const bodegaCentral = data.find(b => b.nombre.toLowerCase().includes('central')) || data[0];
        setBodegaId(bodegaCentral.id.toString());
      } else {
        setBodegaId('');
      }
    } catch (err) {
      console.error('Error al cargar bodegas:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!inventario.trim() || !serial.trim()) {
      setError('El número de inventario y serial son obligatorios.');
      return;
    }
    if (!tipoActivoId || !marcaId) {
      setError('Selecciona el tipo de activo y la marca.');
      return;
    }
    if (!sedeId || !bodegaId) {
      setError('Debes seleccionar una sede con bodega de destino.');
      return;
    }

    setCargando(true);

    try {
      const invFormatted = inventario.trim().toUpperCase();
      const codigoQR = `QR-${invFormatted}`;

      const { data, error: insertError } = await supabase
        .from('activos')
        .insert([
          {
            qr: codigoQR,
            inventario: invFormatted,
            serial: serial.trim().toUpperCase(),
            tipo_activo_id: parseInt(tipoActivoId),
            marca_id: parseInt(marcaId),
            especificacion: especificacion.trim(),
            propiedad,
            estado,
            sede_id: parseInt(sedeId),
            bodega_id: parseInt(bodegaId),
            estacion_id: null,
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (onActivoCreado) onActivoCreado(data);
      onClose();
    } catch (err) {
      console.error('Error al crear activo:', err);
      if (err.code === '23505') {
        setError('El número de inventario ya existe.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Registrar Nuevo Activo</h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inventario y Serial con botones QR */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                No. Inventario
              </label>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Ej. INV-2024-08"
                  value={inventario}
                  onChange={(e) => setInventario(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => onAbrirScanner && onAbrirScanner('inventario')}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center justify-center shrink-0"
                  title="Escanear QR para Inventario"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Número de Serie
              </label>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Ej. SN-8839201A"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => onAbrirScanner && onAbrirScanner('serial')}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center justify-center shrink-0"
                  title="Escanear QR para Serie"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Tipo y Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Activo
              </label>
              <select 
                value={tipoActivoId}
                onChange={(e) => setTipoActivoId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                {tiposActivo.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Marca
              </label>
              <select 
                value={marcaId}
                onChange={(e) => setMarcaId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Especificación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Especificación / Modelo
            </label>
            <input 
              type="text" 
              placeholder="Ej. Monitor 24 Pulgadas, Mini PC 3050"
              value={especificacion}
              onChange={(e) => setEspecificacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Propiedad y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Propiedad
              </label>
              <select 
                value={propiedad}
                onChange={(e) => setPropiedad(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Propio">Propio</option>
                <option value="Leasing">Leasing (Alquilado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado Operativo
              </label>
              <select 
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Disponible">Disponible</option>
                <option value="Asignado">Asignado</option>
                <option value="En diagnostico">En diagnóstico</option>
                <option value="Dano irreparable">Daño irreparable</option>
                <option value="Para cobro">Para cobro</option>
              </select>
            </div>
          </div>

          {/* Ubicación Inicial Garantizada en Bodega */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sede de Ingreso
              </label>
              <select 
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar Sede --</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            {sedeId && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-blue-600" />
                  Bodega de Recepción
                </label>
                <select 
                  value={bodegaId}
                  onChange={(e) => setBodegaId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Bodega --</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={cargando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Registrar Activo
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}