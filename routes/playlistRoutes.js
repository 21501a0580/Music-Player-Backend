const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/playlists/create
// @desc    Create a new playlist
// @access  Private
router.post('/create', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Playlist name is required' });

    const playlist = await Playlist.create({
      name,
      description: description || '',
      createdBy: req.user._id,
    });

    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/playlists/user
// @desc    Get all playlists for current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const playlists = await Playlist.find({ createdBy: req.user._id })
      .populate('songs')
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/playlists/:id
// @desc    Get playlist by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({ path: 'songs', populate: { path: 'uploadedBy', select: 'username' } })
      .populate('createdBy', 'username');

    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    // Only owner can view
    if (playlist.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/playlists/add-song
// @desc    Add a song to a playlist
// @access  Private
router.post('/add-song', protect, async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    if (!playlistId || !songId) return res.status(400).json({ message: 'playlistId and songId required' });

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const song = await Song.findById(songId);
    if (!song) return res.status(404).json({ message: 'Song not found' });

    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push(songId);
    await playlist.save();

    await playlist.populate({ path: 'songs', populate: { path: 'uploadedBy', select: 'username' } });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/playlists/remove-song
// @desc    Remove a song from a playlist
// @access  Private
router.delete('/remove-song', protect, async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    if (!playlistId || !songId) return res.status(400).json({ message: 'playlistId and songId required' });

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    playlist.songs = playlist.songs.filter((id) => id.toString() !== songId);
    await playlist.save();

    await playlist.populate({ path: 'songs', populate: { path: 'uploadedBy', select: 'username' } });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/playlists/delete
// @desc    Delete a playlist
// @access  Private
router.delete('/delete', protect, async (req, res) => {
  try {
    const { playlistId } = req.body;
    if (!playlistId) return res.status(400).json({ message: 'playlistId required' });

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Playlist.findByIdAndDelete(playlistId);
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/playlists/:id/rename
// @desc    Rename a playlist
// @access  Private
router.patch('/:id/rename', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    await playlist.save();

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
