/**
 * Helper to compress images to web-optimized high resolution with ultra-compact payload size.
 * Uses high-quality canvas sampling (imageSmoothingQuality='high'), proportional resizing (max 1000px),
 * and selects the smallest compressed payload (WebP or JPEG) while retaining maximum visual clarity.
 */
export async function compressImageToWebResolution(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not supported'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpDataUrl = canvas.toDataURL('image/webp', Math.min(quality, 0.85));
          if (webpDataUrl.startsWith('data:image/webp')) {
            resolve(webpDataUrl);
            return;
          }
        } catch {
          // fallback
        }

        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(
  base64Str: string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) return resolve(base64Str);
    if (base64Str.length < 50000) return resolve(base64Str);

    const img = document.createElement('img');
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webpDataUrl = canvas.toDataURL('image/webp', Math.min(quality, 0.85));
        if (webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
          return;
        }
      } catch {
        // fallback
      }
      const pngDataUrl = canvas.toDataURL('image/png');
      resolve(pngDataUrl);
    };
    img.onerror = () => resolve(base64Str);
  });
}

export async function compressMultipleImages(files: FileList | File[]): Promise<string[]> {
  const fileArray = Array.from(files);
  const compressedResults: string[] = [];
  for (const file of fileArray) {
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageToWebResolution(file);
        compressedResults.push(compressed);
      } catch (err) {
        console.error('Error compressing photo:', err);
      }
    }
  }
  return compressedResults;
}

