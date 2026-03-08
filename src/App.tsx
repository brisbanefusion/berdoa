/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Info,
  X,
  ChevronRight,
  Sparkles,
  Heart,
  Share2,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowUp
} from 'lucide-react';
import { getRabbanaDuas, getAllahummaDuas, getDuaExplanation, getDuaAudio, type Dua } from './services/duaService';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';

/**
 * Converts any YouTube URL format into an embeddable /embed/ URL.
 * Handles: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
 */
function toEmbedUrl(url: string): string {
  try {
    // Already in embed format
    if (url.includes('youtube.com/embed/')) return url;

    let videoId = '';

    // Handle youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }

    // Handle youtube.com/watch?v=VIDEO_ID
    if (!videoId) {
      const watchMatch = url.match(/[?&]v=([^&#]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (e) {
    console.error('Failed to parse YouTube URL:', e);
  }
  return url; // fallback: return original
}

export default function App() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'en' | 'ms'>('ms');
  const [collection, setCollection] = useState<'rabbana' | 'allahumma'>('rabbana');
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioLoading, setAudioLoading] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadDuas() {
      setLoading(true);
      // Set a safety timeout to stop loading after 10 seconds even if API hangs
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 10000);

      try {
        const data = collection === 'rabbana' ? await getRabbanaDuas() : await getAllahummaDuas();
        if (data && data.length > 0) {
          setDuas(data);
        }
      } catch (error) {
        console.error("Error loading duas:", error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }
    loadDuas();
  }, [collection]);

  const filteredDuas = useMemo(() => {
    return duas.filter(dua =>
      (dua.translation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dua.translationMalay || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dua.transliteration || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dua.reference || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [duas, searchQuery]);

  const handleDuaClick = (dua: Dua) => {
    setSelectedDua(dua);
    setExplanation(null);
  };

  const handleExplain = async (dua: Dua) => {
    setExplaining(true);
    try {
      const text = await getDuaExplanation(dua);
      setExplanation(text);
    } catch (error) {
      setExplanation("Failed to get explanation. Please try again.");
    } finally {
      setExplaining(false);
    }
  };

  const copyToClipboard = (dua: Dua) => {
    const text = `${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n\nReference: ${dua.reference}`;
    navigator.clipboard.writeText(text);
    setCopiedId(dua.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlayAudio = async (dua: Dua) => {
    if (playingId === dua.id) {
      audio?.pause();
      setPlayingId(null);
      return;
    }

    if (audio) {
      audio.pause();
    }

    setAudioLoading(dua.id);
    try {
      let url = dua.audioUrl;
      if (!url) {
        url = await getDuaAudio(dua.arabic) || undefined;
      }

      if (url) {
        const newAudio = new Audio(url);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onplay = () => {
          setAudioLoading(null);
          setPlayingId(dua.id);
        };
        newAudio.play();
        setAudio(newAudio);
      } else {
        alert("Audio not available for this Dua.");
        setAudioLoading(null);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setAudioLoading(null);
    }
  };

  // A more unified glassmorphism aesthetic replaces individual card colors
  const cardColors = [
    'bg-white/[0.03] border-white/5',
    'bg-white/[0.04] border-white/[0.06]',
    'bg-white/[0.02] border-white/5',
  ];

  return (
    <div className="min-h-screen font-sans bg-[#0B0F19] text-slate-200 selection:bg-amber-500/30 relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0B0F19]/60 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-[#0B0F19] shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform">
                <BookOpen size={22} className="opacity-90" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm">
                  {collection === 'rabbana' ? '40 Rabbana' : '40 Allahumma'}
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-amber-200/50 font-medium">Quranic Supplications</p>
              </div>
            </div>

            {/* Left side filters (Desktop) */}
            <div className="hidden sm:flex items-center gap-3 ml-6 border-l border-white/10 pl-6">
              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => setCollection('rabbana')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    collection === 'rabbana' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
                  )}
                >
                  Rabbana
                </button>
                <button
                  onClick={() => setCollection('allahumma')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    collection === 'allahumma' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
                  )}
                >
                  Allahumma
                </button>
              </div>

              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => setLanguage('ms')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    language === 'ms' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
                  )}
                >
                  Malay
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    language === 'en' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
                  )}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm w-56 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 text-slate-200 placeholder:text-slate-500 transition-all backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 text-center border-b border-white/10 relative z-10">
        <p className="text-amber-200/70 text-sm font-serif italic mb-4">
          "And your Lord says, 'Call upon Me; I will respond to you.'" — Surah Ghafir 40:60
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">by DrFendi Ameen</p>
          <p className="text-[10px] text-slate-400">afandi.amin@customs.gov.my</p>
        </div>
      </div>

      {/* Fixed Left Sidebar (visible on xl+ screens where there's space) */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-4">
        <div className="flex flex-col items-center bg-white/5 rounded-2xl p-1.5 border border-white/10 backdrop-blur-md gap-1">
          <button
            onClick={() => setCollection('rabbana')}
            className={cn(
              "w-full px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center",
              collection === 'rabbana' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
            )}
          >
            Rabbana
          </button>
          <button
            onClick={() => setCollection('allahumma')}
            className={cn(
              "w-full px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center",
              collection === 'allahumma' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
            )}
          >
            Allahumma
          </button>
        </div>

        <div className="flex flex-col items-center bg-white/5 rounded-2xl p-1.5 border border-white/10 backdrop-blur-md gap-1">
          <button
            onClick={() => setLanguage('ms')}
            className={cn(
              "w-full px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center",
              language === 'ms' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
            )}
          >
            Malay
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={cn(
              "w-full px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-center",
              language === 'en' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400 hover:text-amber-400"
            )}
          >
            English
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        {/* Mobile Search & Tabs */}
        <div className="sm:hidden mb-8 space-y-3">
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setCollection('rabbana')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                collection === 'rabbana' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400"
              )}
            >
              Rabbana
            </button>
            <button
              onClick={() => setCollection('allahumma')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                collection === 'allahumma' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400"
              )}
            >
              Allahumma
            </button>
          </div>
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setLanguage('ms')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                language === 'ms' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400"
              )}
            >
              Malay
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                language === 'en' ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "text-slate-400"
              )}
            >
              English
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search duas..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-200 placeholder:text-slate-500 backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-amber-200/50 font-serif italic">
              Gathering the {collection === 'rabbana' ? '40 Rabbana' : '40 Allahumma'} Duas...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDuas.map((dua, index) => (
              <motion.div
                key={dua.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group relative rounded-3xl p-8 border hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col h-full backdrop-blur-md overflow-hidden",
                  cardColors[index % cardColors.length],
                  "hover:border-amber-500/30 hover:bg-white/[0.06]"
                )}
                onClick={() => handleDuaClick(dua)}
              >
                {/* Subtle internal gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:to-amber-500/5 transition-colors duration-500 pointer-events-none" />

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <span className="font-serif text-4xl text-white/5 font-bold group-hover:text-amber-500/10 transition-colors">
                    {dua.id.toString().padStart(2, '0')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePlayAudio(dua); }}
                      className={cn(
                        "p-2 rounded-full transition-all duration-300",
                        playingId === dua.id ? "bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-amber-400"
                      )}
                    >
                      {audioLoading === dua.id ? (
                        <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                      ) : playingId === dua.id ? (
                        <Pause size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(dua); }}
                      className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-amber-400 transition-all duration-300"
                    >
                      {copiedId === dua.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="arabic-text text-2xl mb-6 leading-relaxed text-right text-amber-50 drop-shadow-sm relative z-10">
                  {dua.arabic}
                </div>

                <div className="mt-auto relative z-10">
                  <p className="text-sm font-medium text-amber-400 mb-2">{dua.reference}</p>
                  <p className="text-slate-300 line-clamp-3 italic text-sm leading-relaxed group-hover:text-slate-200 transition-colors">
                    {language === 'en' ? dua.translation : dua.translationMalay}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-amber-400 transition-colors flex items-center">
                      View Details <ChevronRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredDuas.length === 0 && (
          <div className="text-center py-20 space-y-6">
            <p className="text-slate-400 font-serif italic text-lg">
              {searchQuery ? "No duas found matching your search." : "We're having trouble loading the full list."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)] rounded-full text-sm font-medium hover:scale-105 transition-transform"
              >
                Retry Loading
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedDua && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
              onClick={() => setSelectedDua(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 opacity-80" />

              <div className="flex justify-between items-center px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {selectedDua.id}
                  </span>
                  <p className="font-serif font-medium text-amber-500">{selectedDua.reference}</p>
                  <button
                    onClick={() => handlePlayAudio(selectedDua)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                      playingId === selectedDua.id
                        ? "bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                    )}
                  >
                    {audioLoading === selectedDua.id ? (
                      <div className="w-3 h-3 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                    ) : playingId === selectedDua.id ? (
                      <Pause size={12} />
                    ) : (
                      <Play size={12} />
                    )}
                    {playingId === selectedDua.id ? "Playing" : "Play Audio"}
                  </button>
                </div>
                <button
                  onClick={() => setSelectedDua(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 custom-scrollbar">
                {selectedDua.videoUrl && (
                  <section className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <iframe
                      src={toEmbedUrl(selectedDua.videoUrl)}
                      title={`Video for ${selectedDua.reference}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </section>
                )}

                <section>
                  <div className="arabic-text text-3xl sm:text-4xl leading-[1.8] text-center text-amber-50 drop-shadow-md">
                    {selectedDua.arabic}
                  </div>
                </section>

                <section className="space-y-8">
                  <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 mb-3 flex items-center gap-2">
                      <Volume2 size={12} /> Transliteration
                    </h4>
                    <p className="text-amber-200 font-medium leading-relaxed italic text-lg">
                      {selectedDua.transliteration}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-2">Terjemahan Melayu</h4>
                    <p className="text-slate-200 text-lg leading-relaxed font-serif px-2">
                      {selectedDua.translationMalay}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-2">English Translation</h4>
                    <p className="text-slate-200 text-lg leading-relaxed font-serif px-2">
                      {selectedDua.translation}
                    </p>
                  </div>
                </section>

                <section className="pt-6 border-t border-white/5">
                  {!explanation ? (
                    <button
                      onClick={() => handleExplain(selectedDua)}
                      disabled={explaining}
                      className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 text-indigo-300 rounded-3xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 group shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    >
                      {explaining ? (
                        <div className="w-5 h-5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="font-medium tracking-wide">Reflect with Gemini AI</span>
                    </button>
                  ) : (
                    <div className="bg-indigo-950/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-indigo-500/20">
                      <div className="absolute top-0 right-0 p-4 text-indigo-500/10">
                        <Sparkles size={60} />
                      </div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> AI Refection
                      </h4>
                      <div className="markdown-body text-slate-300 text-sm leading-relaxed prose prose-sm prose-invert prose-indigo max-w-none">
                        <Markdown>{explanation}</Markdown>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="px-8 py-5 bg-slate-800/50 backdrop-blur-md flex items-center justify-between border-t border-white/5">
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors text-xs font-medium">
                    <Heart size={16} /> Save
                  </button>
                  <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors text-xs font-medium">
                    <Share2 size={16} /> Share
                  </button>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedDua)}
                  className="flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase tracking-widest hover:text-amber-400 transition-colors"
                >
                  {copiedId === selectedDua.id ? (
                    <span className="flex items-center gap-1"><Check size={14} /> Copied!</span>
                  ) : (
                    <span className="flex items-center gap-1"><Copy size={14} /> Copy Text</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-110 transition-transform cursor-pointer"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
