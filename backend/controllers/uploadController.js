import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config.js';

const router = express.Router();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit to 5MB
  },
});

// Configure S3 Client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: 'https://nyc3.digitaloceanspaces.com', // DigitalOcean Spaces endpoint
  region: 'nyc3',
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderName = 'profiles';
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Parameters for upload
    const uploadParams = {
      Bucket: config.SPACES_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Public URL of the file
    const imageUrl = `https://${config.SPACES_BUCKET}.nyc3.digitaloceanspaces.com/${fileName}`;
    console.log('Profile Image URL:', imageUrl);
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Upload program logo
export const uploadProgramLogo = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderName = 'programs';
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Parameters for upload
    const uploadParams = {
      Bucket: config.SPACES_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Public URL of the file
    const imageUrl = `https://${config.SPACES_BUCKET}.nyc3.digitaloceanspaces.com/${fileName}`;
    console.log('Program Logo URL:', imageUrl);
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading program logo:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Upload book image
export const uploadBookImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderName = 'books';
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Parameters for upload
    const uploadParams = {
      Bucket: config.SPACES_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Public URL of the file
    const imageUrl = `https://${config.SPACES_BUCKET}.nyc3.digitaloceanspaces.com/${fileName}`;
    console.log('Book Image URL:', imageUrl);
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading book image:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Upload bible study photo
export const uploadBibleStudyPhoto = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderName = 'bible-studies';
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Parameters for upload
    const uploadParams = {
      Bucket: config.SPACES_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Public URL of the file
    const imageUrl = `https://${config.SPACES_BUCKET}.nyc3.digitaloceanspaces.com/${fileName}`;
    console.log('Bible Study Photo URL:', imageUrl);
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading bible study photo:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

export default {
  uploadProfileImage,
  uploadProgramLogo,
  uploadBookImage,
  uploadBibleStudyPhoto
};