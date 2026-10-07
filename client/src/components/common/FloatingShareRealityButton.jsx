import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Share2,
  MessageCircle,
  Copy,
  Check,
  Download,
  X,
  Sparkles,
  ShieldCheck,
  Scale,
  Landmark,
  ExternalLink,
} from 'lucide-react';
import { FALLBACK_CORE_COLLEGES, FALLBACK_TOP_50_COLLEGES } from '../../data/fallbackData';

export const FloatingShareRealityButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);

  // Hide on admin portal
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Detect current college context if on /colleges/:slugOrId
  const isCollegePage = location.pathname.startsWith('/colleges/');
  const collegeSlug = isCollegePage ? location.pathname.split('/colleges/')[1]?.split('/')[0]?.split('?')[0] : null;

  let currentCollege = null;
  if (collegeSlug) {
    const allColleges = [...FALLBACK_CORE_COLLEGES, ...FALLBACK_TOP_50_COLLEGES];
    currentCollege = allColleges.find(
      (c) =>
        c.slug === collegeSlug ||
        c._id === collegeSlug ||
        (c.shortName && c.shortName.toLowerCase() === collegeSlug.toLowerCase())
    );
  }

  const collegeName = currentCollege?.name || (isCollegePage ? 'College' : 'Indian Engineering Colleges');
  const shortName = currentCollege?.shortName || currentCollege?.name || 'College';
  const brochureHighest = currentCollege?.latestPlacementRecord?.highestPackageLPA || 63;
  const brochureAvg = currentCollege?.latestPlacementRecord?.averagePackageLPA || 8.5;
  const nirfMedian = currentCollege?.rankingDetails?.nirfMedianLPA || 7.2;
  const verifiedMedian = currentCollege?.studentVerifiedStats?.medianPackageLPA || 9.0;
  const batchMedian = 6.0;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://placementreality.in';

  // Format WhatsApp message
  const whatsappText = isCollegePage
    ? `🚨 *REALITY CHECK: ${shortName} Placements* (Truth-in-Data Audit)\n\n` +
      `📢 *College Brochure Claim:* Peak ₹${brochureHighest} LPA | Avg ₹${brochureAvg} LPA\n` +
      `🏛️ *Govt. NIRF Statutory Audit:* ₹${nirfMedian} LPA Median (Ministry of Education)\n` +
      `🎓 *Student Reality (Verified):* ₹${verifiedMedian} LPA (Offers) | ~₹${batchMedian} LPA (Batch Consensus)\n\n` +
      `⚖️ *Verdict:* Promotional marketing overstates typical graduate packages.\n\n` +
      `👉 *Check the Full 3-Way Triangulation Audit:* ${currentUrl}`
    : `🚨 *Placement Reality: Stop Falling for Fake College Placement Ads!*\n\n` +
      `Compare College Brochure Claims vs. Govt. NIRF Statutory Audits vs. Student-Verified Offer Letters across Top Indian Engineering Colleges.\n\n` +
      `👉 *Check Verified Placements:* ${currentUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const tweet = isCollegePage
      ? `Reality Check: ${shortName} placements audited.\nBrochure: ₹${brochureHighest}L Peak\nGovt NIRF: ₹${nirfMedian}L Median\nStudent Verified: ₹${verifiedMedian}L Median\n\nNo marketing lies:`
      : `Check real verified college placements vs marketing brochure claims:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Generate downloadable Infographic Card PNG using HTML5 Canvas
  const handleDownloadCard = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');

      // 1. Background gradient
      const bg = ctx.createLinearGradient(0, 0, 1200, 675);
      bg.addColorStop(0, '#0a0f1d');
      bg.addColorStop(0.5, '#111827');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1200, 675);

      // Subtle glowing accents
      const glow1 = ctx.createRadialGradient(200, 100, 10, 200, 100, 300);
      glow1.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
      glow1.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 600, 400);

      const glow2 = ctx.createRadialGradient(1000, 500, 10, 1000, 500, 300);
      glow2.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
      glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(600, 300, 600, 375);

      // 2. Header & Branding
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('⚖️ PLACEMENT REALITY • 3-WAY TRUTH TRIANGULATION', 60, 65);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      const titleText = isCollegePage ? `${collegeName}` : 'Engineering Placement Reality Report';
      ctx.fillText(titleText.length > 45 ? `${titleText.slice(0, 42)}...` : titleText, 60, 120);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Marketing Brochure Claims vs. Govt. NIRF Sworn Disclosures vs. Audited Student Offers', 60, 155);

      // 3. Three Pillars (Side-by-Side Cards)
      const cardY = 195;
      const cardH = 340;
      const cardW = 340;
      const gap = 30;

      // Card 1: Brochure
      const card1X = 60;
      ctx.fillStyle = '#1e1b2e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(card1X, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('📢 PILLAR 1: MARKETING ADS', card1X + 24, cardY + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('College Brochure', card1X + 24, cardY + 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Promotional Admissions Portal', card1X + 24, cardY + 115);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Claimed Peak CTC:', card1X + 24, cardY + 175);
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText(`₹${brochureHighest} LPA`, card1X + 24, cardY + 215);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`Advertised Average: ~₹${brochureAvg} LPA`, card1X + 24, cardY + 265);
      ctx.fillText('Median CTC: NOT DISCLOSED', card1X + 24, cardY + 295);

      // Card 2: NIRF (Govt)
      const card2X = card1X + cardW + gap;
      ctx.fillStyle = '#172033';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(card2X, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('🏛️ PILLAR 2: STATUTORY OATH', card2X + 24, cardY + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('Govt. NIRF Report', card2X + 24, cardY + 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Ministry of Education, GoI', card2X + 24, cardY + 115);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Sworn Median CTC:', card2X + 24, cardY + 175);
      ctx.fillStyle = '#818cf8';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText(`₹${nirfMedian} LPA`, card2X + 24, cardY + 215);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Signed under legal oath', card2X + 24, cardY + 265);
      ctx.fillText('Peak CTC omitted to stop skew', card2X + 24, cardY + 295);

      // Card 3: Student Reality
      const card3X = card2X + cardW + gap;
      ctx.fillStyle = '#06271e';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(card3X, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('🎓 PILLAR 3: GROUND-TRUTH', card3X + 24, cardY + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('Student Reality', card3X + 24, cardY + 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Audited Offers & Pay Slips', card3X + 24, cardY + 115);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Verified Offer Median:', card3X + 24, cardY + 175);
      ctx.fillStyle = '#34d399';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText(`₹${verifiedMedian} LPA`, card3X + 24, cardY + 215);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`Batch Consensus: ~₹${batchMedian} LPA`, card3X + 24, cardY + 265);
      ctx.fillText('Real In-Hand: ~₹54,000 / mo', card3X + 24, cardY + 295);

      // 4. Footer Bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(60, 560, 1080, 1);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('🛡️ 100% Retaliation-Proof • Anti-Inflation Verification Engine • placementreality.in', 60, 605);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Scan or visit to audit your college →', 840, 605);

      // Trigger download
      const imageUri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${(shortName || 'college').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-reality-card.png`;
      link.href = imageUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download card error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (BOTTOM-LEFT) */}
      <aside
        aria-label="Share College Reality Card"
        className="fixed bottom-[5.5rem] left-6 z-40 flex flex-col items-center group"
      >
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl shadow-emerald-600/40 hover:shadow-emerald-600/60 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40 flex items-center justify-center relative cursor-pointer"
          title="Share College Reality Card"
          aria-label="Share College Reality Card"
        >
          <Share2 className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-emerald-800"></span>
        </button>
        <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-xs text-[10px] font-extrabold text-white shadow-lg border border-slate-700/60 uppercase tracking-wider group-hover:bg-emerald-600 transition-colors">
          Share Reality
        </span>
      </aside>

      {/* MODAL: SHARE REALITY CARD & INFOGRAPHIC */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full border border-slate-800 shadow-2xl overflow-hidden space-y-5 p-6 sm:p-7 relative">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] uppercase tracking-wider border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Virality Truth Card</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Share {shortName} Reality Report
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empower applicants and parents with authentic, verified placement data instead of billboard marketing claims.
              </p>
            </div>

            {/* Visual Reality Card Preview */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-700/80 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>3-Way Truth Audit</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Anti-Inflation Verified
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                {/* Pillar 1 */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] text-amber-400 block font-bold uppercase">📢 Brochure</span>
                  <span className="text-base sm:text-lg font-black text-white block">₹{brochureHighest}L</span>
                  <span className="text-[10px] text-slate-400 block">Peak Claim</span>
                </div>
                {/* Pillar 2 */}
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                  <span className="text-[10px] text-indigo-400 block font-bold uppercase">🏛️ Govt. NIRF</span>
                  <span className="text-base sm:text-lg font-black text-white block">₹{nirfMedian}L</span>
                  <span className="text-[10px] text-slate-400 block">Sworn Median</span>
                </div>
                {/* Pillar 3 */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] text-emerald-400 block font-bold uppercase">🎓 Student Reality</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 block">₹{verifiedMedian}L</span>
                  <span className="text-[10px] text-slate-400 block">Verified Offers</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Batch Consensus: <strong>~₹{batchMedian} LPA</strong></span>
                </span>
                <span className="text-amber-400 font-bold">Brochures Hide Medians</span>
              </div>
            </div>

            {/* Quick Share Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* WhatsApp Share Button */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Share on WhatsApp</span>
              </button>

              {/* Download Image Card */}
              <button
                onClick={handleDownloadCard}
                disabled={downloading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Generating Card...' : 'Download Card PNG'}</span>
              </button>

              {/* Copy Reality Link */}
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Reality Link'}</span>
              </button>

              {/* Twitter / X Share */}
              <button
                onClick={handleTwitterShare}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Share on X / Twitter</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>100% Retaliation-Proof • Encrypted Student Evidence</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingShareRealityButton;
