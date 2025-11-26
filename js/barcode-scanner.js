// ============================================
// Barcode & QR Code Scanner Component
// ============================================
// Phase 2.1: Mobile-optimized barcode scanner
// ============================================

export class MobileBarcodeScanner {
  constructor(containerId) {
    this.containerId = containerId;
    this.scanner = null;
    this.isScanning = false;
    this.onScanCallback = null;
    this.onErrorCallback = null;
    this.audioEnabled = true;
    this.vibrateEnabled = true;
  }
  
  /**
   * Initialize scanner and request camera permissions
   */
  async init() {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the stream immediately (we just wanted permission)
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Camera access denied:', error);
      return false;
    }
  }
  
  /**
   * Load Html5Qrcode library dynamically
   */
  async loadScannerLibrary() {
    return new Promise((resolve, reject) => {
      if (window.Html5Qrcode) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@latest/html5-qrcode.min.js';
      script.onload = () => {
        if (window.Html5Qrcode) {
          resolve();
        } else {
          reject(new Error('Html5Qrcode library failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Html5Qrcode library'));
      document.head.appendChild(script);
    });
  }
  
  /**
   * Start scanning for barcodes/QR codes
   */
  async startScanning(onSuccess, onError) {
    if (this.isScanning) {
      console.warn('Scanner is already running');
      return false;
    }
    
    try {
      // Load library if not already loaded
      await this.loadScannerLibrary();
      
      const container = document.getElementById(this.containerId);
      if (!container) {
        throw new Error(`Container element #${this.containerId} not found`);
      }
      
      // Create scanner instance
      this.scanner = new Html5Qrcode(this.containerId);
      
      const config = {
        fps: 10, // Frames per second
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment' // Use back camera on mobile
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ]
      };
      
      // Store callbacks
      this.onScanCallback = onSuccess;
      this.onErrorCallback = onError;
      
      // Start scanning
      await this.scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          this.handleScanSuccess(decodedText, decodedResult, onSuccess);
        },
        (errorMessage) => {
          // Ignore frequent scanning errors (they're normal when no code is detected)
          // Only report actual errors
          if (errorMessage.includes('No MultiFormat Readers') || 
              errorMessage.includes('NotFoundException')) {
            // These are normal - ignore
            return;
          }
          
          // Report other errors if callback is set
          if (onError && typeof onError === 'function') {
            onError(errorMessage);
          }
        }
      );
      
      this.isScanning = true;
      console.log('✅ Barcode scanner started');
      return true;
    } catch (error) {
      console.error('Failed to start scanner:', error);
      this.isScanning = false;
      if (onError) onError(error);
      return false;
    }
  }
  
  /**
   * Handle successful scan
   */
  handleScanSuccess(decodedText, decodedResult, callback) {
    // Stop scanning after successful scan
    this.stopScanning();
    
    // Play success sound
    if (this.audioEnabled) {
      this.playBeepSound();
    }
    
    // Vibrate (mobile devices)
    if (this.vibrateEnabled && navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    // Call callback with scanned data
    if (callback && typeof callback === 'function') {
      callback(decodedText, decodedResult);
    }
    
    // Also call stored callback if different
    if (this.onScanCallback && this.onScanCallback !== callback) {
      this.onScanCallback(decodedText, decodedResult);
    }
  }
  
  /**
   * Play beep sound on successful scan
   */
  playBeepSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Beep frequency
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Audio not supported or blocked - silently fail
      console.debug('Audio playback not available:', error);
    }
  }
  
  /**
   * Stop scanning
   */
  async stopScanning() {
    if (!this.isScanning || !this.scanner) {
      return true;
    }
    
    try {
      await this.scanner.stop();
      await this.scanner.clear();
      this.scanner = null;
      this.isScanning = false;
      console.log('✅ Barcode scanner stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop scanner:', error);
      // Force cleanup
      this.scanner = null;
      this.isScanning = false;
      return false;
    }
  }
  
  /**
   * Scan barcode from uploaded image file
   */
  async scanFromFile(file) {
    try {
      // Load library if not already loaded
      await this.loadScannerLibrary();
      
      const container = document.getElementById(this.containerId);
      if (!container) {
        throw new Error(`Container element #${this.containerId} not found`);
      }
      
      // Create temporary scanner instance for file scanning
      if (!this.scanner) {
        this.scanner = new Html5Qrcode(this.containerId);
      }
      
      // Scan file
      const result = await this.scanner.scanFile(file, false);
      
      return result;
    } catch (error) {
      console.error('File scan failed:', error);
      
      // Check if it's a "not found" error (no code in image)
      if (error.message && error.message.includes('NotFoundException')) {
        return null; // No code found - return null instead of throwing
      }
      
      throw error;
    }
  }
  
  /**
   * Toggle flash/torch (if supported)
   */
  async toggleFlash() {
    // This requires additional implementation with MediaStreamTrack
    // For now, return false (not implemented)
    console.warn('Flash toggle not yet implemented');
    return false;
  }
  
  /**
   * Check if flash is available
   */
  async isFlashAvailable() {
    // Check if flash/torch is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        // Stop stream
        stream.getTracks().forEach(t => t.stop());
        
        return capabilities.torch || false;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
  
  /**
   * Enable/disable audio feedback
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
  }
  
  /**
   * Enable/disable vibration feedback
   */
  setVibrateEnabled(enabled) {
    this.vibrateEnabled = enabled;
  }
  
  /**
   * Get scanner status
   */
  getStatus() {
    return {
      isScanning: this.isScanning,
      containerId: this.containerId,
      audioEnabled: this.audioEnabled,
      vibrateEnabled: this.vibrateEnabled
    };
  }
}

// Export for use in console/testing
window.MobileBarcodeScanner = MobileBarcodeScanner;

