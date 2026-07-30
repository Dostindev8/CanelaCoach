import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { Readable } from 'stream';

let configured = false;

export function configureCloudinary(): void {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey) {
    console.warn('[cloudinary] no configurado — uploads usarán stub local');
    return;
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
  console.log('[cloudinary] configurado');
}

export function isCloudinaryReady(): boolean {
  return configured;
}

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; public_id: string; resource_type?: 'image' | 'raw' | 'video' | 'auto' }
): Promise<{ secure_url: string; public_id: string }> {
  if (!configured) {
    const stub = `data:application/octet-stream;base64,${buffer.subarray(0, 32).toString('base64')}...`;
    return {
      secure_url: `https://res.cloudinary.com/stub/${options.folder}/${options.public_id}`,
      public_id: `${options.folder}/${options.public_id}`,
    };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        resource_type: options.resource_type || 'auto',
        overwrite: true,
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Cloudinary upload failed'));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

export { cloudinary };
