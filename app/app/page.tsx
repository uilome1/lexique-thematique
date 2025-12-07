"use client";

import { useEffect, useState, useRef } from "react";
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import { useUser, useAuth } from '@clerk/nextjs'

// Types
type Entry = {
  id: string;
  mot: string;
  definition: string;
  source?: string;
  traduction?: string | null;
  motsProches?: string[];
  isEditing?: boolean;
  showDefinition?: boolean;
};

export default function Page() {
  // Hooks Clerk
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  
  
  // useState
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const [dossierInput, setDossierInput] = useState("");
  const [currentDossier, setCurrentDossier] = useState<string | null>(null);
  const [dossiersList, setDossiersList] = useState<string[]>([]);
  const [motInput, setMotInput] = useState("");
  const [includeRelated, setIncludeRelated] = useState(false);
  const [includeTranslate, setIncludeTranslate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Record<string, Entry[]>>({});
  const [filterText, setFilterText] = useState("");

  // Helper
  const entries = currentDossier ? (store[currentDossier] ?? []) : [];

  // Fonction loadData
async function loadData() {
  if (!user?.id) return;
  
  try {
    // Charger les dossiers
    const dossiersRes = await fetch('/api/dossiers');
    if (!dossiersRes.ok) throw new Error('Failed to fetch dossiers');
    const { data: dossiers } = await dossiersRes.json();
    
    // Charger toutes les entries
    const entriesRes = await fetch('/api/entries');
    if (!entriesRes.ok) throw new Error('Failed to fetch entries');
    const { data: allEntries } = await entriesRes.json();
    
    // Organiser par dossier
    const newStore: Record<string, Entry[]> = {};
    const dossiersNames: string[] = []; // ← AJOUTÉ
    
    dossiers.forEach((d: any) => {
      dossiersNames.push(d.nom); // ← AJOUTÉ
      
      const entriesForDossier = allEntries
        .filter((e: any) => e.dossier_id === d.id)
        .map((e: any) => ({
          id: e.id,
          mot: e.mot,
          definition: e.definition,
          source: e.source,
          traduction: e.traduction,
          motsProches: e.mots_proches || [],
          isEditing: false,
          showDefinition: false,
        }));
      
      newStore[d.nom] = entriesForDossier;
    });
    
    setStore(newStore);
    setDossiersList(dossiersNames); // ← AJOUTÉ
    
    // Mettre à jour le currentDossier si nécessaire
    if (currentDossier && !newStore[currentDossier]) {
      setCurrentDossier(dossiers[0]?.nom || null);
    } else if (!currentDossier && dossiersNames.length > 0) {
      setCurrentDossier(dossiersNames[0]); // ← AJOUTÉ : sélectionner le premier dossier par défaut
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

  // useEffect pour charger au démarrage
  useEffect(() => {
    if (!isLoaded) return;
    loadData();
  }, [isLoaded, user?.id]);

  // Autres useEffect (modal, etc.)
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
      deleteModalRef.current.focus();
    }
  }, [showDeleteModal]);

  // API helpers
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
      const lines = text.split('\n');
      let foundSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('Nom commun') || line.includes('Locution nominale') || 
            line.includes('Verbe') || line.includes('Adjectif')) {
          foundSection = true;
          continue;
        }
        
        if (foundSection && line.length > 40 && 
            !line.startsWith('===') && 
            !line.startsWith('==') &&
            !line.startsWith('\\') &&
            !line.includes('\\') &&
            !line.includes('[Prononciation') &&
            !line.includes('(France)') &&
            !line.includes('féminin') &&
            !line.includes('masculin')) {
          return { text: line, source: "wiktionary" as const };
        }
        
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

  // Créer dossier
 const handleCreateOrSelectDossier = async () => {
  const d = dossierInput.trim();
  if (!d) return;
  
  if (!user || !user.id) {
    alert("Vous devez être connecté pour créer un dossier");
    return;
  }
  
  try {
    const response = await fetch('/api/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: d })
    });
    
    if (!response.ok) {
      const { error } = await response.json();
      alert("Erreur: " + error);
      return;
    }
    
    const { data } = await response.json();
    
    setStore((prev) => ({ ...prev, [d]: [] }));
    setCurrentDossier(d);
    setDossierInput("");
    await loadData();
  } catch (error) {
    console.error('Error creating dossier:', error);
    alert("Erreur lors de la création du dossier");
  }
};

  // Ajouter mot
