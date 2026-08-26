import React, { useState, useEffect } from 'react';
import { Plus, Building2, Radio, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase } from './supabaseClient'; // Ajusta la ruta a tu cliente de Supabase

export default function Estaciones({ userRole = 'admin' }) {
  const [estacionesList, setEstacionesList] = useState([]);
  const [sedesList, setSedesList] = useState([]);
  const [nombre, setNombre] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado para controlar la alerta personalizada: { tipo: 'error' | 'success', mensaje: '' }
  const [alerta, setAlerta] = useState(null);

  const isAdmin = userRole === 'admin';

  // Mostrar alerta con auto-cierre después de 4 segundos
  const mostrarNotificacion = (tipo, mensaje) => {
    setAlerta({ tipo, mensaje });
    setTimeout(() => {
      setAlerta(null);
    }, 4000);
  };

  useEffect(() => {
    fetchSedesYEstaciones();
  }, []);

  const fetchSedesYEstaciones = async () => {
    setLoading(true);

    const { data: sedes, error: errorSedes } = await supabase
      .from('sedes')
      .select('id, nombre');

    if (errorSedes) console.error('Error cargando sedes:', errorSedes);
    else setSedesList(sedes || []);

    const { data: estaciones, error: errorEstaciones } = await supabase
      .from('estaciones')
      .select(`
        id,
        nombre,
        estado,
        sede_id,
        sedes ( nombre )
      `)
      .order('id', { ascending: false });

    if (errorEstaciones) {
      console.error('Error cargando estaciones:', errorEstaciones);
    } else {
      setEstacionesList(estaciones || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !nombre || !sedeId) return;

    const nombreLimpio = nombre.trim();

    // 1. Validación local para evitar duplicados en tiempo real
    const existeLocal = estacionesList.some(
      (est) => est.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (existeLocal) {
      mostrarNotificacion('error', `La estación "${nombreLimpio}" ya existe en el sistema.`);
      return;
    }

    // 2. Insertar en Supabase
    const { data, error } = await supabase
      .from('estaciones')
      .insert([
        {
          nombre: nombreLimpio,
          sede_id: parseInt(sedeId),
          estado: 'Activa'
        }
      ])
      .select(`
        id,
        nombre,
        estado,
        sede_id,
        sedes ( nombre )
      `);

    if (error) {
      if (error.code === '23505') {
        mostrarNotificacion('error', `La estación "${nombreLimpio}" ya está registrada en la base de datos.`);
      } else {
        mostrarNotificacion('error', 'Error al guardar la estación: ' + error.message);
      }
    } else if (data) {
      setEstacionesList([data[0], ...estacionesList]);
      setNombre('');
      setSedeId('');
      mostrarNotificacion('success', `Estación "${nombreLimpio}" agregada correctamente.`);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Notificación Flotante / Toast (Aparece abajo a la derecha) */}
      {alerta && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 ${
            alerta.tipo === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {alerta.tipo === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          )}
          <span>{alerta.mensaje}</span>
          <button
            onClick={() => setAlerta(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Estaciones de Trabajo</h2>
          <p className="text-sm text-gray-500">Gestión e inventario de estaciones por sede</p>
        </div>
      </div>

      {/* Formulario solo para Admins */}
      {isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4 text-blue-600" /> Nueva Estación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre de la estación (ej. PC1N1F1E1)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            >
              <option value="">Seleccionar Sede Perteneciente</option>
              {sedesList.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Guardar Estación
          </button>
        </form>
      )}

      {/* Tabla de visualización */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
              <th className="p-4">Estación</th>
              <th className="p-4">Sede Asignada</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {loading ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-400">
                  Cargando estaciones...
                </td>
              </tr>
            ) : estacionesList.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-400">
                  No hay estaciones registradas aún.
                </td>
              </tr>
            ) : (
              estacionesList.map((estacion) => (
                <tr key={estacion.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 font-semibold text-gray-800 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-500" />
                    {estacion.nombre}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-gray-600 font-medium">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {estacion.sedes?.nombre || 'Sin Sede'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
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