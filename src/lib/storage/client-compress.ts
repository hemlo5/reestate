'use client';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses image files in the browser via HTMLCanvas before uploading
 * so multi-MB camera/desktop images shrink to crisp WebP/JPEG assets.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1200, quality = 0.82 } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode image'));
      el.src = dataUrl;
    });

    let { width, height } = img;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

export async function uploadMediaFile(params: {
  file: File;
  purpose: 'property' | 'avatar' | 'verification';
}): Promise<{ key: string; url: string; fileName: string }> {
  const processed =
    params.file.type.startsWith('image/') && params.purpose !== 'verification'
      ? await compressImageFile(params.file, {
          maxWidth: params.purpose === 'avatar' ? 600 : 1600,
          maxHeight: params.purpose === 'avatar' ? 600 : 1200,
          quality: 0.84,
        })
      : params.file;

  const form = new FormData();
  form.append('file', processed);
  form.append('purpose', params.purpose);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as {
    key?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url || !data.key) {
    throw new Error(data.error || 'Failed to upload file');
  }
  return {
    key: data.key,
    url: data.url,
    fileName: params.file.name,
  };
}
