import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, Edit2, Trash2, Search, CheckCircle, AlertCircle, Building2, Filter } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Bodegas({ usuario }) {
  const [bodegas, setBodegas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState('');

  // Estado para formulario (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [bodegaEdit, setBodegaEdit] = useState(null);
  const [nombre, setNombre] = useState('');
  const [sedeId, setSedeId] = useState('');

  // Estado para modal de confirmación de eliminación
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, nombre: '' });
  const [eliminando, setEliminando] = useState(false);

  // Feedback
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar sedes para los select
      const { data: dataSedes, error: errSedes } = await supabase
        .from('sedes')
        .select('*')
        .order('nombre', { ascending: true });

      if (errSedes) throw errSedes;
      setSedes(dataSedes || []);

      // Cargar bodegas trayendo la información de la sede vinculada
      const { data: dataBodegas, error: errBodegas } = await supabase
        .from('bodegas')
        .select('*, sedes(nombre)')
        .order('id', { ascending: true });

      if (errBodegas) throw errBodegas;
      setBodegas(dataBodegas || []);

    } catch (err) {
      console.error('Error al cargar datos:', err);
      mostrarMensaje('error', 'No se pudieron cargar las bodegas: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000);
  };

  const abrirModalCrear = () => {
    setBodegaEdit(null);
    setNombre('');
    setSedeId(sedes.length > 0 ? sedes[0].id : '');
    setModalOpen(true);
  };

  const abrirModalEditar = (bodega) => {
    setBodegaEdit(bodega);
    setNombre(bodega.nombre || '');
    setSedeId(bodega.sede_id || '');
    setModalOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !sedeId) return;

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      return;
    }

    setGuardando(true);
    try {
      if (bodegaEdit) {
        // Actualizar mediante RPC
        const { error } = await supabase.rpc('editar_bodega_admin', {
          p_id: bodegaEdit.id,
          p_nombre: nombre.trim(),
          p_sede_id: parseInt(sedeId),
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Bodega actualizada correctamente.');
      } else {
        // Crear mediante RPC
        const { error } = await supabase.rpc('crear_bodega_admin', {
          p_nombre: nombre.trim(),
          p_sede_id: parseInt(sedeId),
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Bodega creada con éxito.');
      }

      setModalOpen(false);
      cargarDatos();
    } catch (err) {
      console.error('Error imprevisto:', err);
      mostrarMensaje('error', 'Error inesperado: ' + (err.message || 'Consulte la consola'));
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminacion = (id, nombreBodega) => {
    setConfirmModal({ open: true, id, nombre: nombreBodega });
  };

  const ejecutarEliminacion = async () => {
    const { id } = confirmModal;

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      return;
    }

    setEliminando(true);
    try {
      const { error } = await supabase.rpc('eliminar_bodega_admin', {
        p_id: id,
        p_usuario_id: usuario.id
      });

      if (error) {
        mostrarMensaje('error', `Error al eliminar (${error.code}): ${error.message}`);
        return;
      }

      mostrarMensaje('exito', 'Bodega eliminada.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar bodega:', err);
      mostrarMensaje('error', 'No se pudo eliminar la bodega.');
    } finally {
      setEliminando(false);
    }
  };

  const bodegasFiltradas = bodegas.filter(b => {
    const coincideNombre = (b.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    const coincideSede = filtroSede ? String(b.sede_id) === String(filtroSede) : true;
    return coincideNombre && coincideSede;
  });

  return (
    <div className="space-y-4">
      {/* Notificaciones */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Controles: Búsqueda, Filtro de Sede y Botón Crear */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          {/* Buscar por Nombre */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar bodega..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtrar por Sede */}
          <div className="relative w-full sm:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
            >
              <option value="">Todas las Sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={abrirModalCrear}
          disabled={sedes.length === 0}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-xs disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Nueva Bodega
        </button>
      </div>

      {/* Tabla de Bodegas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-base">Listado de Bodegas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Nombre de la Bodega</th>
                <th className="px-6 py-3">Sede Asociada</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                    Cargando bodegas...
                  </td>
                </tr>
              ) : bodegasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                    No hay bodegas registradas.
                  </td>
                </tr>
              ) : (
                bodegasFiltradas.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-400 font-medium">#{b.id}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{b.nombre}</td>
                    <td className="px-6 py-3.5 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {b.sedes?.nombre || 'Sin Sede'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(b)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Bodega"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => solicitarEliminacion(b.id, b.nombre)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar Bodega"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-blue-600" />
              {bodegaEdit ? 'Editar Bodega' : 'Nueva Bodega'}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Bodega *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bodega Principal, Stock IT"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sede Asociada *</label>
                <select
                  required
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>Seleccione una sede</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : bodegaEdit ? 'Guardar Cambios' : 'Crear Bodega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">¿Eliminar esta bodega?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estás a punto de eliminar <span className="font-semibold text-slate-800">"{confirmModal.nombre}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setConfirmModal({ open: false, id: null, nombre: '' })}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={ejecutarEliminacion}
                className="w-full py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}