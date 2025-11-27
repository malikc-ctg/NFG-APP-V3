/**
 * Inventory Photo Handler
 * Handles photo capture, upload, and gallery for inventory transactions
 */

import { PhotoCapture } from './photo-capture.js';
import { supabase } from './supabase.js';
import { toast } from './notifications.js';

const photoCapture = new PhotoCapture();
const MAX_PHOTOS = 5;
let transactionPhotos = []; // Array of { id, blob, url, preview }

// Photo capture modal
let photoCaptureModal = null;
let photoCaptureVideo = null;

/**
 * Initialize photo handlers
 */
export function initInventoryPhotoHandlers() {
  const addPhotoBtn = document.getElementById('stock-add-photo-btn');
  const uploadPhotoBtn = document.getElementById('stock-upload-photo-btn');
  const photoInput = document.getElementById('stock-photo-input');
  
  if (addPhotoBtn) {
    addPhotoBtn.addEventListener('click', openPhotoCaptureModal);
  }
  
  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', () => photoInput?.click());
  }
  
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoFileSelect);
  }
  
  // Clear photos when modal opens/closes
  const stockModal = document.getElementById('stockModal');
  if (stockModal) {
    stockModal.addEventListener('hidden', () => {
      clearTransactionPhotos();
    });
  }
}

/**
 * Open photo capture modal
 */
async function openPhotoCaptureModal() {
  // Check if camera is available
  const isAvailable = await PhotoCapture.isAvailable();
  if (!isAvailable) {
    toast.error('Camera not available on this device', 'Error');
    return;
  }
  
  // Check photo limit
  if (transactionPhotos.length >= MAX_PHOTOS) {
    toast.warning(`Maximum ${MAX_PHOTOS} photos allowed`, 'Photo Limit');
    return;
  }
  
  // Create modal
  photoCaptureModal = document.createElement('div');
  photoCaptureModal.id = 'photo-capture-modal';
  photoCaptureModal.className = 'fixed inset-0 bg-black z-[100] flex flex-col';
  
  photoCaptureModal.innerHTML = `
    <div class="flex-1 relative flex items-center justify-center">
      <video id="photo-capture-video" autoplay playsinline class="w-full h-full object-cover"></video>
      
      <!-- Camera controls overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div class="flex items-center justify-center gap-6">
          <button id="cancel-capture-btn" class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition">
            <i data-lucide="x" class="w-8 h-8 text-white"></i>
          </button>
          <button id="capture-photo-btn" class="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:border-gray-400 transition shadow-lg"></button>
          <button id="flip-camera-btn" class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition">
            <i data-lucide="refresh-cw" class="w-8 h-8 text-white"></i>
          </button>
        </div>
      </div>
      
      <!-- Loading indicator -->
      <div id="photo-capture-loading" class="absolute inset-0 bg-black/50 flex items-center justify-center hidden">
        <div class="text-white text-lg">Starting camera...</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(photoCaptureModal);
  
  if (window.lucide) lucide.createIcons();
  
  photoCaptureVideo = document.getElementById('photo-capture-video');
  const loadingDiv = document.getElementById('photo-capture-loading');
  
  // Show loading
  loadingDiv?.classList.remove('hidden');
  
  // Initialize camera
  const started = await photoCapture.initCamera(photoCaptureVideo, 'environment');
  
  // Hide loading
  loadingDiv?.classList.add('hidden');
  
  if (!started) {
    toast.error('Failed to access camera', 'Error');
    closePhotoCaptureModal();
    return;
  }
  
  // Attach event listeners
  document.getElementById('capture-photo-btn')?.addEventListener('click', capturePhoto);
  document.getElementById('cancel-capture-btn')?.addEventListener('click', closePhotoCaptureModal);
  document.getElementById('flip-camera-btn')?.addEventListener('click', flipCamera);
}

/**
 * Capture photo from camera
 */
async function capturePhoto() {
  if (!photoCaptureVideo) return;
  
  try {
    const blob = await photoCapture.capturePhoto(photoCaptureVideo);
    const compressedBlob = await photoCapture.compressImage(blob, 1920, 0.8);
    addPhotoToGallery(compressedBlob);
    closePhotoCaptureModal();
    toast.success('Photo captured', 'Success');
  } catch (error) {
    console.error('[Inventory Photos] Failed to capture photo:', error);
    toast.error('Failed to capture photo', 'Error');
  }
}

/**
 * Flip camera (front/back)
 */
async function flipCamera() {
  if (!photoCaptureVideo) return;
  
  try {
    await photoCapture.flipCamera(photoCaptureVideo);
  } catch (error) {
    console.error('[Inventory Photos] Failed to flip camera:', error);
    toast.error('Failed to flip camera', 'Error');
  }
}

/**
 * Close photo capture modal
 */
function closePhotoCaptureModal() {
  photoCapture.stopCamera();
  
  if (photoCaptureModal) {
    photoCaptureModal.remove();
    photoCaptureModal = null;
    photoCaptureVideo = null;
  }
}

/**
 * Handle photo file selection
 */
async function handlePhotoFileSelect(event) {
  const files = Array.from(event.target.files || []);
  
  if (files.length === 0) return;
  
  // Check photo limit
  const remainingSlots = MAX_PHOTOS - transactionPhotos.length;
  if (files.length > remainingSlots) {
    toast.warning(`Only ${remainingSlots} photo slot(s) remaining`, 'Photo Limit');
    files.splice(remainingSlots);
  }
  
  // Process each file
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      toast.warning(`Skipping ${file.name}: not an image`, 'Invalid File');
      continue;
    }
    
    try {
      const compressedBlob = await photoCapture.compressImage(file, 1920, 0.8);
      addPhotoToGallery(compressedBlob);
    } catch (error) {
      console.error('[Inventory Photos] Failed to process file:', error);
      toast.error(`Failed to process ${file.name}`, 'Error');
    }
  }
  
  // Reset input
  event.target.value = '';
}

/**
 * Add photo to gallery
 */
function addPhotoToGallery(blob) {
  if (transactionPhotos.length >= MAX_PHOTOS) {
    toast.warning(`Maximum ${MAX_PHOTOS} photos allowed`, 'Photo Limit');
    return;
  }
  
  const photoId = Date.now() + Math.random();
  const previewUrl = URL.createObjectURL(blob);
  
  const photo = {
    id: photoId,
    blob: blob,
    url: null, // Will be set after upload
    preview: previewUrl
  };
  
  transactionPhotos.push(photo);
  renderPhotoGallery();
}

/**
 * Remove photo from gallery
 */
function removePhoto(photoId) {
  const photo = transactionPhotos.find(p => p.id === photoId);
  if (photo && photo.preview) {
    URL.revokeObjectURL(photo.preview);
  }
  
  transactionPhotos = transactionPhotos.filter(p => p.id !== photoId);
  renderPhotoGallery();
}

/**
 * Render photo gallery
 */
function renderPhotoGallery() {
  const gallery = document.getElementById('stock-photo-gallery');
  if (!gallery) return;
  
  gallery.innerHTML = '';
  
  transactionPhotos.forEach(photo => {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'relative aspect-square rounded-lg overflow-hidden border border-nfgray';
    photoDiv.innerHTML = `
      <img src="${photo.preview}" alt="Transaction photo" class="w-full h-full object-cover">
      <button 
        onclick="removeTransactionPhoto(${photo.id})" 
        class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
        title="Remove photo"
      >
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;
    gallery.appendChild(photoDiv);
  });
  
  if (window.lucide) lucide.createIcons();
}

