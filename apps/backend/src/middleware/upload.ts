import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPEG, PNG ve WebP dosyaları kabul edilir'));
    }
  },
});

// Sharp ile fotoğraf sıkıştır (WebP, max 1920px, %75 quality)
export async function compressImage(filePath: string): Promise<string> {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(dir, `${base}.webp`);

    await sharp(filePath)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(outputPath);

    // Orijinal dosyayı sil (farklı uzantıysa)
    if (filePath !== outputPath) {
      await fs.unlink(filePath).catch(() => {});
    }

    return path.basename(outputPath);
  } catch (error) {
    console.error('Fotoğraf sıkıştırma hatası:', error);
    // Hata durumunda orijinal dosyayı koru
    return path.basename(filePath);
  }
}

// Thumbnail oluştur (300px, WebP %60)
export async function createThumbnail(filePath: string): Promise<string> {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const thumbPath = path.join(dir, `thumb-${base}.webp`);

    await sharp(filePath)
      .resize({ width: 300, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(thumbPath);

    return path.basename(thumbPath);
  } catch (error) {
    console.error('Thumbnail oluşturma hatası:', error);
    return '';
  }
}
