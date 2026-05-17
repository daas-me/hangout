import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Camera } from 'lucide-react';

/**
 * Simple QR Code Scanner Component
 * Uses jsQR library (must be included in index.html or installed via npm)
 */
export function QRScanner({ isOpen, onClose, onScan, eventId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPermission('granted');
        setScanning(true);
      }
    } catch (err) {
      console.error('[QRScanner] Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
        setPermission('denied');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
        setPermission('notfound');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  };

  // Scan for QR code using canvas
  useEffect(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Check if jsQR is available
      if (typeof window.jsQR !== 'function') {
        console.warn('[QRScanner] jsQR library not loaded');
        return;
      }

      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        console.log('[QRScanner] QR Code detected:', code.data);
        setScanning(false);
        stopCamera();
        onScan(code.data);
      }
    }, 500); // Scan every 500ms

    return () => clearInterval(intervalId);
  }, [scanning, onScan]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#13131f',
        borderRadius: 20,
        border: '1px solid rgba(168,85,247,0.3)',
        padding: 0,
        maxWidth: 500,
        width: '100%',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px dashed rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Camera size={20} style={{ color: '#a855f7' }} />
            <h2 style={{
              color: '#f0eeff',
              fontFamily: 'Syne, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
            }}>
              Scan Ticket QR Code
            </h2>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error ? (
            <div style={{
              padding: '20px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{
                  color: '#ef4444',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  margin: '0 0 8px',
                }}>
                  Camera Access Error
                </p>
                <p style={{
                  color: '#9ca3af',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {error}
                </p>
              </div>
            </div>
          ) : scanning ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#0a0a14',
                border: '2px solid rgba(168,85,247,0.3)',
                aspectRatio: '1',
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />

                {/* Scanning frame overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  border: '3px solid rgba(168,85,247,0.5)',
                  borderRadius: 8,
                  margin: '10%',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
                    animation: 'scan 2s infinite',
                  }}>
                    <style>{`
                      @keyframes scan {
                        0% { transform: translateY(0); }
                        50% { transform: translateY(200px); }
                        100% { transform: translateY(0); }
                      }
                    `}</style>
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(168,85,247,0.1)',
                borderRadius: 10,
                border: '1px solid rgba(168,85,247,0.2)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <Loader2 size={16} style={{
                    color: '#a855f7',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <p style={{
                    color: '#a855f7',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: 14,
                    margin: 0,
                  }}>
                    Scanning...
                  </p>
                </div>
                <p style={{
                  color: '#9ca3af',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  margin: 0,
                }}>
                  Position the QR code within the frame
                </p>
              </div>

              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : permission === 'denied' ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
            }}>
              <AlertCircle size={40} style={{
                color: '#fbbf24',
                margin: '0 auto 16px',
              }} />
              <p style={{
                color: '#e5e7eb',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                margin: '0 0 8px',
              }}>
                Camera Permission Denied
              </p>
              <p style={{
                color: '#9ca3af',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                margin: 0,
              }}>
                Please enable camera access in your browser settings to scan QR codes.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
