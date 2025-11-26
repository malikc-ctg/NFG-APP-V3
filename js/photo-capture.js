/**
 * Photo Capture Component
 * Handles camera access, photo capture, and image compression
 */

export class PhotoCapture {
  constructor() {
    this.cameraStream = null;
    this.currentFacingMode = 'environment'; // 'environment' (back) or 'user' (front)
    this.maxPhotos = 5;
  }
  
  /**
   * Initialize camera with specified facing mode
   * @param {HTMLVideoElement} videoElement - Video element to display camera feed
   * @param {string} facingMode - 'environment' (back) or 'user' (front)
   * @returns {Promise<boolean>} - True if camera initialized successfully
   */
  async initCamera(videoElement, facingMode = 'environment') {
    try {
      // Stop existing stream if any
      this.stopCamera();
      
      this.currentFacingMode = facingMode;
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;
      this.cameraStream = stream;
      
      return true;
    } catch (error) {
      console.error('[PhotoCapture] Camera access failed:', error);
      return false;
    }
  }
  
  /**
   * Capture photo from video element
   * @param {HTMLVideoElement} videoElement - Video element with camera feed
   * @returns {Promise<Blob>} - Captured photo as Blob
   */
  capturePhoto(videoElement) {
    return new Promise((resolve, reject) => {
      if (!videoElement || !videoElement.videoWidth) {
        reject(new Error('Video not ready'));
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to capture photo'));
        }
      }, 'image/jpeg', 0.85);
    });
  }
  
  /**
   * Compress image file
   * @param {File|Blob} file - Image file to compress
   * @param {number} maxWidth - Maximum width (default: 1920)
   * @param {number} quality - JPEG quality 0-1 (default: 0.8)
   * @returns {Promise<Blob>} - Compressed image as Blob
   */
  async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Flip camera (switch between front and back)
   * @param {HTMLVideoElement} videoElement - Video element
   * @returns {Promise<boolean>} - True if flip successful
   */
  async flipCamera(videoElement) {
    const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return await this.initCamera(videoElement, newFacingMode);
  }
  
  /**
   * Stop camera stream
   */
  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }
  
  /**
   * Check if camera is available
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('[PhotoCapture] Error checking camera:', error);
      return false;
    }
  }
}