const handleAddWord = async () => {
  if (!currentDossier) {
    alert("Veuillez d'abord sélectionner ou créer un dossier.");
    return;
  }
  
  if (!user || !user.id) {
    alert("Vous devez être connecté pour ajouter des mots");
    return;
  }
  
  const term = motInput.trim();
  if (!term) return;

  setLoading(true);

  try {
    const [wiktRes, wikiRes] = await Promise.all([
      fetchWiktionary(term), 
      fetchWikipedia(term)
    ]);

    const bestDef = wikiRes.text || wiktRes.text || `${term}\n\n(Définition non trouvée - Cliquez sur "Éditer")`;

    let translationDefinition = null;
    if (includeTranslate && bestDef !== "(Aucune définition trouvée)") {
      translationDefinition = await fetchTranslateText(bestDef);
    }

    let related: string[] = [];
    if (includeRelated) {
      const termEN = await fetchTranslateText(term);
      
      if (termEN) {
        const relatedEN = await fetchDatamuse(termEN);
        
        related = await Promise.all(
          relatedEN.map(async (word) => {
            const miniTrad = await fetchTranslateTextReverse(word);
            return `${word} (${miniTrad || '?'})`;
          })
        );
      }
    }

    // Récupérer l'ID du dossier depuis le store
    const dossiersRes = await fetch('/api/dossiers');
    const { data: dossiers } = await dossiersRes.json();
    const dossierData = dossiers.find((d: any) => d.nom === currentDossier);
    
    if (dossierData) {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossier_id: dossierData.id,
          mot: term,
          definition: bestDef,
          source: wiktRes.text ? "wiktionary" : wikiRes.text ? "wikipedia" : "manuel",
          traduction: translationDefinition,
          mots_proches: related,
        })
      });

      if (!response.ok) {
        console.error("❌ Erreur sauvegarde mot");
      } else {
        console.log("✅ Mot sauvegardé!");
        await loadData();
      }
    }

    setMotInput("");
  } catch (error) {
    console.error('Error adding word:', error);
    alert("Erreur lors de l'ajout du mot");
  } finally {
    setLoading(false);
  }
};

  const toggleShow = (id: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => (e.id === id ? { ...e, showDefinition: !e.showDefinition } : e));
      return { ...prev, [currentDossier]: arr };
    });
  };

  const toggleEditing = (id: string) => {
    if (!currentDossier) return;
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => (e.id === id ? { ...e, isEditing: !e.isEditing } : e));
      return { ...prev, [currentDossier]: arr };
    });
  };

const saveEditedDefinition = async (id: string, newDef: string) => {
  if (!currentDossier) return;
  
  if (user && user.id) {
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition: newDef })
      });
      
      if (!response.ok) {
        console.error("❌ Erreur mise à jour");
        alert("Erreur lors de la sauvegarde");
        return;
      }
      
      // Mettre à jour le state local
      setStore((prev) => {
        const arr = (prev[currentDossier] ?? []).map((e) => 
          e.id === id ? { ...e, definition: newDef, isEditing: false } : e
        );
        return { ...prev, [currentDossier]: arr };
      });
    } catch (error) {
      console.error('Error updating entry:', error);
      alert("Erreur lors de la sauvegarde");
    }
  }
};

