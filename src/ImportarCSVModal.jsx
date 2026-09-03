import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';

export default function ImportarCSVModal({ isOpen, onClose, tipo, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Listas para mapear nombres -> IDs
  const [sedes, setSedes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tiposActivos, setTiposActivos] = useState([]);

  // Selección manual de destino
  const [sedeId, setSedeId] = useState('');
  const [bodegaId, setBodegaId] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFile(null);
    setSedeId('');
    setBodegaId('');
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(false);
  };

// Cargar todos los catálogos necesarios para matchear IDs
  const cargarCatalogos = async () => {
    try {
      const { data: dataSedes } = await supabase.from('sedes').select('id, nombre');
      const { data: dataBodegas } = await supabase.from('bodegas').select('id, nombre, sede_id');
      
      // Tablas con sus nombres correctos en Supabase
      const { data: dataMarcas } = await supabase.from('marcas').select('id, nombre');
      const { data: dataTipos } = await supabase.from('tipos_activo').select('id, nombre');

      setSedes(dataSedes || []);
      setBodegas(dataBodegas || []);
      setMarcas(dataMarcas || []);
      setTiposActivos(dataTipos || []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  if (!isOpen) return null;

  const esConsumible = tipo === 'consumibles';
  const bodegasFiltradas = bodegas.filter((b) => !sedeId || String(b.sede_id) === String(sedeId));

  const handleSedeChange = (e) => {
    const nuevaSede = e.target.value;
    setSedeId(nuevaSede);
    const bodegasDeSede = bodegas.filter((b) => String(b.sede_id) === String(nuevaSede));
    setBodegaId(bodegasDeSede.length > 0 ? bodegasDeSede[0].id : '');
  };

  const descargarPlantilla = () => {
    let headers = [];
    let ejemplo = [];

    if (esConsumible) {
      headers = ['nombre', 'descripcion', 'cantidad_stock', 'stock_minimo'];
      ejemplo = ['Cable UTP Categoria 6', 'Bobina de 305 metros', '10', '2'];
    } else {
      headers = [
        'no_inventario',
        'numero_serie',
        'tipo_activo',
        'marca',
        'modelo',
        'propiedad',
        'estado_operativo'
      ];
      ejemplo = [
        'INV-2026-08',
        'SN-8839201A',
        'Monitor',
        'Dell',
        'Monitor 24 Pulgadas P2422H',
        'Propio',
        'Disponible'
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ejemplo.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `plantilla_importacion_${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Procesar e Insertar a Supabase
  const procesarCSV = () => {
    if (!sedeId || !bodegaId) {
      setErrorMsg('Debes seleccionar una Sede y una Bodega de destino.');
      return;
    }

    if (!file) {
      setErrorMsg('Por favor selecciona un archivo CSV.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      complete: async (results) => {
        const registrosCSV = results.data;

        if (registrosCSV.length === 0) {
          setErrorMsg('El archivo CSV está vacío o no tiene un formato válido.');
          setLoading(false);
          return;
        }

        try {
          const registrosAInsertar = [];

          for (let i = 0; i < registrosCSV.length; i++) {
            const fila = registrosCSV[i];

            if (esConsumible) {
              if (!fila.nombre || !fila.nombre.trim()) {
                throw new Error(`Fila ${i + 2}: El campo "nombre" es obligatorio.`);
              }

              registrosAInsertar.push({
                nombre: fila.nombre.trim(),
                descripcion: fila.descripcion ? fila.descripcion.trim() : null,
                cantidad_stock: Number(fila.cantidad_stock) || 0,
                stock_minimo: Number(fila.stock_minimo) || 0,
                sede_id: sedeId,
                bodega_id: bodegaId,
                estacion_id: null
              });
            } else {
              // --- COINCIDENCIA DE MARCA ---
              let marcaEncontradaId = null;
              if (fila.marca && fila.marca.trim()) {
                const nombreMarca = fila.marca.trim().toLowerCase();
                const m = marcas.find((item) => item.nombre.trim().toLowerCase() === nombreMarca);
                if (m) marcaEncontradaId = m.id;
              }

              // --- COINCIDENCIA DE TIPO DE ACTIVO ---
              let tipoActivoEncontradoId = null;
              if (fila.tipo_activo && fila.tipo_activo.trim()) {
                const nombreTipo = fila.tipo_activo.trim().toLowerCase();
                const t = tiposActivos.find((item) => item.nombre.trim().toLowerCase() === nombreTipo);
                if (t) tipoActivoEncontradoId = t.id;
              }

              const nombreOSpec = fila.modelo || fila.tipo_activo || fila.no_inventario;
              if (!nombreOSpec || !nombreOSpec.trim()) {
                throw new Error(`Fila ${i + 2}: Debe incluir al menos el "modelo", "tipo_activo" o "no_inventario".`);
              }

              // Variables definidas directamente dentro de la iteración
              const valInventario = fila.no_inventario ? fila.no_inventario.trim() : null;
              const valSerial = fila.numero_serie ? fila.numero_serie.trim() : null;
              const valEspec = fila.modelo || fila.especificacion || fila.tipo_activo || null;

              registrosAInsertar.push({
                inventario: valInventario,
                serial: valSerial,
                tipo_activo_id: tipoActivoEncontradoId,
                marca_id: marcaEncontradaId,
                especificacion: valEspec ? valEspec.trim() : null,
                propiedad: fila.propiedad ? fila.propiedad.trim() : 'Propio',
                estado: fila.estado_operativo || fila.estado ? (fila.estado_operativo || fila.estado).trim() : 'Disponible',
                sede_id: sedeId,
                bodega_id: bodegaId,
                estacion_id: null
             });
            }
          }

          const tabla = esConsumible ? 'consumibles' : 'activos';
          const { error } = await supabase.from(tabla).insert(registrosAInsertar);

          if (error) throw error;

          setSuccessMsg(`¡Se importaron ${registrosAInsertar.length} registros exitosamente!`);
          setTimeout(() => {
            onImportSuccess();
            onClose();
          }, 1500);

        } catch (err) {
          console.error('Error al importar:', err);
          setErrorMsg(err.message || 'Ocurrió un error al procesar la importación.');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setErrorMsg('Error al leer el archivo CSV: ' + error.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Importar {esConsumible ? 'Consumibles' : 'Activos'} vía CSV
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Selecciona la Sede y Bodega de destino para ingresar los activos masivamente.
        </p>

        {/* SELECTORES DE SEDE Y BODEGA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sede de Ingreso <span className="text-red-500">*</span>
            </label>
            <select
              value={sedeId}
              onChange={handleSedeChange}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">-- Seleccionar Sede --</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bodega Destino <span className="text-red-500">*</span>
            </label>
            <select
              value={bodegaId}
              onChange={(e) => setBodegaId(e.target.value)}
              disabled={!sedeId}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">-- Seleccionar Bodega --</option>
              {bodegasFiltradas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DESCARGAR PLANTILLA */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-800 font-medium">Formato compatible con registro</span>
          </div>
          <button
            type="button"
            onClick={descargarPlantilla}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla
          </button>
        </div>

        {/* SELECCIÓN DE ARCHIVO */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Seleccionar archivo CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>

        {/* MENSAJES DE ALERTA */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* BOTONES */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={procesarCSV}
            disabled={loading || !file || !bodegaId}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Importando...' : 'Cargar Inventario'}
          </button>
        </div>
      </div>
    </div>
  );
}