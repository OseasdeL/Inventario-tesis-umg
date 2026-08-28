import React, { useState, useEffect } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { supabase } from './supabaseClient'; // Ajusta la ruta a tu cliente de Supabase

export default function NuevoConsumibleModal({ isOpen, onClose, onConsumibleGuardado }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidadStock, setCantidadStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [sedeId, setSedeId] = useState('');
  const [bodegaId, setBodegaId] = useState('');

  const [sedes, setSedes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar sedes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchSedes();
    }
  }, [isOpen]);

  // Cargar bodegas cuando cambia la sede seleccionada
  useEffect(() => {
    if (sedeId) {
      fetchBodegas(sedeId);
    } else {
      setBodegas([]);
      setBodegaId('');
    }
  }, [sedeId]);

  const fetchSedes = async () => {
    const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre');
    if (!error && data) setSedes(data);
  };

  const fetchBodegas = async (selectedSedeId) => {
    const { data, error } = await supabase
      .from('bodegas')
      .select('id, nombre')
      .eq('sede_id', selectedSedeId)
      .order('nombre');
    if (!error && data) {
      setBodegas(data);
      if (data.length > 0) setBodegaId(data[0].id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !bodegaId || !cantidadStock) return;

    setLoading(true);

    const nuevoConsumible = {
      nombre,
      descripcion,
      cantidad_stock: parseInt(cantidadStock, 10),
      stock_minimo: parseInt(stockMinimo, 10),
      sede_id: parseInt(sedeId, 10),
      bodega_id: parseInt(bodegaId, 10)
    };

    const { error } = await supabase.from('consumibles').insert([nuevoConsumible]);

    setLoading(false);

    if (error) {
      console.error('Error al guardar consumible:', error);
      alert('Error al guardar el consumible');
    } else {
      onConsumibleGuardado();
      handleClose();
    }
  };

  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setCantidadStock('');
    setStockMinimo('5');
    setSedeId('');
    setBodegaId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <h3>Agregar Nuevo Consumible</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Consumible *</label>
            <input
              type="text"
              required
              placeholder="Ej. Cable HDMI 2m, Mouse USB, Toner HP"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción</label>
            <textarea
              rows="2"
              placeholder="Detalles adicionales, número de parte, especificaciones..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sede *</label>
              <select
                required
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar Sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bodega *</label>
              <select
                required
                disabled={!sedeId}
                value={bodegaId}
                onChange={(e) => setBodegaId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
              >
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad Inicial *</label>
              <input
                type="number"
                min="0"
                required
                placeholder="0"
                value={cantidadStock}
                onChange={(e) => setCantidadStock(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Mínimo (Alerta) *</label>
              <input
                type="number"
                min="0"
                required
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Consumible'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}