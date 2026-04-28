import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import s from '../../styles/PaymentVerificationModal.module.css';

export function PaymentVerificationModal({
  isOpen,
  event,
  onClose,
  onSubmit,
  isLoading = false,
}) {
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError]   = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !event) return null;

  const isValidFile = (f) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/heic'];
    const maxSize = 10 * 1024 * 1024;
    return validTypes.includes(f.type) && f.size <= maxSize;
  };

  const createPreview = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const acceptFile = (f) => {
    if (isValidFile(f)) {
      setFileError(null);
      setFile(f);
      createPreview(f);
    } else {
      setFileError('Please upload an image file (JPG, PNG, HEIC) under 10 MB.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file) {
      setFileError('Please select a proof of payment file before submitting.');
      return;
    }
    await onSubmit(file);
    // Parent controls modal close; reset local state only on success
    setFile(null);
    setPreview(null);
    setFileError(null);
  };

  const price = event.price || 0;

  const paymentMethodLabel =
    event.paymentMethod === 'gcash'   ? 'GCash'
    : event.paymentMethod === 'paymaya' ? 'PayMaya'
    : event.paymentMethod === 'bank'    ? 'Bank Transfer'
    : event.paymentMethod
      ? event.paymentMethod.charAt(0).toUpperCase() + event.paymentMethod.slice(1)
      : 'GCash';

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={s.header}>
          <div>
            <h2 className={s.title}>Payment Verification</h2>
            <p className={s.subtitle}>Complete your payment and upload proof to reserve your spot</p>
          </div>
          <button className={s.closeBtn} onClick={onClose} disabled={isLoading}>
            <X size={24} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className={s.body}>

          {/* Event Info Card */}
          <div className={s.eventCard}>
            <h3 className={s.eventTitle}>{event.title}</h3>
            <p className={s.eventPrice}>₱{price.toLocaleString()}</p>
          </div>

          {/* Payment Information */}
          <div className={s.paymentSection}>
            <div className={s.sectionHeader}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className={s.sectionTitle}>Payment Information</p>
            </div>

            <div className={s.paymentInfo}>
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Payment Method</span>
                <span className={s.infoValue}>{paymentMethodLabel}</span>
              </div>
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Account Name</span>
                <span className={s.infoValue}>{event.accountName || 'Event Host'}</span>
              </div>
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Account Number</span>
                <div className={s.accountRow}>
                  <span className={s.infoValue} style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                    {event.accountNumber || '—'}
                  </span>
                  <button
                    className={s.copyBtn}
                    onClick={() => navigator.clipboard.writeText(event.accountNumber || '')}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Section */}
          <div className={s.instructionsSection}>
            <div className={s.sectionHeader}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className={s.sectionTitle}>Instructions</p>
            </div>
            <ol className={s.instructionsList}>
              <li>Send exactly <strong>₱{price.toLocaleString()}</strong> to the account above</li>
              <li>Take a screenshot or photo of the payment confirmation</li>
              <li>Upload the proof of payment below</li>
              <li>Wait for host verification (usually within 24 hours)</li>
            </ol>
          </div>

          {/* Upload Section */}
          <div className={s.uploadSection}>
            <p className={s.uploadLabel}>UPLOAD PROOF OF PAYMENT</p>


            {/* Inline file error */}
            {fileError && (
              <div className={s.fileError}>
                <AlertCircle size={16} />
                <span>{fileError}</span>
              </div>
            )}

            {!preview ? (
              <div
                className={`${s.uploadBox} ${dragActive ? s.dragActive : ''} ${fileError ? s.uploadBoxError : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={s.uploadIconWrapper}>
                  <Upload size={40} className={s.uploadIcon} />
                </div>
                <p className={s.uploadText}>Drop your file here or click to browse</p>
                <p className={s.uploadSubtext}>Supports: JPG, PNG, HEIC (Max 10MB)</p>
              </div>
            ) : (
              <div className={s.previewContainer}>
                <div className={s.previewWrapper}>
                  <img src={preview} alt="Payment proof preview" className={s.previewImage} />
                  <div className={s.previewOverlay}>
                    <CheckCircle size={32} style={{ color: '#10b981' }} />
                    <span className={s.previewStatus}>Ready to submit</span>
                  </div>
                </div>
                <div className={s.previewInfo}>
                  <div className={s.fileName}>
                    <p className={s.fileNameTitle}>{file.name}</p>
                    <p className={s.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    className={s.removeBtn}
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                    title="Remove file"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </div>

        </div>

        {/* ── Footer ── */}
        <div className={s.footer}>
          <button className={s.btnCancel} onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className={s.btnSubmit} onClick={handleSubmit} disabled={isLoading || !file}>
            {isLoading ? 'Submitting...' : 'Submit Payment Proof'}
          </button>
        </div>

      </div>
    </div>
  );
}