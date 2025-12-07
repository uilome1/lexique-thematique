'use client';

import React from 'react';
import { Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            +2
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            voc
          </span>
        </div>
        
        {/* Statut de connexion */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link href="/sign-in">
              <button className="px-6 py-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors">
                Se connecter
              </button>
            </Link>
          </SignedOut>
          
          <SignedIn>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700">
                Connecté en tant que <span className="font-semibold text-indigo-600">{user?.primaryEmailAddress?.emailAddress || user?.fullName || 'Utilisateur'}</span>
              </div>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
            </div>
          </SignedIn>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Lexique personnel interactif
          </div>
          
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Enrichissez votre vocabulaire,
            <br />
            un mot à la fois
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Construisez votre dictionnaire personnel avec définitions, exemples et catégories. 
            Révisez vos mots et suivez votre progression.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link href="/app">
              <button className="px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">💾</span>
                Mode hors ligne
              </button>
            </Link>
            
            <SignedOut>
              <Link href="/sign-in">
                <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">🔐</span>
                  Lexique connecté
                </button>
              </Link>
            </SignedOut>
            
            <SignedIn>
              <Link href="/app">
                <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">✅</span>
                  Accéder au lexique
                </button>
              </Link>
            </SignedIn>
          </div>

          {/* Explications */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">💾</span>
                Mode hors ligne
              </h3>
              <p className="text-sm text-slate-600">
                Utilisez l'application sans compte. Vos données restent sur votre appareil (localStorage).
              </p>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🔐</span>
                Lexique connecté
              </h3>
              <p className="text-sm text-slate-600">
                Synchronisez vos lexiques dans le cloud, accédez-y depuis tous vos appareils.
              </p>
            </div>
          </div>

          {/* Preview Card */}
          <div className="relative mt-16">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur-3xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-500">Niveau 5</div>
                    <div className="text-2xl font-bold text-gray-900">350 points</div>
                  </div>
                </div>
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                  23 mots maîtrisés
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 text-left">
                <div className="text-sm text-indigo-600 font-medium mb-2">MOT DU JOUR</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">Perspicace</div>
                <div className="text-gray-600">Qui a une intelligence pénétrante, capable de comprendre rapidement...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pourquoi choisir +2voc ?
          </h2>
          <p className="text-xl text-gray-600">
            Un apprentissage ludique et personnalisé
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Lexique personnalisé
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Ajoutez vos propres mots avec définitions et exemples. 
              Construisez un vocabulaire qui vous ressemble.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Révision efficace
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Révisez vos mots avec le mode apprentissage. 
              Marquez vos acquis et concentrez-vous sur ce qui reste à apprendre.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Progression motivante
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Gagnez des points, montez de niveau et suivez 
              vos progrès jour après jour.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTRWMThoNHYxMnptMCAxMmgtNFYzMGg0djEyem0xMi0xMmgtNFYxOGg0djEyem0wIDEyaC00VjMwaDR2MTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
          
          <div className="relative">
            <h2 className="text-4xl font-bold mb-4">
              Prêt à enrichir votre vocabulaire ?
            </h2>
            <p className="text-xl mb-8 text-indigo-100">
              Rejoignez +2voc gratuitement et commencez votre apprentissage dès aujourd'hui
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link href="/app">
                <button className="px-8 py-3 bg-slate-700 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
                  Essayer hors ligne
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
                  Créer mon compte
                </button>
              </Link>
            </div>
            
            <p className="mt-4 text-sm text-indigo-200">
              Aucune carte bancaire requise • Gratuit pour toujours
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                +2
              </div>
              <span className="text-xl font-bold text-gray-900">voc</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2024 +2voc. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-indigo-600 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Conditions</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}