const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Song = require('../models/Song');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/localUpload');

const SONG_LIBRARY_DIR = path.join(__dirname, '../songLibrary');

// Helper: sanitize a string for use in a filename
// Converts "My Song! (Remix)" → "My_Song_Remix"
function sanitize(str) {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, '')  // strip special chars
    .replace(/\s+/g, '_')               // spaces → underscores
    .slice(0, 60);                       // cap length
}

// @route   GET /api/songs/all
// @desc    Get all songs
// @access  Public
router.get('/all', async (req, res) => {
  try {
    const songs = await Song.find()
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/songs/:id
// @desc    Get single song
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id).populate('uploadedBy', 'username');
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/songs/upload
// @desc    Upload a new song
// @access  Private
router.post('/upload', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const { title, artist } = req.body;
    if (!title || !artist) {
      // Clean up the temp file multer already saved
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Title and artist are required' });
    }

    // ── Rename file to: title_username_YYYY-MM-DD.ext ─────────────────────
    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3';
    const dateStr = new Date().toISOString().slice(0, 10); // "2025-03-15"
    const safeTitle = sanitize(title);
    const safeArtist = sanitize(artist);
    const newFilename = `${safeTitle}_${safeArtist}_${dateStr}${ext}`;
    const newFilePath = path.join(SONG_LIBRARY_DIR, newFilename);

    // If a file with the same name already exists, append a short suffix
    const finalPath = fs.existsSync(newFilePath)
      ? path.join(SONG_LIBRARY_DIR, `${safeTitle}_${safeArtist}_${dateStr}_${Date.now()}${ext}`)
      : newFilePath;

    const finalFilename = path.basename(finalPath);

    fs.renameSync(req.file.path, finalPath);
    // ───────────────────────────────────────────────────────────────────────

    const filePath = `/songLibrary/${finalFilename}`;

    const song = await Song.create({
      title,
      artist,
      fileUrl: filePath,
      uploadedBy: req.user._id,
    });

    await song.populate('uploadedBy', 'username');

    res.status(201).json(song);
  } catch (error) {
    console.error('Upload error:', error);
    // Attempt cleanup on failure
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;