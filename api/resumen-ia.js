export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' })
  }

  try {
    const prompt = req.body.prompt

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      return res.status(response.status).json({ error: data.error?.message || 'Error de Gemini' })
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el resumen.'
    return res.status(200).json({ texto })

  } catch (e) {
    console.error('Handler error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
