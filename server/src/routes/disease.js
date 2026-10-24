const express = require('express');
const multer = require('multer');
const router = express.Router();

// Keep the image in memory (RAM) instead of saving to disk for speed
const upload = multer({ storage: multer.memoryStorage() });

// Ensure this matches the '/api/detect-disease' URL from your React frontend
router.post('/detect-disease', upload.single('cropImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }

  try {
    // Send the raw image buffer to the Hugging Face Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/VisionaryQuant/5_Crop_Disease_Detection',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': req.file.mimetype,
        },
        body: req.file.buffer, 
      }
    );

    const result = await response.json();

    // The Hugging Face API returns an array of predictions sorted by confidence score
    if (result && result.length > 0) {
      const highestPrediction = result[0];
      
      res.json({
        success: true,
        disease: highestPrediction.label,
        confidence: highestPrediction.score
      });
    } else {
      res.status(500).json({ success: false, error: 'AI model returned empty result' });
    }

  } catch (error) {
    console.error('Hugging Face API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process image' });
  }
});

module.exports = router;