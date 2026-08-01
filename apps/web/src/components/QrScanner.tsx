import { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from '../lib/icons';

/** Quét QR bằng camera thiết bị (html5-qrcode, chạy offline). */
export default function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  useEffect(() => {
    const id = 'qr-reader';
    const scanner = new Html5Qrcode(id);
    let stopped = false;
    scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (text) => {
        if (stopped) return;
        stopped = true;
        scanner.stop().catch(() => {});
        onResult(text);
      }, () => {})
      .catch(() => {});
    return () => { stopped = true; scanner.stop().catch(() => {}); };
  }, [onResult]);

  return (
    <div>
      <div id="qr-reader" className="rounded-xl overflow-hidden" style={{ width: '100%' }} />
      <button className="btn btn-sm mt-2" onClick={onClose}><X size={14} />Đóng camera</button>
    </div>
  );
}