const deleteEntry = async (id: string) => {
  if (!currentDossier) return;
  
  if (user && user.id) {
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error("❌ Erreur suppression");
        alert("Erreur lors de la suppression");
        return;
      }
      
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert("Erreur lors de la suppression");
    }
  }
};

  const insertRelated = (word: string) => {
    setMotInput(word);
  };

  const filteredEntries = entries.filter((e) => e.mot.toLowerCase().includes(filterText.toLowerCase()));

  // UI render
  return (
    <div className="min-h-screen bg-sky-900 pt-20 p-8" aria-hidden={showDeleteModal}>
      {/* NAVBAR FIXE */}
      <nav className="fixed top-0 left-0 right-0 backdrop-blur-sm shadow-md z-40 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-sky-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              +2
            </div>
            <span className="text-xl font-bold text-slate-900">voc</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => document.getElementById('formulaire')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-4 py-2 text-white hover:text-black hover:bg-indigo-50 rounded-lg transition-all"
              aria-label="Aller au formulaire de recherche"
            >
              <span className="text-lg" aria-hidden="true">📝</span>
              <span className="hidden sm:inline">Formulaire</span>
            </button>
            
            <button
              onClick={() => document.getElementById('lexique')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-4 py-2 text-white hover:text-black hover:bg-indigo-50 rounded-lg transition-all"
              aria-label="Aller à la liste du lexique"
            >
              <span className="text-lg" aria-hidden="true">📚</span>
              <span className="hidden sm:inline">Lexique</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
            </SignedIn>
            
            <SignedOut>
              <Link href="/sign-in">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Se connecter
                </button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </nav>

      <main className="bg-sky-900 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: dossier + form */}
        <section id="formulaire" role="region" aria-label="Formulaire de recherche">
          <div className="bg-slate-100 p-6 rounded-2xl shadow border border-slate-200 sticky top-4 h-fit">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Lexique thématique — traduction</h1>

            <label className="text-sm font-medium text-slate-700">Dossier (créer ou sélectionner)</label>
            <div className="bg-white flex flex-col sm:flex-row gap-2 mt-2"> 
              <input
                className="bg-white flex-1 p-2 border rounded text-blue-950"
                placeholder="Nom du dossier..."
                value={dossierInput}
                onChange={(e) => setDossierInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateOrSelectDossier(); }}
              />
              <button 
                className="px-3 bg-slate-600 text-white rounded hover:bg-slate-700" 
                onClick={handleCreateOrSelectDossier}
                aria-label="Créer le dossier"
              >
                Créer le dossier
              </button>
            </div>

            {dossiersList.length > 0 && (
              <div className="mt-3">
                <label className="text-sm text-slate-700">Changer de dossier :</label>
                
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

            <div>
              <button 
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 mb-3 flex items-center gap-1"
                onClick={() => {
                  if (motInput) {
                    const keepLowercase = ['de', 'du', 'la', 'le', 'les', 'des', 'et', 'ou', 'à', 'd', 'l', 'en', 'au', 'aux'];
                    
                    const capitalized = motInput
                      .toLowerCase()
                      .split(' ')
                      .map((word, index) => {
                        if (index === 0) {
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }
                        if (keepLowercase.includes(word)) {
                          return word;
                        }
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      })
                      .join(' ');
                    setMotInput(capitalized);
                  }
                }}
                disabled={!motInput}
              >
                <span aria-hidden="true">🔤</span>
                <span className="sr-only">Icône majuscule</span> Majuscule
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                className="px-4 py-2 bg-green-900 text-white rounded disabled:opacity-90 hover:bg-green-700"
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
        <section id="lexique" role="region" aria-label="Liste du lexique">
          <div className="space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl shadow border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                Lexique — {currentDossier ?? "aucun dossier"}
              </h2>
              
              <div className="flex flex-col lg:flex-row gap-2">
                <input
                  className="flex-1 bg-white p-2 border rounded text-slate-900"
                  placeholder="Filtrer par mot..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  aria-label="Filtrer les mots du lexique"
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
                  aria-label="Fermer toutes les entrées dépliées sur ce dossier"
                >
                  📁 Refermer tout
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredEntries.length === 0 ? (
                <div className="bg-white p-6 rounded-lg border border-slate-200 text-slate-600">Aucune entrée.</div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-xl font-bold text-slate-900 break-words">{entry.mot}</h3>
                      </div>
                      <button 
                        onClick={() => toggleShow(entry.id)} 
                        className="px-4 py-2 bg-slate-100 rounded text-slate-900 hover:bg-slate-200 whitespace-nowrap flex-shrink-0"
                        aria-label={`${entry.showDefinition ? "Masquer" : "Afficher"} la définition de ${entry.mot}`}
                      >
                        {entry.showDefinition ? "Masquer" : "Afficher"}
                      </button>
                    </div>

                    {entry.showDefinition && (
                      <div className="mt-4 opacity-0 animate-fade-in">
                        {entry.traduction && (
                          <div className="text-sm italic text-slate-700 bg-slate-100 p-3 rounded mb-4">
                            <h4 className="font-semibold mb-1">Traduction</h4>
                            <span>{entry.traduction}</span>
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-slate-200">
                          <div className="flex-1 space-y-4">
                            <div className="text-slate-900 bg-slate-100 p-4 rounded">
                              {entry.isEditing ? (
                                <>
                                  <textarea 
                                    defaultValue={entry.definition} 
                                    className="w-full p-2 border rounded" 
                                    rows={6}
                                    onBlur={(e) => saveEditedDefinition(entry.id, e.target.value)}
                                  />
                                  <div className="text-sm text-slate-500 mt-1">Modifiez puis cliquez hors du champ pour enregistrer.</div>
                                </>
                              ) : (
                                <p className="whitespace-pre-line">{entry.definition}</p>
                              )}
                            </div>

                            {entry.motsProches && entry.motsProches.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-700 mb-2">Mots proches</h4>
                                
                                <div className="flex flex-wrap gap-2">
                                  {entry.motsProches.map((w) => {
                                    const wordOnly = w.split(' (')[0];
                                    const frenchPart = w.match(/\(([^)]+)\)/)?.[1] || wordOnly;
                                    
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
                                        <span>{wordOnly}</span>
                                        {frenchPart && (
                                          <span> ({frenchPart})</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  💡 Clic gauche: rechercher | Clic droit: traduction détaillée
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-fit">
                            <h4 className="text-sm font-semibold text-slate-700 mb-1">Actions</h4>
                         <button 
    onClick={() => toggleEditing(entry.id)} 
    className="px-4 py-2 bg-amber-100 rounded text-slate-900 hover:bg-amber-200 text-sm whitespace-nowrap w-full lg:w-auto"
    aria-label={`Éditer la définition de ${entry.mot}`}
  >
          Éditer
        </button>
        <button 
          onClick={() => deleteEntry(entry.id)} 
          className="px-4 py-2 bg-rose-100 rounded text-slate-900 hover:bg-rose-200 text-sm whitespace-nowrap w-full lg:w-auto"
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
          className="px-4 py-2 bg-sky-100 rounded text-slate-900 hover:bg-sky-200 text-sm whitespace-nowrap w-full lg:w-auto"
          aria-label={`Traduire ${entry.mot} en anglais`}
        >
          Traduire (EN)
        </button>
<div className="border-t border-slate-300 my-2"></div>
                        
                        <button
                          onClick={() => window.open(`https://fr.wiktionary.org/wiki/${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
                          aria-label="Chercher dans Wiktionnaire"
                        >
                          Wiktionnaire
                        </button>
                        <button
                          onClick={() => window.open(`https://www.larousse.fr/dictionnaires/francais/${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
                        >
                          Larousse
                        </button>
                        <button
                          onClick={() => window.open(`https://www.universalis.fr/recherche/${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
                        >
                          Encyclopédie Universalis
                        </button>
                        <button
                          onClick={() => window.open(`https://openalex.org/works?page=1&filter=title_and_abstract.search:${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
                          aria-label={`Chercher ${entry.mot} dans la base OpenAlex`}
                        >
                          OpenAlex
                        </button>
                        <button
                          onClick={() => window.open(`https://crisco4.unicaen.fr/des/synonymes/${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
                          aria-label={`Consulter les synonymes de ${entry.mot} sur Crisco`}
                        >
                          Synonymes avec Crisco
                        </button>
                        <button
                          onClick={() => window.open(`https://context.reverso.net/traduction/anglais-francais/${encodeURIComponent(entry.mot)}`, "_blank")}
                          className="px-3 py-1.5 bg-purple-100 rounded text-slate-900 hover:bg-purple-200 text-sm whitespace-nowrap w-full lg:w-auto"
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
          onClick={async () => {
  if (!dossierToDelete) return;
  
  if (user && user.id) {
    try {
      // Récupérer l'ID du dossier à supprimer
      const dossiersRes = await fetch('/api/dossiers');
      const { data: dossiers } = await dossiersRes.json();
      const dossierData = dossiers.find((d: any) => d.nom === dossierToDelete);
      
      if (!dossierData) {
        alert("Dossier introuvable");
        return;
      }
      
      const response = await fetch(`/api/dossiers/${dossierData.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error("❌ Erreur suppression");
        alert("Erreur lors de la suppression");
        return;
      }
      
      setShowDeleteModal(false);
      setDossierToDelete(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting dossier:', error);
      alert("Erreur lors de la suppression");
    }
  }
              
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