import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Sedes({ usuario }) {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Estado para formulario (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [sedeEdit, setSedeEdit] = useState(null);
  const [nombre, setNombre] = useState('');
  
  // Estado para modal de confirmación de eliminación
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, nombre: '' });
  const [eliminando, setEliminando] = useState(false);

  // Feedback
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarSedes();
  }, []);

  const cargarSedes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setSedes(data || []);
    } catch (err) {
      console.error('Error al cargar sedes:', err);
      mostrarMensaje('error', 'No se pudieron cargar las sedes: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000);
  };

  const abrirModalCrear = () => {
    setSedeEdit(null);
    setNombre('');
    setModalOpen(true);
  };

  const abrirModalEditar = (sede) => {
    setSedeEdit(sede);
    setNombre(sede.nombre || '');
    setModalOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      return;
    }

    setGuardando(true);
    try {
      if (sedeEdit) {
        // Actualizar mediante función RPC segura
        const { error } = await supabase.rpc('editar_sede_admin', {
          p_id: sedeEdit.id,
          p_nombre: nombre.trim(),
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Sede actualizada correctamente.');
      } else {
        // Crear nuevo mediante función RPC segura
        const { error } = await supabase.rpc('crear_sede_admin', {
          p_nombre: nombre.trim(),
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Sede creada con éxito.');
      }

      setModalOpen(false);
      cargarSedes();
    } catch (err) {
      console.error('Error imprevisto:', err);
      mostrarMensaje('error', 'Error inesperado: ' + (err.message || 'Consulte la consola'));
    } finally {
      setGuardando(false);
    }
  };

  // Abre el modal bonito
  const solicitarEliminacion = (id, nombreSede) => {
    setConfirmModal({ open: true, id, nombre: nombreSede });
  };

  // Ejecuta la eliminación al hacer clic en "Sí, eliminar"
  const ejecutarEliminacion = async () => {
    const { id } = confirmModal;

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      return;
    }

    setEliminando(true);
    try {
      // Eliminar mediante función RPC segura
      const { error } = await supabase.rpc('eliminar_sede_admin', {
        p_id: id,
        p_usuario_id: usuario.id
      });

      if (error) {
        mostrarMensaje('error', `Error al eliminar (${error.code}): ${error.message}`);
        return;
      }

      mostrarMensaje('exito', 'Sede eliminada.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      cargarSedes();
    } catch (err) {
      console.error('Error al eliminar sede:', err);
      mostrarMensaje('error', 'No se pudo eliminar la sede.');
    } finally {
      setEliminando(false);
    }
  };

  const sedesFiltradas = sedes.filter(s =>
    (s.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

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

      {/* Controles: Búsqueda y Botón Crear */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar sede por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={abrirModalCrear}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> Nueva Sede Version 2
        </button>
      </div>

      {/* Tabla de Sedes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-base">Listado de Sedes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Nombre de la Sede</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                    Cargando sedes...
                  </td>
                </tr>
              ) : sedesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                    No hay sedes registradas.
                  </td>
                </tr>
              ) : (
                sedesFiltradas.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-400 font-medium">#{s.id}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{s.nombre}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(s)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Sede"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => solicitarEliminacion(s.id, s.nombre)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar Sede"
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
              <Building2 className="w-5 h-5 text-blue-600" />
              {sedeEdit ? 'Editar Sede' : 'Nueva Sede'}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Sede *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sede Central, Edificio Norte"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {guardando ? 'Guardando...' : sedeEdit ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación Custom */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">¿Eliminar esta sede?</h3>
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