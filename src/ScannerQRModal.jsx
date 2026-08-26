import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, AlertCircle, RefreshCw } from 'lucide-react';

export default function ScannerQRModal({ isOpen, onClose, onScanSuccess }) {
  const [errorCamara, setErrorCamara] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrcodeScanner = null;

    if (isOpen) {
      setErrorCamara(null);
      
      // Esperar un instante para asegurar que el elemento DOM existe
      const timer = setTimeout(() => {
        const qrContainer = document.getElementById("qr-reader");
        if (!qrContainer) return;

        html5QrcodeScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrcodeScanner;

        const config = { fps: 10, qrbox: { width: 220, height: 220 } };

        html5QrcodeScanner.start(
          { facingMode: "environment" }, // Prioriza la cámara trasera del celular
          config,
          (decodedText) => {
            // Cuando detecta un QR con éxito
            onScanSuccess(decodedText);
            detenerEscaner(html5QrcodeScanner);
            onClose();
          },
          (errorMessage) => {
            // Errores menores por cuadro sin QR (se pueden ignorar)
          }
        ).catch((err) => {
          console.error("Error al iniciar la cámara:", err);
          setErrorCamara("No se pudo acceder a la cámara. Revisa los permisos de tu navegador o si la conexión es HTTPS/Red local.");
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        detenerEscaner(html5QrcodeScanner);
      };
    }
  }, [isOpen]);

  const detenerEscaner = (scannerInstance) => {
    const instance = scannerInstance || scannerRef.current;
    if (instance && instance.isScanning) {
      instance.stop().then(() => {
        instance.clear();
      }).catch(err => console.error("Error al detener cámara:", err));
    }
  };

  const handleClose = () => {
    detenerEscaner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Encabezado del Modal */}
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Escanear Código QR</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor de la Cámara */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[300px] bg-slate-950 relative">
          {errorCamara ? (
            <div className="text-center p-4 text-rose-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-xs sm:text-sm font-medium">{errorCamara}</p>
              <p className="text-[11px] text-slate-400">Nota: Los navegadores móviles exigen permisos de cámara explícitos.</p>
            </div>
          ) : (
            <div className="w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-blue-500/50 shadow-inner relative">
              <div id="qr-reader" className="w-full"></div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Apunta la cámara del teléfono hacia el código QR del activo.
          </p>
          <button 
            type="button" 
            onClick={handleClose}
            className="mt-3 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}