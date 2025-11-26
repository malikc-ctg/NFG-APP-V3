// ============================================
// Barcode & QR Code Generator
// ============================================
// Phase 2.1: Generate barcodes and QR codes for inventory items
// ============================================

import { supabase } from './supabase.js';

export class BarcodeGenerator {
  /**
   * Generate a unique barcode for an item
   * Format: INV-{timestamp}-{itemId}
   */
  static async generateBarcode(itemId, itemName) {
    try {
      // Call Supabase function to generate barcode
      const { data, error } = await supabase.rpc('generate_item_barcode', {
        item_id: itemId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback: Generate client-side
      const timestamp = Date.now();
      const barcode = `INV-${timestamp}-${itemId}`;
      return barcode;
    }
  }
  
  /**
   * Generate QR code data and image for an item
   */
  static async generateQRCode(itemId, itemName, siteId = null) {
    // Load QRCode library dynamically
    if (!window.QRCode) {
      await this.loadQRCodeLibrary();
    }
    
    const qrData = {
      type: 'inventory_item',
      item_id: itemId,
      name: itemName,
      site_id: siteId,
      code: await this.generateBarcode(itemId, itemName),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    try {
      // Generate QR code image (data URL)
      const qrImageDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#0D47A1', // NFG blue
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return {
        data: qrData,
        image: qrImageDataUrl,
        dataUrl: qrImageDataUrl
      };
    } catch (error) {
      console.error('QR code generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Load QRCode library from CDN
   */
  static async loadQRCodeLibrary() {
    return new Promise((resolve, reject) => {
      if (window.QRCode) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = () => {
        // QRCode library uses global QRCode variable
        if (window.QRCode) {
          resolve();
        } else {
          reject(new Error('QRCode library failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load QRCode library'));
      document.head.appendChild(script);
    });
  }
  
  /**
   * Upload QR code image to Supabase Storage
   */
  static async uploadQRCodeToStorage(itemId, qrImageBlob) {
    try {
      const fileName = `qr-codes/${itemId}.png`;
      const path = `inventory-assets/${fileName}`;
      
      // Convert data URL to blob if needed
      let blob = qrImageBlob;
      if (typeof qrImageBlob === 'string' && qrImageBlob.startsWith('data:')) {
        blob = await this.dataURLToBlob(qrImageBlob);
      }
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('inventory-assets')
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png'
        });
      
      if (error) {
        // If bucket doesn't exist, create it programmatically (may not work)
        if (error.message.includes('Bucket not found')) {
          console.warn('Storage bucket "inventory-assets" not found. Please create it in Supabase Dashboard.');
          return null;
        }
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inventory-assets')
        .getPublicUrl(path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload QR code:', error);
      throw error;
    }
  }
  
  /**
   * Convert data URL to Blob
   */
  static async dataURLToBlob(dataURL) {
    const response = await fetch(dataURL);
    return await response.blob();
  }
  
  /**
   * Generate and upload QR code for an item
   * Returns the QR code URL
   */
  static async generateAndUploadQRCode(itemId, itemName, siteId = null) {
    try {
      // Generate QR code
      const qrCode = await this.generateQRCode(itemId, itemName, siteId);
      
      // Convert data URL to blob
      const blob = await this.dataURLToBlob(qrCode.image);
      
      // Upload to storage
      const qrUrl = await this.uploadQRCodeToStorage(itemId, blob);
      
      return {
        ...qrCode,
        url: qrUrl
      };
    } catch (error) {
      console.error('Failed to generate and upload QR code:', error);
      throw error;
    }
  }
  
  /**
   * Parse QR code data from scanned string
   */
  static parseQRCodeData(scannedText) {
    try {
      const data = JSON.parse(scannedText);
      
      // Validate QR code structure
      if (data.type === 'inventory_item' && data.item_id) {
        return data;
      }
      
      return null;
    } catch (error) {
      // Not valid JSON or not our QR code format
      return null;
    }
  }
  
  /**
   * Generate barcode for existing items (bulk operation)
   */
  static async generateBarcodesForExistingItems() {
    try {
      // Get items without barcodes
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, name')
        .is('barcode', null)
        .limit(100); // Process in batches
      
      if (error) throw error;
      
      const results = [];
      
      for (const item of items) {
        try {
          const barcode = await this.generateBarcode(item.id, item.name);
          const qrCode = await this.generateAndUploadQRCode(item.id, item.name);
          
          // Update item with barcode
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              barcode: barcode,
              barcode_type: 'CODE128',
              qr_code_url: qrCode.url
            })
            .eq('id', item.id);
          
          if (updateError) throw updateError;
          
          results.push({ item_id: item.id, barcode, success: true });
        } catch (error) {
          console.error(`Failed to generate barcode for item ${item.id}:`, error);
          results.push({ item_id: item.id, success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Bulk barcode generation failed:', error);
      throw error;
    }
  }
}

// Export for use in console/testing
window.BarcodeGenerator = BarcodeGenerator;

