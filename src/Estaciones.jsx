import React, { useState } from 'react';
import { Plus, Building2, Radio } from 'lucide-react';

export default function Estaciones({ userRole, sedes = [] }) {
  const [estacionesList, setEstacionesList] = useState([]);
  const [nombre, setNombre] = useState('');
  const [sedeId, setSedeId] = useState('');

  const isAdmin = userRole === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin || !nombre || !sedeId) return;

    const sedeSeleccionada = sedes.find((s) => s.id === parseInt(sedeId));

    const nuevaEstacion = {
      id: Date.now(),
      nombre,
      sedeId: parseInt(sedeId),
      sedeNombre: sedeSeleccionada ? sedeSeleccionada.nombre : 'Sin Sede',
      estado: 'Activa',
    };

    setEstacionesList([...estacionesList, nuevaEstacion]);
    setNombre('');
    setSedeId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Estaciones de Trabajo</h2>
          <p className="text-sm text-gray-500">Gestión e inventario de estaciones por sede</p>
        </div>
      </div>

      {/* Formulario exclusivo para Admins */}
      {isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Nueva Estación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre de la estación (ej. Estación 01)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar Sede Perteneciente</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Guardar Estación
          </button>
        </form>
      )}

      {/* Tabla de visualización (Accesible para Admin y Técnico) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-medium">
              <th className="p-4">Estación</th>
              <th className="p-4">Sede Asignada</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {estacionesList.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-400">
                  No hay estaciones registradas aún.
                </td>
              </tr>
            ) : (
              estacionesList.map((estacion) => (
                <tr key={estacion.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <Radio className="w-4 h-4 text-gray-400" />
                    {estacion.nombre}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {estacion.sedeNombre}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                      {estacion.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}