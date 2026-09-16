const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const screeningController = require('./screening.controller');

// Ensure upload dir exists
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter
});

const { optionalAuth } = require('../../middlewares/auth.middleware');

router.post('/', optionalAuth, upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'liveFace', maxCount: 1 }
]), screeningController.uploadDocument);

router.get('/', optionalAuth, screeningController.getScreenings);
router.get('/:id', optionalAuth, screeningController.getScreening);
router.get('/:id/document', optionalAuth, screeningController.getDocumentFile);
router.get('/:id/live-face', optionalAuth, screeningController.getLiveFaceFile);

module.exports = router;
