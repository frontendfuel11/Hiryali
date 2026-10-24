import express from 'express';

const router = express.Router();

const SYSTEM_PROMPT = `
You are "AgriGuard," an expert AI Agronomist assisting farmers.
1. Speak in simple, accessible, jargon-free language.
2. Provide 2-3 immediate, practical steps the farmer can take right now.
3. Keep responses under 3 short paragraphs.
4. Decline to answer any questions unrelated to farming or agriculture.
`;

async function askHuggingFace(message) {
  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/meta-llama/Meta-Llama-3.1-8B-Instruct',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        parameters: { max_new_tokens: 250, temperature: 0.2, return_full_text: false },
      }),
    }
  );

  if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`);
  const data = await response.json();
  return { reply: data[0]?.generated_text?.trim(), model: 'meta-llama/Meta-Llama-3.1-8B-Instruct' };
}

async function askPollinations(message) {
  const prompt = `${SYSTEM_PROMPT}\n\nFarmer question: ${message}\n\nAnswer in under 3 short paragraphs.`;
  const response = await fetch(
    `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-fast`,
    { headers: { Accept: 'text/plain' } }
  );

  // The anonymous tier allows one reply per 30 seconds.
  if (response.status === 402 || response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const retry = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-fast`,
      { headers: { Accept: 'text/plain' } }
    );
    if (!retry.ok) throw new Error(`Pollinations returned ${retry.status}`);
    return { reply: (await retry.text()).trim(), model: 'gpt-oss-20b' };
  }

  if (!response.ok) throw new Error(`Pollinations returned ${response.status}`);
  return { reply: (await response.text()).trim(), model: 'gpt-oss-20b' };
}

function fallbackReply(message) {
  const text = String(message).toLowerCase();

  if (text.includes('yellow') || text.includes('spot')) {
    return 'Yellow spots often point to a fungal infection or nutrient stress. 1) Check several plants and note whether spots are spreading. 2) Remove badly affected leaves and avoid overhead watering. 3) Ask a local agriculture officer to confirm before spraying anything.';
  }
  if (text.includes('blight')) {
    return 'Late blight spreads fast in cool, humid weather. 1) Remove and discard affected leaves or plants. 2) Improve airflow and keep foliage dry. 3) Use only a fungicide approved for your crop, following the label, and confirm with a local officer.';
  }
  if (text.includes('water') || text.includes('irrig')) {
    return 'Water early in the morning and aim at the soil, not the leaves. 1) Check moisture 5 cm below the surface before watering. 2) Avoid letting water pool around the stem. 3) Reduce watering if leaves stay wet for long periods.';
  }
  if (text.includes('pest') || text.includes('insect') || text.includes('worm')) {
    return 'Inspect the underside of leaves and several plants before treating. 1) Photograph the pest and note the damage pattern. 2) Remove heavily infested leaves. 3) Confirm the pest with a local agriculture officer before choosing a pesticide.';
  }
  return 'I cannot reach the live model right now. General guidance: inspect several plants, note whether the problem is spreading, keep foliage dry, and confirm any treatment with a local agriculture officer before applying it.';
}

router.post('/', async (req, res) => {
  const userMessage = String(req.body?.message || '').trim();

  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  let result;

  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      result = await askHuggingFace(userMessage);
    } catch (error) {
      console.warn('Hugging Face failed, falling back to Pollinations:', error.message);
    }
  }

  if (!result?.reply) {
    try {
      result = await askPollinations(userMessage);
    } catch (error) {
      console.warn('Pollinations failed, using offline fallback:', error.message);
    }
  }

  if (!result?.reply) {
    result = { reply: fallbackReply(userMessage), model: 'offline-fallback', fallback: true };
  }

  res.json({ success: true, reply: result.reply, model: result.model, fallback: result.fallback || false });
});

export default router;
