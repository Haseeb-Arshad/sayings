// routes/transcriptionRoutes.js

const express = require('express');
const router = express.Router();
const transcriptionController = require('../controllers/transcriptionController');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');


// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/tmp/my-uploads'); // Specify your upload directory
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now());
//   },
// });


// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // Limit to 30MB
});

// Error handling middleware for multer
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    console.error('Multer Error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 30MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred when uploading.
    console.error('Unknown Upload Error:', err);
    return res.status(500).json({ error: 'An unknown error occurred during file upload.' });
  }
  // Everything went fine.
  next();
}

// Route to handle audio transcription
router.post('/', authMiddleware, upload.single('file'), multerErrorHandler, transcriptionController.transcribeAudio);

module.exports = router;
