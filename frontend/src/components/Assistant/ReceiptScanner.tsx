import React, { useState } from 'react';
import { api } from '../../services/api.client.js';

interface ReceiptScannerProps {
  onScanCompleted: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onScanCompleted }) => {
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setParsedData(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit formats to Image/PDF
    if (!['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or an Image file (JPEG/PNG/GIF).');
      return;
    }

    setLoading(true);
    try {
      const result = await api.uploadUtilityBill(file);
      setParsedData(result);
    } catch (err) {
      setError('Utility bill scanner failed. Try typing your consumption details directly to the Eco-Coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScannedLog = async () => {
    if (!parsedData) return;
    try {
      const category = 'Utilities';
      const isGas = parsedData.utilityType === 'Gas';
      const value = isGas ? parsedData.gasThermsUsed : parsedData.kwhUsed;
      const unit = isGas ? 'therms' : 'kWh';

      if (value === undefined) {
        alert('Could not find energy usage values. Log manually instead.');
        return;
      }

      await api.logEmissions(category, value, unit);
      
      // Clear states
      setParsedData(null);
      onScanCompleted();
      alert('Successfully recorded utility invoice to database!');
    } catch (err) {
      alert('Failed to log carbon event.');
    }
  };

  return (
    <div className="glass-card">
      <h2>Utility Bill OCR Scanner</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        Extract consumption metrics from PDF/Image invoices using Gemini Vision
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label 
            htmlFor="utility-scanner-file" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              border: '2px dashed var(--card-border)', 
              borderRadius: '12px', 
              padding: '24px', 
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.01)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</span>
            <span style={{ fontWeight: 600 }}>Click to Upload Utility Bill</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Supports PDF or JPG/PNG image files</span>
            
            <input 
              id="utility-scanner-file" 
              type="file" 
              accept=".pdf,image/*" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
            Processing document via Gemini Vision...
          </div>
        )}

        {error && (
          <div role="alert" style={{ color: 'var(--accent-error)', fontSize: '0.9rem', fontWeight: 600 }}>
            ❌ {error}
          </div>
        )}

        {parsedData && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Scanned Invoice Results</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Utility Category:</span>
                <span style={{ fontWeight: 600 }}>{parsedData.utilityType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Invoice Cost:</span>
                <span style={{ fontWeight: 600 }}>${parsedData.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Consumption Volume:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>
                  {parsedData.utilityType === 'Gas' 
                    ? `${parsedData.gasThermsUsed} therms` 
                    : `${parsedData.kwhUsed} kWh`}
                </span>
              </div>
            </div>

            <button 
              onClick={handleSaveScannedLog}
              className="btn-primary" 
              style={{ width: '100%' }}
            >
              Confirm & Save to Logs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
