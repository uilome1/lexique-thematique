"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Lexique v1 — Dossier obligatoire
 * - dossier must be set (create/select)
 * - search word (Wikipedia, Wiktionnaire)
 * - options: mots proches (Datamuse), traduire en anglais
 * - persistance per-dossier in localStorage
 * - edit / delete entries
 * - filter entries (search within selected dossier)
 */

// Types
type Entry = {
  id: string;
  mot: string;
  definition: string;
  source?: string; // "wikipedia" | "wiktionnaire" | "manuel"
  traduction?: string | null;
  motsProches?: string[];
  isEditing?: boolean;
  showDefinition?: boolean;
};

const LS_KEY = "lexique_by_dossier_v1";

function generateId() {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2, 9);
}

export default function Page() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  // dossier management
  const [dossierInput, setDossierInput] = useState("");
  const [currentDossier, setCurrentDossier] = useState<string | null>(null);
  const [dossiersList, setDossiersList] = useState<string[]>([]);

  // word / form
  const [motInput, setMotInput] = useState("");
  const [includeRelated, setIncludeRelated] = useState(false);
  const [includeTranslate, setIncludeTranslate] = useState(false);
  const [loading, setLoading] = useState(false);

  // lexique storage: mapping dossier -> array entries
  const [store, setStore] = useState<Record<string, Entry[]>>({});

  // filter in lexicon
  const [filterText, setFilterText] = useState("");

  // load localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Entry[]>;
        setStore(parsed);
        setDossiersList(Object.keys(parsed));
        if (Object.keys(parsed).length > 0 && !currentDossier) {
          setCurrentDossier(Object.keys(parsed)[0]);
        }
      }
    } catch (e) {
      console.error("Erreur lecture localStorage", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist store to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store));
      setDossiersList(Object.keys(store));
    } catch (e) {
      console.error("Erreur sauvegarde localStorage", e);
    }
  }, [store]);
// Fermer la modale avec la touche Échap
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showDeleteModal) {
      setShowDeleteModal(false);
      setDossierToDelete(null);
    }
  };
  
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [showDeleteModal]);
useEffect(() => {
  if (showDeleteModal && deleteModalRef.current) {
    // Focus sur la modale quand elle s'ouvre
    deleteModalRef.current.focus();
  }
}, [showDeleteModal]);

  // helpers to get entries for current dossier
  const entries = currentDossier ? (store[currentDossier] ?? []) : [];

  // --- API helpers ---

  async function fetchWikipedia(term: string) {
  try {
    const url = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=3&titles=${encodeURIComponent(term)}&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return { text: null, source: "wikipedia" };
    const j = await res.json();
    const pages = j?.query?.pages;
    if (!pages) return { text: null, source: "wikipedia" as const };
    const key = Object.keys(pages)[0];
    const page = pages[key];
    if (!page || page.missing) return { text: null, source: "wikipedia" as const };
    return { text: page.extract ?? null, source: "wikipedia" as const };
  } catch (e) {
    console.warn("wiki fetch err", e);
    return { text: null, source: "wikipedia" as const };
  }
}

async function fetchWiktionary(term: string) {
  try {
    const url = `https://fr.wiktionary.org/w/api.php?action=query&prop=extracts&format=json&explaintext=1&titles=${encodeURIComponent(term)}&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return { text: null, source: "wiktionary" as const };
    const j = await res.json();
    const pages = j?.query?.pages;
    if (!pages) return { text: null, source: "wiktionary" as const };
    const key = Object.keys(pages)[0];
    const page = pages[key];
    if (!page || page.missing || !page.extract) return { text: null, source: "wiktionary" as const };
    
    const text = page.extract;
    
    // Chercher la ligne après "Locution nominale" ou "Nom commun"
    const lines = text.split('\n');
    let foundSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter la section de définition
      if (line.includes('Nom commun') || line.includes('Locution nominale') || 
          line.includes('Verbe') || line.includes('Adjectif')) {
        foundSection = true;
        continue;
      }
      
      // Si on est dans la bonne section
      if (foundSection && line.length > 40 && 
          !line.startsWith('===') && 
          !line.startsWith('==') &&
          !line.startsWith('\\') &&
          !line.includes('\\') &&  // Exclure les lignes avec phonétique
          !line.includes('[Prononciation') &&
          !line.includes('(France)') &&
          !line.includes('féminin') &&  // Exclure "féminin pluriel"
          !line.includes('masculin')) {  // Exclure "masculin"
        return { text: line, source: "wiktionary" as const };
      }
      
      // Arrêter à la prochaine section
      if (foundSection && line.startsWith('====')) {
        break;
      }
    }
    
    return { text: null, source: "wiktionary" as const };
  } catch (e) {
    console.warn("wiktionary fetch err", e);
    return { text: null, source: "wiktionary" as const };
  }
}

  async function fetchDatamuse(term: string) {
    try {
      const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(term)}&lc=fr&max=8`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const j = await res.json();
      if (!Array.isArray(j)) return [];
      return j.map((it: any) => it.word).slice(0, 8);
    } catch (e) {
      console.warn("datamuse err", e);
      return [];
    }
  }

  async function fetchTranslateText(text: string) {
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "fr", target: "en" }),
      });
      if (!res.ok) return null;
      const j = await res.json();
      return j.translation ?? null;
    } catch (e) {
      console.warn("translate proxy err", e);
      return null;
    }
  }

  // --- Main action: ensure dossier is set, then search and add entry ---
  const handleCreateOrSelectDossier = () => {
    const d = dossierInput.trim();
    if (!d) return;
    setCurrentDossier(d);
    if (!store[d]) {
      setStore((s) => ({ ...s, [d]: [] }));
    }
    setDossierInput("");
  };

