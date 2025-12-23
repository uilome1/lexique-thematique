import { NextResponse } from "next/server";

const WIKTIONARY_API = "https://en.wiktionary.org/api/rest_v1/page/html/";
const WIKTIONARY_FR_API = "https://fr.wiktionary.org/api/rest_v1/page/html/";
const WIKIPEDIA_API = "https://fr.wikipedia.org/api/rest_v1/page/summary/";

function isFrenchWord(word: string) {
  return /^[a-zàâçéèêëîïôûùüÿñæœ-]+$/i.test(word);
}

async function fetchWikipedia(word: string) {
  try {
    const res = await fetch(WIKIPEDIA_API + encodeURIComponent(word));
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.extract || data.extract.length < 15) return null;

    return {
      source: "wikipedia",
      definition: data.extract,
      etymology: null,
      translation: null,
      lang: "fr"
    };
  } catch {
    return null;
  }
}

function cleanHTML(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWiktionarySections(html: string) {
  const cleaned = html.replace(/\n/g, " ");

  let definition = null;
  let etymology = null;
  let translation = null;

  // Definitions
  const defMatch = cleaned.match(/<h[2-4][^>]*>.*?Définition.*?<\/h[2-4]>(.*?)<h[2-4]/i);
  if (defMatch) definition = cleanHTML(defMatch[1]).slice(0, 500);

  // Etymology
  const etyMatch = cleaned.match(/<h[2-4][^>]*>.*?Étymologie.*?<\/h[2-4]>(.*?)<h[2-4]/i);
  if (etyMatch) etymology = cleanHTML(etyMatch[1]).slice(0, 400);

  // Translation (English Wiktionary only)
  const trMatch = cleaned.match(/Traduction.*?<li[^>]*>(.*?)<\/li>/i);
  if (trMatch) translation = cleanHTML(trMatch[1]).split(" ")[0];

  return { definition, etymology, translation };
}

async function fetchWiktionaryFR(word: string) {
  try {
    const res = await fetch(WIKTIONARY_FR_API + encodeURIComponent(word));
    if (!res.ok) return null;

    const html = await res.text();
    const { definition, etymology } = extractWiktionarySections(html);

    if (!definition) return null;

    return {
      source: "wiktionnaire-fr",
      definition,
      etymology,
      translation: null,
      lang: "fr"
    };
  } catch {
    return null;
  }
}

async function fetchWiktionaryEN(word: string) {
  try {
    const res = await fetch(WIKTIONARY_API + encodeURIComponent(word));
    if (!res.ok) return null;

    const html = await res.text();
    const { definition, etymology, translation } = extractWiktionarySections(html);

    if (!definition) return null;

    return {
      source: "wiktionnaire-en",
      definition,
      etymology,
      translation,
      lang: "en"
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { word } = await req.json();
    if (!word) return NextResponse.json({ error: "missing word" });

    // 1) Try Wikipedia FR
    const wiki = await fetchWikipedia(word);
    if (wiki) return NextResponse.json(wiki);

    // 2) Wiktionnaire FR (if FR word)
    if (isFrenchWord(word)) {
      const fr = await fetchWiktionaryFR(word);
      if (fr) return NextResponse.json(fr);
    }

    // 3) Wiktionnaire EN (fallback)
    const en = await fetchWiktionaryEN(word);
    if (en) return NextResponse.json(en);

    return NextResponse.json({ error: "no-definition-found" });
  } catch {
    return NextResponse.json({ error: "server-error" });
  }
}
