import { cloudinary, isCloudinaryReady } from '../config/cloudinary.js';
import { env } from '../config/env.js';

/** Signed Cloudinary video URL — expires in 30 minutes. Never store this in DB permanently. */
export function getSignedVideoUrl(publicId: string, fallbackUrl?: string): string {
  if (!publicId) return fallbackUrl || '';
  if (!isCloudinaryReady() || !env.cloudinary.apiSecret) {
    return fallbackUrl || `https://res.cloudinary.com/stub/video/upload/${publicId}`;
  }
  return cloudinary.url(publicId, {
    resource_type: 'video',
    sign_url: true,
    type: 'authenticated',
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
  });
}

export function getVideoUploadSignature() {
  const timestamp = Math.round(Date.now() / 1000);
  if (!isCloudinaryReady() || !env.cloudinary.apiSecret) {
    return {
      timestamp,
      signature: 'stub-dev-signature',
      cloudName: env.cloudinary.cloudName || 'stub',
      apiKey: env.cloudinary.apiKey || 'stub',
      folder: 'canela-coach/exercises',
      stub: true,
    };
  }
  const folder = 'canela-coach/exercises';
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.cloudinary.apiSecret
  );
  return {
    timestamp,
    signature,
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    folder,
    stub: false,
  };
}
