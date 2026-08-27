import React, { useState, useEffect } from 'react';
import { Plus, Building2, Radio, AlertCircle, CheckCircle2, X, Edit2, Trash2, Filter, Search, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Estaciones({ userRole = 'admin' }) {
  const [estacionesList, setEstacionesList] = useState([]);
  const [sedesList, setSedesList] = useState([]);
  const [nombre, setNombre] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [loading, setLoading] = useState(true);

  // Formulario desplegable
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Estados de Edición, Filtros
  const [estacionEditando, setEstacionEditando] = useState(null);
  const [filtroSede, setFiltroSede] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  // Estados de Paginación
  const [limiteRegistros, setLimiteRegistros] = useState('25'); // '25', '50', '75', '100', 'todos'
  const [paginaActual, setPaginaActual] = useState(1);

  // Notificaciones Toast
  const [alerta, setAlerta] = useState(null);

  const isAdmin = userRole === 'admin';

  const mostrarNotificacion = (tipo, mensaje) => {
    setAlerta({ tipo, mensaje });
    setTimeout(() => setAlerta(null), 4000);
  };

  useEffect(() => {
    fetchSedesYEstaciones();
  }, []);

  // Cada vez que cambia el filtro o el límite por página, reiniciamos a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroSede, limiteRegistros]);

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

    const existeLocal = estacionesList.some(
      (est) =>
        est.nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
        est.id !== estacionEditando?.id
    );

    if (existeLocal) {
      mostrarNotificacion('error', `La estación "${nombreLimpio}" ya existe.`);
      return;
    }

    if (estacionEditando) {
      const { data, error } = await supabase
        .from('estaciones')
        .update({
          nombre: nombreLimpio,
          sede_id: parseInt(sedeId),
        })
        .eq('id', estacionEditando.id)
        .select(`id, nombre, estado, sede_id, sedes ( nombre )`);

      if (error) {
        mostrarNotificacion('error', 'Error al actualizar: ' + error.message);
      } else if (data) {
        setEstacionesList(
          estacionesList.map((est) => (est.id === estacionEditando.id ? data[0] : est))
        );
        cancelarEdicion();
        mostrarNotificacion('success', 'Estación actualizada correctamente.');
      }
    } else {
      const { data, error } = await supabase
        .from('estaciones')
        .insert([
          {
            nombre: nombreLimpio,
            sede_id: parseInt(sedeId),
            estado: 'Activa',
          },
        ])
        .select(`id, nombre, estado, sede_id, sedes ( nombre )`);

      if (error) {
        if (error.code === '23505') {
          mostrarNotificacion('error', `La estación "${nombreLimpio}" ya está registrada.`);
        } else {
          mostrarNotificacion('error', 'Error al guardar: ' + error.message);
        }
      } else if (data) {
        setEstacionesList([data[0], ...estacionesList]);
        setNombre('');
        setSedeId('');
        setMostrarFormulario(false);
        mostrarNotificacion('success', `Estación "${nombreLimpio}" agregada correctamente.`);
      }
    }
  };

  const iniciarEdicion = (estacion) => {
    setEstacionEditando(estacion);
    setNombre(estacion.nombre);
    setSedeId(estacion.sede_id.toString());
    setMostrarFormulario(true);
  };

  const cancelarEdicion = () => {
    setEstacionEditando(null);
    setNombre('');
    setSedeId('');
    setMostrarFormulario(false);
  };

  const handleEliminar = async (id, nombreEst) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la estación "${nombreEst}"?`)) return;

    const { error } = await supabase.from('estaciones').delete().eq('id', id);

    if (error) {
      mostrarNotificacion('error', 'No se pudo eliminar: ' + error.message);
    } else {
      setEstacionesList(estacionesList.filter((est) => est.id !== id));
      mostrarNotificacion('success', `Estación "${nombreEst}" eliminada.`);
    }
  };

  // 1. Filtrar por búsqueda y sede
  const estacionesFiltradas = estacionesList.filter((estacion) => {
    const coincideSede = filtroSede === 'todas' || estacion.sede_id === parseInt(filtroSede);
    const coincideBusqueda = estacion.nombre.toLowerCase().includes(busqueda.toLowerCase().trim());
    return coincideSede && coincideBusqueda;
  });

  // 2. Cálculos de Paginación
  const registrosPorPagina = limiteRegistros === 'todos' ? estacionesFiltradas.length : parseInt(limiteRegistros);
  const totalPaginas = limiteRegistros === 'todos' ? 1 : Math.ceil(estacionesFiltradas.length / registrosPorPagina) || 1;

  // 3. Cortar array según página actual
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const indiceFin = indiceInicio + registrosPorPagina;
  const estacionesVisibles = limiteRegistros === 'todos' 
    ? estacionesFiltradas 
    : estacionesFiltradas.slice(indiceInicio, indiceFin);

  return (
    <div className="space-y-6 relative">
      {/* Toast Flotante */}
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
          <button onClick={() => setAlerta(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Estaciones de Trabajo</h2>
          <p className="text-sm text-gray-500">Gestión e inventario de estaciones por sede</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              if (mostrarFormulario) {
                cancelarEdicion();
              } else {
                setMostrarFormulario(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
              mostrarFormulario
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {mostrarFormulario ? (
              <>
                <X className="w-4 h-4 text-gray-500" /> Cancelar
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Nueva Estación
              </>
            )}
          </button>
        )}
      </div>

      {/* Formulario Desplegable */}
      {isAdmin && mostrarFormulario && (
        <form onSubmit={handleSubmit} className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl shadow-sm space-y-4 transition-all">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              {estacionEditando ? 'Editar Estación' : 'Registrar Nueva Estación'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre de la estación (ej. PC1N1F1E1)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {estacionEditando ? 'Actualizar Estación' : 'Guardar Estación'}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las Sedes ({sedesList.length})</option>
            {sedesList.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={limiteRegistros}
            onChange={(e) => setLimiteRegistros(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
            <option value="75">75 por página</option>
            <option value="100">100 por página</option>
            <option value="todos">Mostrar todos ({estacionesFiltradas.length})</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
              <th className="p-4">Estación</th>
              <th className="p-4">Sede Asignada</th>
              <th className="p-4">Estado</th>
              {isAdmin && <th className="p-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="p-4 text-center text-gray-400">
                  Cargando estaciones...
                </td>
              </tr>
            ) : estacionesVisibles.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="p-4 text-center text-gray-400">
                  No se encontraron estaciones con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              estacionesVisibles.map((estacion) => (
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
                  {isAdmin && (
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => iniciarEdicion(estacion)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(estacion.id, estacion.nombre)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer con Navegación de Páginas */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Showing {estacionesFiltradas.length > 0 ? indiceInicio + 1 : 0} a{' '}
            {Math.min(indiceFin, estacionesFiltradas.length)} de{' '}
            <strong>{estacionesFiltradas.length}</strong> resultados
          </div>

          {limiteRegistros !== 'todos' && totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              {/* Botón Anterior */}
              <button
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {/* Botones Numerados (Página 1, 2, 3...) */}
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numPagina) => (
                <button
                  key={numPagina}
                  onClick={() => setPaginaActual(numPagina)}
                  className={`px-3 py-1 rounded-lg border font-medium transition-colors ${
                    paginaActual === numPagina
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {numPagina}
                </button>
              ))}

              {/* Botón Siguiente */}
              <button
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                title="Página Siguiente"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}