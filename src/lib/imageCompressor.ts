/**
 * Helper to compress images to web-optimized high resolution with ultra-compact payload size.
 * Uses high-quality canvas sampling, proportional resizing (max 800px),
 * and produces lightweight JPEG/WebP data URLs that fit reliably inside Firestore limits (<1MB).
 * Specifically optimized for mobile cameras (iOS Safari & Android) where 12MP-50MP photos
 * need safe, fast compression without memory crashes or huge PNG fallbacks.
 */

export async function compressImageToWebResolution(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        objectUrl = URL.createObjectURL(file);
      }
    } catch {
      objectUrl = null;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';

    const cleanUp = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };

    const processImageOnCanvas = (targetImg: HTMLImageElement): string => {
      let width = targetImg.naturalWidth || targetImg.width || 800;
      let height = targetImg.naturalHeight || targetImg.height || 600;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not supported');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White background fill for transparent/HEIC images converting to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(targetImg, 0, 0, canvas.width, canvas.height);

      // Try JPEG first at quality 0.65 for ultra-compact cross-platform payload (~30KB - 60KB)
      try {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (jpegDataUrl && jpegDataUrl.startsWith('data:image/jpeg')) {
          return jpegDataUrl;
        }
      } catch {}

      // Try WebP as secondary
      try {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (webpDataUrl && webpDataUrl.startsWith('data:image/webp')) {
          return webpDataUrl;
        }
      } catch {}

      // Fallback
      return canvas.toDataURL('image/jpeg', 0.6);
    };

    img.onload = () => {
      try {
        const result = processImageOnCanvas(img);
        cleanUp();
        resolve(result);
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    img.onerror = () => {
      cleanUp();
      // Fallback to FileReader if object URL fails (e.g. mobile Safari edge case)
      const reader = new FileReader();
      reader.onload = (e) => {
        const fallbackImg = document.createElement('img');
        fallbackImg.onload = () => {
          try {
            const result = processImageOnCanvas(fallbackImg);
            resolve(result);
          } catch {
            resolve((e.target?.result as string) || '');
          }
        };
        fallbackImg.onerror = () => resolve((e.target?.result as string) || '');
        fallbackImg.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
}

export async function compressBase64Image(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) return resolve(base64Str);
    if (base64Str.length < 50000) return resolve(base64Str);

    const img = document.createElement('img');
    img.src = base64Str;
    img.onload = () => {
      let width = img.naturalWidth || img.width || 800;
      let height = img.naturalHeight || img.height || 600;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (jpegDataUrl && jpegDataUrl.startsWith('data:image/jpeg')) {
          return resolve(jpegDataUrl);
        }
      } catch {}

      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
}

export async function compressMultipleImages(files: FileList | File[]): Promise<string[]> {
  const fileArray = Array.from(files);
  const compressedResults: string[] = [];

  for (const file of fileArray) {
    const isImage =
      (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|heic|heif|webp|gif|bmp|tiff?)$/i.test(file.name || '') ||
      (file.size > 0 && (!file.type || file.type === 'application/octet-stream'));

    if (isImage) {
      try {
        const compressed = await compressImageToWebResolution(file, 800, 800, 0.65);
        if (compressed && compressed.startsWith('data:image/')) {
          compressedResults.push(compressed);
        }
      } catch (err) {
        console.error('Error compressing photo:', err);
      }
    }
  }

  return compressedResults;
}