const handleAddWord = async () => {
  if (!currentDossier) {
    alert("Veuillez d'abord sélectionner ou créer un dossier (champ Dossier).");
    return;
  }
  const term = motInput.trim();
  if (!term) return;

  setLoading(true);

  // 1. Recherche définition FR en parallèle
  const [wiktRes, wikiRes] = await Promise.all([
    fetchWiktionary(term), 
    fetchWikipedia(term)
  ]);

  const bestDef = wikiRes.text || wiktRes.text || `${term}\n\n(Définition non trouvée - Cliquez sur "Éditer")`;

  // 2. Traduction de la définition FR→EN (si demandé)
  let translationDefinition = null;
  if (includeTranslate && bestDef !== "(Aucune définition trouvée)") {
    translationDefinition = await fetchTranslateText(bestDef);
  }

  // 3. Mots proches : traduire terme FR→EN, puis chercher, puis traduire résultats EN→FR
  let related: string[] = [];
  if (includeRelated) {
    // Traduire le terme français en anglais pour Datamuse
    const termEN = await fetchTranslateText(term); // "montagne" → "mountain"
    
    if (termEN) {
      const relatedEN = await fetchDatamuse(termEN); // cherche avec "mountain"
      
      // Traduire chaque mot proche EN→FR pour les parenthèses
      related = await Promise.all(
        relatedEN.map(async (word) => {
          const miniTrad = await fetchTranslateTextReverse(word); // "mountainside" → "flanc"
          return `${word} (${miniTrad || '?'})`;
        })
      );
    }
  }

  // 4. Créer l'entrée
  const newEntry = {
    id: generateId(),
    mot: term,
    definition: bestDef,
    source: wiktRes.text ? "wiktionary" : wikiRes.text ? "wikipedia" : "manuel",
    traduction: translationDefinition,
    motsProches: related,
    isEditing: false,
    showDefinition: false,
  };

  setStore((prev) => {
    const curr = prev[currentDossier] ?? [];
    const exists = curr.some((e) => e.mot.toLowerCase() === term.toLowerCase());
    const updated = exists 
      ? curr.map((e) => (e.mot.toLowerCase() === term.toLowerCase() ? newEntry : e)) 
      : [...curr, newEntry];
    updated.sort((a, b) => a.mot.localeCompare(b.mot, "fr", { sensitivity: "base" }));
    return { ...prev, [currentDossier]: updated };
  });

  setMotInput("");
  setLoading(false);
};


