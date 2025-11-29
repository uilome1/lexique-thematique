export async function POST(req: Request) {
  try {
    const { q, source = "fr", target = "en" } = await req.json();

    if (!q) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    // DeepL API
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY; // À ajouter dans .env.local
    
    if (!DEEPL_API_KEY) {
      return Response.json({ error: "DeepL API key missing" }, { status: 500 });
    }

    // Convertir les codes langue (DeepL utilise "FR", "EN-US", etc.)
    const targetLang = target.toUpperCase() === "EN" ? "EN-US" : target.toUpperCase();
    const sourceLang = source.toUpperCase();

    const url = `https://api-free.deepl.com/v2/translate`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [q],
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DeepL error:", data);
      return Response.json({ error: "Translation failed" }, { status: response.status });
    }

    const translation = data?.translations?.[0]?.text ?? null;

    return Response.json({ translation });
  } catch (err) {
    console.error("Translation error:", err);
    return Response.json({ error: "Translation error" }, { status: 500 });
  }
}