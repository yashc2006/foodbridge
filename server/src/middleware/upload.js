// Image upload middleware (multer). Accepts JPG/PNG/WEBP up to 5 MB.
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error('Only JPG, PNG or WEBP images are allowed'), { status: 400 }));
  },
});

module.exports = { upload, UPLOAD_DIR };
