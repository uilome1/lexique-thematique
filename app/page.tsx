"use client";

import React, { useEffect, useState } from "react";

// Génère un identifiant unique pour chaque mot
const generateId = () => {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
};

export default function LexiquePage() {
  const [dossier, setDossier] = useState("");
  const [mot, setMot] = useState("");
  const [definition, setDefinition] = useState("");
  const [mots, setMots] = useState<
    { id: string; mot: string; dossier: string; definition: string; visible: boolean }[]
  >([]);
  const [filtre, setFiltre] = useState("");
  const [source, setSource] = useState("wikipedia");
  const [chargement, setChargement] = useState(false);

  // Charger depuis localStorage avec normalisation
  useEffect(() => {
    const sauvegarde = localStorage.getItem("lexique");
    if (sauvegarde) {
      try {
        const parsed = JSON.parse(sauvegarde);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: any) => {
            if (!item.id) return { ...item, id: generateId(), visible: false };
            return { ...item, visible: false };
          });
          setMots(normalized);
        }
      } catch (e) {
        console.error("Erreur de parsing du localStorage:", e);
      }
    }
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem("lexique", JSON.stringify(mots));
  }, [mots]);

  // Filtrage
  const motsFiltres = mots.filter((m) =>
    m.dossier.toLowerCase().includes(filtre.toLowerCase())
  );

  // Ajouter un mot
  const ajouterMot = () => {
    if (!mot.trim() || !dossier.trim()) return;
    const nouveau = {
      id: generateId(),
      mot,
      dossier,
      definition: definition.trim(),
      visible: false,
    };
    setMots([...mots, nouveau]);
    setMot("");
    setDefinition("");
  };

  // Basculer la visibilité d'une définition
  const toggleDefinition = (id: string) => {
    setMots((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
    );
  };

  // Supprimer un mot
  const supprimerMot = (id: string) => {
    setMots((prev) => prev.filter((m) => m.id !== id));
  };

  // Recherche sur le web (selon source)
  const chercherSurWeb = async () => {
    if (!mot) return;
    setChargement(true);
    let texte = "";

    try {
      if (source === "wikipedia") {
        const res = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            mot
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          texte = data.extract || "(Aucune définition trouvée)";
        } else texte = "(Erreur Wikipedia)";
      } else if (source === "wiktionnaire") {
        const res = await fetch(
          `https://fr.wiktionary.org/api/rest_v1/page/summary/${encodeURIComponent(
            mot
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          texte = data.extract || "(Aucune définition trouvée)";
        } else texte = "(Erreur Wiktionnaire)";
      } else if (source === "inpn") {
        // INPN avec fallback Wikipédia
        const url = `https://taxref.mnhn.fr/api/taxa/search?query=${encodeURIComponent(
          mot
        )}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const esp = data[0];
            texte = `Nom scientifique : ${
              esp.scientificName || "?"
            }\nNom vernaculaire : ${
              esp.vernacularName || "?"
            }\nRang : ${esp.rank || "?"}`;
          } else {
            // fallback Wikipédia
            const wikiRes = await fetch(
              `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
                mot
              )}`
            );
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              texte = wikiData.extract || "(Aucune définition trouvée sur Wikipédia)";
            } else {
              texte = "(Aucun résultat trouvé dans l’INPN, et Wikipédia indisponible)";
            }
          }
        } else {
          texte = "(Erreur lors de la recherche INPN)";
        }
      }
    } catch (e) {
      texte = "(Erreur réseau ou format inattendu)";
    }

    setDefinition(texte);
    setChargement(false);
  };

  return (
    <main className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Colonne gauche : formulaire */}
      <section className="w-1/3 bg-white shadow-md p-6 border-r border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">🗂️ Mon Lexique</h1>

        <label className="block text-sm font-medium text-gray-600 mb-1">
          Dossier / Thème
        </label>
        <input
          type="text"
          value={dossier}
          onChange={(e) => setDossier(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
          placeholder="ex : Bibliothèque"
        />

        <label className="block text-sm font-medium text-gray-600 mb-1">
          Mot à définir
        </label>
        <input
          type="text"
          value={mot}
          onChange={(e) => setMot(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
          placeholder="ex : Dépouillement"
        />

        <div className="flex items-center gap-2 mb-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="wikipedia">Wikipédia</option>
            <option value="wiktionnaire">Wiktionnaire</option>
            <option value="inpn">INPN / Taxref</option>
          </select>
          <button
            onClick={chercherSurWeb}
            disabled={chargement}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {chargement ? "Recherche..." : "Chercher"}
          </button>
        </div>

        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 h-32 mb-3"
          placeholder="Saisir ou modifier la définition ici..."
        />

        <button
          onClick={ajouterMot}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Ajouter au lexique
        </button>
      </section>

      {/* Colonne droite : affichage */}
      <section className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-700">📘 Lexique complet</h2>
          <input
            type="text"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Filtrer par dossier..."
            className="border border-gray-300 rounded-md px-3 py-1"
          />
        </div>

        {motsFiltres.length === 0 && (
          <p className="text-gray-500 italic">Aucun mot enregistré.</p>
        )}

        <ul className="space-y-4">
          {motsFiltres.map((m) => (
            <li key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <strong className="text-lg text-blue-700">{m.mot}</strong>{" "}
                  <em className="text-sm text-gray-500">({m.dossier})</em>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDefinition(m.id)}
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {m.visible ? "👁️ Masquer" : "👁️ Afficher"}
                  </button>
                  <button
                    onClick={() => supprimerMot(m.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ❌ Supprimer
                  </button>
                </div>
              </div>
              {m.visible && (
                <p className="text-gray-700 whitespace-pre-line bg-gray-50 border border-gray-200 p-3 rounded-md">
                  {m.definition || "(Aucune définition enregistrée)"}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
