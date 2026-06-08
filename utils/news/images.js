import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { fetchBuffer } from './sourceFetch.js';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER,
  NEWS_IMAGE_HEIGHT,
  NEWS_IMAGE_QUALITY,
  NEWS_IMAGE_WIDTH,
} from './config.js';

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) return;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });
}

export async function processAndUploadImage({ imageUrl, slug, referer }) {
  if (!imageUrl) return { secureUrl: '', publicId: '' };
  if (!process.env.CLOUDINARY_URL && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
    throw new Error('Cloudinary credentials are required for image upload');
  }

  const { buffer, contentType } = await fetchBuffer(imageUrl, { referer });
  if (!contentType.startsWith('image/') || contentType.includes('svg')) {
    throw new Error(`Unsupported image content type: ${contentType || 'unknown'}`);
  }

  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: NEWS_IMAGE_WIDTH, height: NEWS_IMAGE_HEIGHT, fit: 'cover', withoutEnlargement: true })
    .webp({ quality: NEWS_IMAGE_QUALITY })
    .toBuffer();

  configureCloudinary();
  const folder = CLOUDINARY_FOLDER;
  let result;
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const publicId = attempt === 1 ? slug : `${slug}-${attempt}`;
    try {
      result = await uploadBuffer(webp, {
        folder,
        public_id: publicId,
        overwrite: false,
        resource_type: 'image',
        format: 'webp',
        tags: ['football-news', 'football365'],
      });
      break;
    } catch (err) {
      lastError = err;
      if (!/already exists|public id/i.test(err.message || '')) throw err;
    }
  }

  if (!result) throw lastError || new Error('Cloudinary upload failed');

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}