/**
 * Upload photos to Supabase Storage
 * @returns {Promise<string[]>} Array of photo URLs
 */
export async function uploadTransactionPhotos() {
  if (transactionPhotos.length === 0) {
    return [];
  }
  
  // Get current user from Supabase auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }
  
  const photoUrls = [];
  const timestamp = Date.now();
  
  for (let i = 0; i < transactionPhotos.length; i++) {
    const photo = transactionPhotos[i];
    const fileName = `inventory/${user.id}/${timestamp}-${i + 1}.jpg`;
    
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('job-photos') // Reuse job-photos bucket
        .upload(fileName, photo.blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (uploadError) {
        console.error(`[Inventory Photos] Failed to upload photo ${i + 1}:`, uploadError);
        // Continue with other photos
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);
      
      if (urlData?.publicUrl) {
        photoUrls.push(urlData.publicUrl);
      }
    } catch (error) {
      console.error(`[Inventory Photos] Error uploading photo ${i + 1}:`, error);
      // Continue with other photos
    }
  }
  
  return photoUrls;
}

/**
 * Clear transaction photos
 */
export function clearTransactionPhotos() {
  transactionPhotos.forEach(photo => {
    if (photo.preview) {
      URL.revokeObjectURL(photo.preview);
    }
  });
  transactionPhotos = [];
  renderPhotoGallery();
}

/**
 * Get current transaction photos (for form submission)
 */
export function getTransactionPhotos() {
  return transactionPhotos;
}

// Export for global access
window.removeTransactionPhoto = removePhoto;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInventoryPhotoHandlers);
} else {
  initInventoryPhotoHandlers();
}