async function fetchTranslateTextReverse(text: string) {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "en", target: "fr" }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.translation ?? null;
  } catch (e) {
    console.warn("translate reverse err", e);
    return null;
  }
}

  
  // toggle showDef for an entry
  const toggleShow = (id: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => (e.id === id ? { ...e, showDefinition: !e.showDefinition } : e));
      return { ...prev, [currentDossier]: arr };
    });
  };

  // toggle editing
  const toggleEditing = (id: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => (e.id === id ? { ...e, isEditing: !e.isEditing } : e));
      return { ...prev, [currentDossier]: arr };
    });
  };

  // save edited definition
  const saveEditedDefinition = (id: string, newDef: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => (e.id === id ? { ...e, definition: newDef, isEditing: false } : e));
      return { ...prev, [currentDossier]: arr };
    });
  };

  // delete entry
  const deleteEntry = (id: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).filter((e) => e.id !== id);
      return { ...prev, [currentDossier]: arr };
    });
  };

  // insert related word into form and auto-search (fill motInput but don't auto-add)
  const insertRelated = (word: string) => {
    setMotInput(word);
  };

  // filter entries by filterText
  const filteredEntries = entries.filter((e) => e.mot.toLowerCase().includes(filterText.toLowerCase()));

  // UI render
  return (
    <div className="min-h-screen bg-sky-900 p-8"
    aria-hidden={showDeleteModal}
    >
      <main className="bg-sky-900 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT: dossier + form */}
        <section role="region" aria-label="Formulaire de recherche">
        <div className="bg-slate-100 p-6 rounded-2xl shadow border border-slate-200 sticky top-4 h-fit">
          <h1 className="text-2xl font-bold text-slate-800 mb-4" lang="fr">Lexique thématique — traduction</h1>

          <label className="text-sm font-medium text-slate-700">Dossier (créer ou sélectionner)</label>
          <div className="bg-white flex gap-2 mt-2">
            <input
              className="bg-white flex-1 p-2 border rounded text-blue-950"
              placeholder="Nom du dossier..."
              value={dossierInput}
              onChange={(e) => setDossierInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateOrSelectDossier(); }}
                />
            <button className="px-3 bg-sky-600 text-white rounded hover:bg-blue-500" onClick={handleCreateOrSelectDossier}
            aria-label={`Créer le dossier`}
            >
            Créer le dossier
            </button>
          </div>

          {dossiersList.length > 0 && (
  <div className="mt-3">
    <label className="text-sm text-slate-700">Changer de dossier :</label>
    
    {/* Container flex pour aligner select + bouton */}
    <div className="flex gap-2 mt-1">
     <select 
  className="flex-1 p-2 bg-white border rounded text-slate-900" 
  value={currentDossier ?? ""} 
  onChange={(e) => setCurrentDossier(e.target.value)}
>
  {[...dossiersList].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).map((d) => (
    <option key={d} value={d}>{d}</option>
  ))}
</select>
      
      {/* Bouton poubelle */}
      {currentDossier && (
        <button
  onClick={() => {
    setDossierToDelete(currentDossier);
    setShowDeleteModal(true);
  }}
  className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-300 hover:from-rose-500 hover:to-red-200 border border-indigo-300 flex items-center justify-center transition-all duration-300"
  aria-label={`Supprimer le dossier ${currentDossier}`}
>
  <span aria-hidden="true">🗑️</span>
  <span className="sr-only">Supprimer le dossier</span>
</button>
      )}
    </div>
  </div>
)}

          <hr className="my-4" />

          <label className="text-sm font-medium text-slate-700">Mot à définir</label>
          <input
            className="bg-white w-full p-2 border rounded mt-2 mb-3 text-blue-950"
            placeholder={currentDossier ? "Entrez un mot..." : "Sélectionnez d'abord un dossier"}
            value={motInput}
            onChange={(e) => setMotInput(e.target.value)}
            disabled={!currentDossier}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddWord(); }}
          />

          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={includeRelated} onChange={() => setIncludeRelated(!includeRelated)} />
              Inclure mots proches et associations sémantiques
            </label>
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={includeTranslate} onChange={() => setIncludeTranslate(!includeTranslate)} />
              Traduire (EN)
            </label>
          </div>
<div><button type="button"
  className="text-xs text-blue-600 hover:text-blue-800 mb-3 flex items-center gap-1"
  onClick={() => {
    if (motInput) {
      // Liste des petits mots à garder en minuscule
      const keepLowercase = ['de', 'du', 'la', 'le', 'les', 'des', 'et', 'ou', 'à', 'd', 'l', 'en', 'au', 'aux'];
      
      const capitalized = motInput
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
          // Premier mot toujours en majuscule
          if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
          // Petits mots restent en minuscule
          if (keepLowercase.includes(word)) {
            return word;
          }
          // Autres mots en majuscule (noms propres)
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
      setMotInput(capitalized);
    }
  }}
  type="button"
  disabled={!motInput}
>
  

  <span aria-hidden="true">🔤</span>
  <span className="sr-only">Icône majuscule</span> Majuscule
  </button></div>
          <div className="mt-4 flex gap-3">
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-90 hover:bg-green-500"
              onClick={handleAddWord}
              disabled={!currentDossier || !motInput.trim() || loading}
              type="button"
            >
              {loading ? "Recherche..." : "Chercher & ajouter"}
            </button>
            <div role="status" aria-live="polite" className="sr-only">
              {loading && "Recherche en cours, veuillez patienter"}
            </div>
            <button
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-500"
              onClick={() => { setMotInput(""); }}
            >
              Effacer
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Dossier courant: <strong>{currentDossier ?? "— aucun —"}</strong>
          </p>
        </div>
