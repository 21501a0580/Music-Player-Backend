const fs = require('fs');
const path = require('path');
const multer = require('multer');

const SONG_LIBRARY_DIR = path.join(__dirname, '../songLibrary');

// Ensure songLibrary directory exists
if (!fs.existsSync(SONG_LIBRARY_DIR)) {
    fs.mkdirSync(SONG_LIBRARY_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, SONG_LIBRARY_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /audio\/*|\.mp3|\.wav|\.flac|\.m4a/;
        if (allowedTypes.test(file.mimetype) || allowedTypes.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

module.exports = upload;