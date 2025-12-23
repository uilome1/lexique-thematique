// 1. On définit précisément la structure attendue
interface TaxRefData {
  scientificName: string;
  vernacularName?: string; // le '?' car il peut être absent
  rank: string;
  classification: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
}

// 2. On applique l'interface au composant
export default function TaxRefCard({ data }: { data: TaxRefData }) {
  if (!data) return null;

  return (
    <div className="result-card">
      <h2>{data.scientificName}</h2>

      {data.vernacularName && (
        <p><strong>Nom commun :</strong> {data.vernacularName}</p>
      )}

      <p><strong>Rang :</strong> {data.rank}</p>

      <h3>Classification</h3>
      <ul>
        <li><strong>Règne :</strong> {data.classification.kingdom}</li>
        <li><strong>Phylum :</strong> {data.classification.phylum}</li>
        <li><strong>Classe :</strong> {data.classification.class}</li>
        <li><strong>Ordre :</strong> {data.classification.order}</li>
        <li><strong>Famille :</strong> {data.classification.family}</li>
        <li><strong>Genre :</strong> {data.classification.genus}</li>
        <li><strong>Espèce :</strong> {data.classification.species}</li>
      </ul>
    </div>
  );
}