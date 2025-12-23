import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mot = searchParams.get("mot") || "";

  const urlGbif = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(
    mot
  )}&limit=1`;

  try {
    const res = await fetch(urlGbif, { cache: "no-store" });

    if (!res.ok) throw new Error("GBIF erreur");

    const gbif = await res.json();

    const taxon = gbif.results?.[0];

    if (!taxon) {
      return NextResponse.json({ erreur: "Aucun résultat" }, { status: 404 });
    }

    const cleaned = {
      source: "GBIF",
      scientificName: taxon.scientificName,
      canonicalName: taxon.canonicalName,
      vernacularName: taxon.vernacularNames?.[0]?.vernacularName || null,
      rank: taxon.rank,
      classification: {
        kingdom: taxon.kingdom,
        phylum: taxon.phylum,
        class: taxon.class,
        order: taxon.order,
        family: taxon.family,
        genus: taxon.genus,
        species: taxon.species
      }
    };

    return NextResponse.json(cleaned);
  } catch {
    return NextResponse.json(
      { erreur: "Erreur lors de l'appel GBIF" },
      { status: 500 }
    );
  }
}