</section>
   {/* RIGHT: lexique list + filter */}
   <section role="region" aria-label="Liste du lexique">
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-2xl shadow border border-slate-200">
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-lg font-semibold text-slate-800">Lexique – {currentDossier ?? "aucun dossier"}</h2>
    <div className="flex items-center gap-2">
      <input
        className="bg-white p-2 border rounded text-slate-900"
        placeholder="Filtrer par mot..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
      />
      <button
        onClick={() => {
          if (!currentDossier) return;
          setStore(prev => {
            const arr = prev[currentDossier].map(e => ({ ...e, showDefinition: false }));
            return { ...prev, [currentDossier]: arr };
          });
        }}
        className="px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 whitespace-nowrap"
        disabled={!currentDossier || entries.length === 0}
        aria-label={`Fermer toutes les entrées dépliées sur ce dossier`}
      >
        📁 Tout refermer
      </button>
    </div>
  </div>
</div>

          <div className="grid gap-4">
            {filteredEntries.length === 0 ? (
              <div className="bg-white p-6 rounded-lg border border-slate-200 text-slate-600">Aucune entrée.</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-fade">
                  {/* Header compact: mot + bouton Afficher */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-xl font-bold text-slate-900">{entry.mot}</h3>
                      <span className="text-sm text-slate-500">({currentDossier})</span>
                    </div>
                   <button 
  onClick={() => toggleShow(entry.id)} className="px-4 py-2 bg-slate-100 rounded text-slate-900 hover:bg-slate-200"
  aria-label={`${entry.showDefinition ? "Masquer" : "Afficher"} la définition de ${entry.mot}`}
>
  {entry.showDefinition ? "Masquer" : "Afficher"}
</button>
                  </div>

                 {/* Contenu déroulant : tout le reste */}
{entry.showDefinition && (
  <div className="mt-4 opacity-0 animate-fade-in">
    {/* Traduction si présente */}
   {entry.traduction && (
  <div className="text-sm italic text-slate-700 bg-slate-100 p-3 rounded mb-4">
    <h4 className="font-semibold mb-1" lang="fr">Traduction</h4>
    <span lang="en">{entry.traduction}</span>
  </div>
)}

    {/* Layout: définition + mots proches à gauche, boutons à droite */}
    <div className="flex gap-4">
      {/* Colonne gauche : Définition + Mots proches */}
      <div className="flex-1 space-y-4">
        {/* Définition */}
        <div className="text-slate-900 bg-slate-100 p-4 rounded">
          {entry.isEditing ? (
            <>
              <textarea 
                defaultValue={entry.definition} 
                className="w-full p-2 border rounded" 
                rows={6}
                onBlur={(e) => saveEditedDefinition(entry.id, e.target.value)}
                lang="fr" 
              />
              <div className="text-sm text-slate-500 mt-1" lang="fr">Modifiez puis cliquez hors du champ pour enregistrer.</div>
            </>
          ) : (
    <p className="whitespace-pre-line" lang="fr">{entry.definition}</p>
          )}
        </div>

       {/* Mots proches */}
{entry.motsProches && entry.motsProches.length > 0 && (
  <div>
   <h4 className="text-sm font-medium text-slate-700 mb-2" lang="fr">Mots proches</h4>
   
    <div className="flex flex-wrap gap-2">
      {entry.motsProches.map((w) => {
        const wordOnly = w.split(' (')[0];  // "mountainside"
        const frenchPart = w.match(/\(([^)]+)\)/)?.[1] || wordOnly;  // "flanc"
        
        return (
          <button 
            key={w} 
            onClick={() => insertRelated(frenchPart)}
            onContextMenu={(e) => {
              e.preventDefault();
              window.open(
                `https://translate.google.fr/?hl=fr&sl=en&tl=fr&text=${encodeURIComponent(wordOnly)}&op=translate`,
                '_blank'
              );
            }}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 cursor-pointer"
            title="Clic gauche: insérer | Clic droit: voir traduction détaillée"
            aria-label={`${wordOnly} traduit par ${frenchPart}`}
          >
            <span lang="en">{wordOnly}</span>
            {frenchPart && (
              <span lang="fr"> ({frenchPart})</span>
            )}
          </button>
        );
      })}
    </div>
    <div className="text-xs text-slate-500 mt-1" lang="fr">
      💡 Clic gauche: rechercher | Clic droit: traduction détaillée
    </div>
  </div>
)}
      </div>

      {/* Colonne droite : Boutons en colonne */}
      <div className="flex flex-col gap-2 min-w-fit">
  <h4 className="text-sm font-semibold text-slate-700 mb-1" lang="fr">Actions</h4>
  
  <button 
    onClick={() => toggleEditing(entry.id)} 
    className="px-4 py-2 bg-amber-100 rounded text-slate-900 hover:bg-amber-200 text-sm whitespace-nowrap"
    aria-label={`Éditer la définition de ${entry.mot}`}
  >
          Éditer
        </button>
        <button 
          onClick={() => deleteEntry(entry.id)} 
          className="px-4 py-2 bg-rose-100 rounded text-slate-900 hover:bg-rose-200 text-sm whitespace-nowrap"
          aria-label={`Supprimer l'entrée ${entry.mot}`}
        >
          Supprimer
        </button>
        <button
          onClick={async () => {
            const result = await fetchTranslateText(entry.definition || entry.mot);
            if (!currentDossier) return;
            setStore(prev => {
              const arr = prev[currentDossier]?.map(e =>
                e.id === entry.id ? { ...e, traduction: result } : e
              );
              return { ...prev, [currentDossier]: arr };
            });
          }}
          className="px-4 py-2 bg-sky-100 rounded text-slate-900 hover:bg-sky-200 text-sm whitespace-nowrap"
          aria-label={`Traduire ${entry.mot} en anglais`}
        >
          Traduire (EN)
        </button>
        
        <div className="border-t border-slate-300 my-2"></div>
        
        <button
          onClick={() => window.open(`https://fr.wiktionary.org/wiki/${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
          aria-label={`Chercher dans Wiktionnaire`}
        >
          Wiktionnaire
        </button>
        <button
          onClick={() => window.open(`https://www.larousse.fr/dictionnaires/francais/${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
        >
          Larousse
        </button>
        <button
          onClick={() => window.open(`https://www.universalis.fr/recherche/${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
        >
          Encyclopédie Universalis
        </button>
         <button
          onClick={() => window.open(`https://openalex.org/works?page=1&filter=title_and_abstract.search:${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
          aria-label={`Chercher ${entry.mot} dans la base OpenAlex`}
        >
          OpenAlex
        </button>
        <button
          onClick={() => window.open(`https://crisco4.unicaen.fr/des/synonymes/${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
          aria-label={`Consulter les synonymes de ${entry.mot} sur Crisco`}
        >
          Synonymes avec Crisco
        </button>
       
        <button
          onClick={() => window.open(`https://context.reverso.net/traduction/anglais-francais/${encodeURIComponent(entry.mot)}`, "_blank")}
          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap"
        >
          Reverso anglais
        </button>
        
      </div>
    </div>
  </div>
)}
                </div>
              ))
            )}
          </div>
        </div>
        </section>
      </main>

      {/* animation css */}
    <style>{`
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-80px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>
{/* Modale de confirmation de suppression */}
{showDeleteModal && dossierToDelete && (
  <div 
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={() => {
      setShowDeleteModal(false);
      setDossierToDelete(null);
    }}
  >
    <div 
      ref={deleteModalRef}
      tabIndex={-1}
      className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in relative"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titre"
      onKeyDown={(e) => {
        // Piège Tab dans la modale
        if (e.key === 'Tab') {
          const focusableElements = e.currentTarget.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            // Shift+Tab sur premier élément → va au dernier
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            // Tab sur dernier élément → va au premier
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
        </div>
        <div className="flex-1">
          <h3 id="modal-titre" className="text-lg font-bold text-slate-900 mb-2">
            Supprimer le dossier ?
          </h3>
          <p className="text-slate-600 mb-1">
            Voulez-vous vraiment supprimer le dossier <strong className="text-slate-900">"{dossierToDelete}"</strong> ?
          </p>
          <p className="text-sm text-rose-600">
            Cette action est irréversible. Toutes les entrées seront définitivement perdues.
          </p>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setDossierToDelete(null);
          }}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => {
            setStore(prev => {
              const newStore = { ...prev };
              delete newStore[dossierToDelete];
              return newStore;
            });
            
            const remainingDossiers = dossiersList.filter(d => d !== dossierToDelete);
            setCurrentDossier(remainingDossiers.length > 0 ? remainingDossiers[0] : null);
            
            setShowDeleteModal(false);
            setDossierToDelete(null);
          }}
          className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          aria-label={`Confirmer la suppression du dossier ${dossierToDelete}`}
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}