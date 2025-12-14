"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

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
// Fonction pour obtenir/créer le user_id
function getUserId(): string {
  if (typeof window === 'undefined') return '';
  
  const existingId = localStorage.getItem('user_session_id');
  
  if (existingId) {
    return existingId;
  }
  
  const newId = generateId();
  localStorage.setItem('user_session_id', newId);
  console.log('📝 Nouvel ID utilisateur créé:', newId);
  return newId;
}

export default function Page() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string>('');
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

  // NOUVEAU : Initialiser le userId au chargement
  useEffect(() => {
  const id = getUserId();
  if (id) setUserId(id);
}, []);

  // NOUVEAU : Charger les données depuis Supabase
  useEffect(() => {
    if (!userId) return;
    
    loadDataFromSupabase();
  }, [userId]);

  async function loadDataFromSupabase() {
    if (!userId) return;
    
    try {
      console.log('📥 Chargement depuis Supabase...');
      
      // Charger tous les dossiers
      const { data: dossiers, error: dossiersError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('user_id', userId);
      
      if (dossiersError) throw dossiersError;
      
      // Charger toutes les entries
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId);
      
      if (entriesError) throw entriesError;
      
      // Organiser les données par dossier
      const newStore: Record<string, Entry[]> = {};
      
      dossiers?.forEach(d => {
        const dossierId = d.id;
        const dossierEntries = entries
          ?.filter(e => e.dossier_id === dossierId)
          .map(e => ({
            id: e.id,
            mot: e.mot,
            definition: e.definition,
            source: e.source,
            traduction: e.traduction,
            motsProches: e.mots_proches || [],
            isEditing: false,
            showDefinition: false,
          })) || [];
        
        newStore[d.nom] = dossierEntries;
      });
      
      setStore(newStore);
      setDossiersList(Object.keys(newStore));
      console.log('📋 dossiersList mis à jour:', Object.keys(newStore));
      if (Object.keys(newStore).length > 0 && !currentDossier) {
        setCurrentDossier(Object.keys(newStore)[0]);
      }
      
      console.log('✅ Données chargées:', Object.keys(newStore).length, 'dossiers');
    } catch (e) {
      console.error('❌ Erreur chargement Supabase:', e);
    }
  }
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

  const handleCreateOrSelectDossier = async () => {
  const d = dossierInput.trim();
  if (!d || !userId) return;
  
  try {
    // Vérifier si le dossier existe déjà localement
    if (store[d]) {
      setCurrentDossier(d);
      setDossierInput("");
      return;
    }
    
    console.log('📁 Création du dossier:', d);
    
    // Créer dans Supabase
    const { data, error } = await supabase
      .from('dossiers')
      .insert({
        user_id: userId,
        nom: d
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création dossier:', error);
      alert('Erreur lors de la création du dossier');
      return;
    }
    
    console.log('✅ Dossier créé dans Supabase:', data);
    
    // Mettre à jour le state local
    setStore((s) => ({ ...s, [d]: [] }));
    setCurrentDossier(d);
    setDossierInput("");
    
    // Recharger depuis Supabase pour être sûr
    await loadDataFromSupabase();
    
  } catch (e) {
    console.error('❌ Erreur:', e);
    alert('Erreur lors de la création du dossier');
  }
};

const handleAddWord = async () => {
  if (!currentDossier || !userId) {
    alert("Veuillez d'abord sélectionner ou créer un dossier.");
    return;
  }
  
  const term = motInput.trim();
  if (!term) return;

  setLoading(true);

  try {
    // Récupérer les définitions (Wikipedia, Wiktionary, etc.)
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

    console.log('💾 Sauvegarde du mot:', term);

    // Récupérer l'ID du dossier depuis Supabase
    const { data: dossierData } = await supabase
      .from('dossiers')
      .select('id')
      .eq('user_id', userId)
      .eq('nom', currentDossier)
      .single();
    
    if (!dossierData) {
      alert('Dossier introuvable');
      return;
    }

    // Sauvegarder dans Supabase
    const { data: newEntry, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        dossier_id: dossierData.id,
        mot: term,
        definition: bestDef,
        source: wiktRes.text ? "wiktionary" : wikiRes.text ? "wikipedia" : "manuel",
        traduction: translationDefinition,
        mots_proches: related,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
      return;
    }

    console.log('✅ Mot sauvegardé:', newEntry);

    // Recharger les données
    await loadDataFromSupabase();

    setMotInput("");
  } catch (e) {
    console.error('❌ Erreur:', e);
    alert('Erreur lors de l\'ajout du mot');
  } finally {
    setLoading(false);
  }
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

  const saveEditedDefinition = async (id: string, newDef: string) => {
  if (!currentDossier || !userId) return;
  
  try {
    console.log('💾 Sauvegarde de la définition éditée pour:', id);
    
    // Mettre à jour dans Supabase
    const { error } = await supabase
      .from('entries')
      .update({ definition: newDef })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Erreur mise à jour:', error);
      alert('Erreur lors de la sauvegarde');
      return;
    }
    
    console.log('✅ Définition mise à jour dans Supabase');
    
    // Mettre à jour le state local
    setStore((prev) => {
      const arr = (prev[currentDossier] ?? []).map((e) => 
        e.id === id ? { ...e, definition: newDef, isEditing: false } : e
      );
      return { ...prev, [currentDossier]: arr };
    });
    
  } catch (e) {
    console.error('❌ Erreur:', e);
    alert('Erreur lors de la sauvegarde');
  }
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
  // TEST : Juste avant le return
console.log('🔄 Render - userId:', userId, 'showDeleteModal:', showDeleteModal);
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
          <div className="bg-white flex flex-col sm:flex-row gap-2 mt-2"> 
            <input
              className="bg-white flex-1 p-2 border rounded text-blue-950"
              placeholder="Nom du dossier..."
              value={dossierInput}
              onChange={(e) => setDossierInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateOrSelectDossier(); }}
                />
            <button className="px-3 bg-slate-600 text-white rounded hover:bg-slate-700" onClick={handleCreateOrSelectDossier}
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
      
    {currentDossier && (
  <button
    onClick={() => {
      console.log('🗑️ Ouverture de la modale pour:', currentDossier);
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
  
  disabled={!motInput}
>
  

  <span aria-hidden="true">🔤</span>
  <span className="sr-only">Icône majuscule</span> Majuscule
  </button></div>
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
   <section role="region" aria-label="Liste du lexique">
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-2xl shadow border border-slate-200">
  {/* Titre sur sa propre ligne */}
  <h2 className="text-lg font-semibold text-slate-800 mb-3">
    Lexique – {currentDossier ?? "aucun dossier"}
  </h2>
  
  {/* Input et bouton en dessous, pleine largeur sur mobile */}
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
                  {/* Header compact: mot + bouton Afficher */}
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
    <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-slate-200">
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
     <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-fit">
  <h4 className="text-sm font-semibold text-slate-700 mb-1" lang="fr">Actions</h4>
  
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
    if (!currentDossier || !userId) return;
    
    try {
      console.log('🌐 Traduction en cours...');
      
      // Traduire
      const result = await fetchTranslateText(entry.definition || entry.mot);
      
      if (!result) {
        alert('Erreur lors de la traduction');
        return;
      }
      
      console.log('✅ Traduction obtenue:', result);
      
      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('entries')
        .update({ traduction: result })
        .eq('id', entry.id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Erreur sauvegarde traduction:', error);
        alert('Erreur lors de la sauvegarde');
        return;
      }
      
      console.log('✅ Traduction sauvegardée dans Supabase');
      
      // Mettre à jour le state local
      setStore(prev => {
        const arr = prev[currentDossier]?.map(e =>
          e.id === entry.id ? { ...e, traduction: result } : e
        );
        return { ...prev, [currentDossier]: arr };
      });
      
    } catch (e) {
      console.error('❌ Erreur:', e);
      alert('Erreur lors de la traduction');
    }
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
          aria-label={`Chercher dans Wiktionnaire`}
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
        if (e.key === 'Tab') {
          const focusableElements = e.currentTarget.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
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
        {/* Bouton Annuler */}
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setDossierToDelete(null);
          }}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Annuler
        </button>
        
        {/* Bouton Supprimer */}
        <button
          onClick={async () => {
            console.log('🗑️ Suppression du dossier:', dossierToDelete);
            
            if (!dossierToDelete || !userId) {
              console.error('❌ Données manquantes');
              return;
            }
            
            try {
              // Récupérer l'ID du dossier
              const { data: dossierData, error: fetchError } = await supabase
                .from('dossiers')
                .select('id')
                .eq('user_id', userId)
                .eq('nom', dossierToDelete)
                .single();
              
              if (fetchError || !dossierData) {
                console.error('❌ Erreur récupération:', fetchError);
                alert('Dossier introuvable');
                return;
              }
              
              console.log('📦 ID du dossier:', dossierData.id);
              
              // Supprimer de Supabase
              const { error: deleteError } = await supabase
                .from('dossiers')
                .delete()
                .eq('id', dossierData.id)
                .eq('user_id', userId);
              
              if (deleteError) {
                console.error('❌ Erreur suppression:', deleteError);
                alert('Erreur lors de la suppression');
                return;
              }
              
              console.log('✅ Dossier supprimé');
              
              // Fermer la modale
              setShowDeleteModal(false);
              setDossierToDelete(null);
              
              // Recharger les données
              await loadDataFromSupabase();
              
              // Changer de dossier actuel si nécessaire
              if (currentDossier === dossierToDelete) {
                const remainingDossiers = Object.keys(store).filter(d => d !== dossierToDelete);
                setCurrentDossier(remainingDossiers.length > 0 ? remainingDossiers[0] : null);
              }
              
            } catch (e: any) {
              console.error('❌ Erreur:', e);
              alert('Erreur lors de la suppression');
            }
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