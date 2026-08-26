import React, { useState } from 'react';
import { X, Plus, PackagePlus } from 'lucide-react';

export default function NuevoActivoModal({ isOpen, onClose, onAgregar }) {
  const [inventario, setInventario] = useState('');
  const [serial, setSerial] = useState('');
  const [categoria, setCategoria] = useState('Cómputo');
  const [sede, setSede] = useState('Sede Central');
  const [bodega, setBodega] = useState('Estación Recepción');
  const [estado, setEstado] = useState('Excelente');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inventario.trim() || !serial.trim()) return;

    // Generar un código QR basado en el número de inventario o un ID único
    const nuevoId = Date.now();
    const codigoQR = `QR-${inventario.toUpperCase()}`;

    const nuevoActivo = {
      id: nuevoId,
      qr: codigoQR,
      inventario: inventario.toUpperCase(),
      serial: serial.toUpperCase(),
      categoria,
      sede,
      bodega,
      estado,
    };

    onAgregar(nuevoActivo);
    onClose();
    
    // Limpiar formulario
    setInventario('');
    setSerial('');
    setEstado('Excelente');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold">Registrar Nuevo Activo</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">No. Inventario</label>
              <input 
                type="text" 
                placeholder="Ej. INV-2024-08"
                value={inventario}
                onChange={(e) => setInventario(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Número de Serie</label>
              <input 
                type="text" 
                placeholder="Ej. SN-8839201A"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Categoría</label>
              <select 
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cómputo">Cómputo</option>
                <option value="Oficina">Oficina</option>
                <option value="Herramientas">Herramientas</option>
                <option value="Mobiliario">Mobiliario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estado Inicial</label>
              <select 
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="En Reparación">En Reparación</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sede de Origen</label>
              <select 
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Sede Central">Sede Central</option>
                <option value="Planta Norte">Planta Norte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bodega / Ubicación</label>
              <select 
                value={bodega}
                onChange={(e) => setBodega(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Estación Recepción">Estación Recepción</option>
                <option value="Bodega Cómputo">Bodega Cómputo</option>
                <option value="Taller Técnico">Taller Técnico</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Registrar Activo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}