import React, { useState, useEffect } from 'react';
import { Plus, Minus, Package, AlertTriangle, Boxes, Search } from 'lucide-react';
import { supabase } from './supabaseClient';
import NuevoConsumibleModal from './NuevoConsumibleModal';

export default function ConsumiblesTab() {
  const [consumibles, setConsumibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarConsumibles();
  }, []);

  const cargarConsumibles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('consumibles')
      .select(`
        id,
        nombre,
        descripcion,
        cantidad_stock,
        stock_minimo,
        sedes ( id, nombre ),
        bodegas ( id, nombre )
      `)
      .order('nombre');

    if (error) {
      console.error('Error al cargar consumibles:', error);
    } else {
      setConsumibles(data || []);
    }
    setLoading(false);
  };

  // Función para aumentar o reducir stock directamente en la tabla
  const ajustarStock = async (id, delta, stockActual) => {
    const nuevoStock = stockActual + delta;
    if (nuevoStock < 0) return;

    // Actualización optimista en UI
    setConsumibles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad_stock: nuevoStock } : item))
    );

    const { error } = await supabase
      .from('consumibles')
      .update({ cantidad_stock: nuevoStock })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar el stock:', error);
      cargarConsumibles(); // Revertir en caso de falla
    }
  };

  // Cálculo de totales y métricas
  const totalTiposConsumibles = consumibles.length;
  const totalUnidadesStock = consumibles.reduce((acc, c) => acc + (c.cantidad_stock || 0), 0);
  const consumiblesConStockBajo = consumibles.filter((c) => c.cantidad_stock <= c.stock_minimo).length;

  const consumiblesFiltrados = consumibles.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.descripcion && c.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* TARJETAS DE MÉTRICAS / RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tipos de Consumibles */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipos de Consumibles</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalTiposConsumibles}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Stock Unidades */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Unidades en Stock</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalUnidadesStock}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Alertas Stock Bajo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Bajo / Crítico</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{consumiblesConStockBajo}</h3>
          </div>
          <div className={`p-3 rounded-xl ${consumiblesConStockBajo > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TABLA Y CONTROLES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header de la Tabla */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar consumible..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs font-medium"
            >
            <Plus className="w-4 h-4" /> Nuevo Consumible
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 sm:px-6 py-3">Consumible</th>
                <th className="px-4 sm:px-6 py-3">Ubicación</th>
                <th className="px-4 sm:px-6 py-3 text-center">Stock Actual</th>
                <th className="px-4 sm:px-6 py-3 text-center">Stock Mínimo</th>
                <th className="px-4 sm:px-6 py-3 text-center">Estado</th>
                <th className="px-4 sm:px-6 py-3 text-right">Ajustar Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    Cargando inventario de consumibles...
                  </td>
                </tr>
              ) : consumiblesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No se encontraron consumibles registrados.
                  </td>
                </tr>
              ) : (
                consumiblesFiltrados.map((item) => {
                  const esBajo = item.cantidad_stock <= item.stock_minimo;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* Nombre y Descripción */}
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{item.nombre}</div>
                        {item.descripcion && (
                          <div className="text-[11px] text-slate-400">{item.descripcion}</div>
                        )}
                      </td>

                      {/* Ubicación */}
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-medium text-slate-800">
                          {item.bodegas?.nombre ? `Bodega: ${item.bodegas.nombre}` : 'Sin Bodega'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.sedes?.nombre || 'Sede N/A'}
                        </div>
                      </td>

                      {/* Stock Actual */}
                      <td className="px-4 sm:px-6 py-3.5 text-center font-bold text-slate-800 text-base">
                        {item.cantidad_stock}
                      </td>

                      {/* Stock Mínimo */}
                      <td className="px-4 sm:px-6 py-3.5 text-center text-slate-500 font-mono">
                        {item.stock_minimo}
                      </td>

                      {/* Estado */}
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            esBajo
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {esBajo ? 'Stock Bajo' : 'Normal'}
                        </span>
                      </td>

                      {/* Botonera de incremento/decremento rápido */}
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => ajustarStock(item.id, -1, item.cantidad_stock)}
                            disabled={item.cantidad_stock <= 0}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
                            title="Descontar 1 unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-semibold border-x border-slate-100">
                            1
                          </span>
                          <button
                            onClick={() => ajustarStock(item.id, 1, item.cantidad_stock)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600"
                            title="Agregar 1 unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para ingresar nuevo consumible */}
      <NuevoConsumibleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConsumibleGuardado={cargarConsumibles}
      />
    </div>
  );
}