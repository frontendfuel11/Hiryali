const express = require('express');
const router = express.Router();

// The strict agentic instructions you approved earlier
const SYSTEM_PROMPT = `
You are "AgriGuard," an expert AI Agronomist assisting farmers.
1. Speak in simple, accessible, jargon-free language.
2. Provide 2-3 immediate, practical steps the farmer can take right now.
3. Keep responses under 3 short paragraphs.
4. Decline to answer any questions unrelated to farming or agriculture.
`;

router.post('/', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  try {
    // Calling Meta-Llama-3.1-8B-Instruct on Hugging Face
    const response = await fetch(
      'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${userMessage}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.2, // Low temperature for more factual, less creative advice
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the generated text out of the API response
    let reply = data[0]?.generated_text || "I'm sorry, I couldn't generate a response.";

    res.json({ success: true, reply: reply.trim() });

  } catch (error) {
    console.error('Llama 3 API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to communicate with AI model' });
  }
});

module.exports = router;