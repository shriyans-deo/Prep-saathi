import { Badge } from '../components/ui/Badge';
import { SparklesIcon, MicIcon, CheckIcon } from '../components/ui/Icons';
import { BlurFade } from '../components/magicui/BlurFade';
import { motion } from 'motion/react';

export default function WhatsAppMockPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              WhatsApp Delivery Channel Preview
            </h1>
            <Badge variant="mastered">
              <SparklesIcon size={12} className="text-emerald-700" />
              <span>Tier 2–3 Channel</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Demonstrating PrepSaathi's distribution architecture: The web application is the core execution engine; WhatsApp is the zero-friction daily delivery channel.
          </p>
        </div>
      </BlurFade>

      {/* Stage Pitch Framing Banner */}
      <BlurFade delay={0.1}>
        <div className="p-5 rounded-2xl bg-navy text-white text-xs leading-relaxed space-y-1.5 shadow-sm border border-navy/40">
          <span className="font-extrabold text-orange uppercase tracking-wider text-[11px] block">
            Stage Script & Distribution Thesis
          </span>
          <p className="text-slate-200 text-sm font-medium">
            "Aspirants in small towns do not open heavy discipline apps. They live inside WhatsApp. Here is the exact same daily loop running seamlessly over chat."
          </p>
        </div>
      </BlurFade>

      {/* Mocked WhatsApp Chat Phone Frame */}
      <BlurFade delay={0.15}>
        <div className="bg-[#EFEAE2] rounded-3xl shadow-xl border-4 border-slate-700 overflow-hidden flex flex-col max-w-md mx-auto min-h-[600px]">
          {/* WhatsApp Top Bar */}
          <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold">←</span>
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white shadow-xs">
                PS
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">PrepSaathi AI Saathi</h3>
                <p className="text-[10px] text-emerald-200">Execution Partner · Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-100">
              <span>📹</span>
              <span>📞</span>
              <span>⋮</span>
            </div>
          </div>

          {/* WhatsApp Chat Bubbles Container */}
          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto text-xs">
            {/* Timestamp */}
            <div className="flex justify-center my-1">
              <span className="bg-white/80 text-slate-600 text-[10px] px-3 py-0.5 rounded-md shadow-2xs font-medium">
                Today · 30 Oct 2026
              </span>
            </div>

            {/* 1. Morning Goal Voice Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-end"
            >
              <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800">
                  <MicIcon size={16} className="text-slate-600" />
                  <div className="flex-1">
                    <div className="h-1 bg-slate-300 rounded-full w-28" />
                    <span className="text-[10px] text-slate-500 font-mono">Voice Note (0:18)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 italic">
                  "Targeting 6 hours today. Need to clear relative velocity questions in maths."
                </p>
                <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400">
                  <span>08:14 AM</span>
                  <span className="text-blue font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            {/* 2. AI Plan Reply */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 max-w-[88%] shadow-xs space-y-2 border border-slate-100">
                <p className="font-bold text-navy text-xs">
                  Good morning, Priya! 🎯 Here is today’s 3-task adaptive plan:
                </p>
                <div className="space-y-1 text-[11px] text-slate-800 border-l-2 border-[#075E54] pl-2.5 py-0.5">
                  <p><strong>1. Quant (45m):</strong> 15 relative speed train problems (Weak topic · 32% diagnostic)</p>
                  <p><strong>2. Reasoning (30m):</strong> 20 Syllogism drill sets (Reinforcement)</p>
                  <p><strong>3. English (40m):</strong> 2 timed comprehension passages (Maintain 78% mastery)</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  ⏱️ Total planned: 115 mins. Start task 1 when ready!
                </p>
                <div className="flex justify-end text-[9px] text-slate-400">
                  <span>08:15 AM</span>
                </div>
              </div>
            </motion.div>

            {/* 3. Midday Quiz Link */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 max-w-[88%] shadow-xs space-y-2 border border-slate-100">
                <p className="text-slate-800 text-[11px]">
                  ⚡ <strong>Midday Concept Check:</strong> Test your understanding of opposite vs same direction relative motion in 5 questions.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-900">Take 5-min Diagnostic Quiz</span>
                  <span className="text-emerald-700 font-semibold">tap here →</span>
                </div>
                <div className="flex justify-end text-[9px] text-slate-400">
                  <span>01:30 PM</span>
                </div>
              </div>
            </motion.div>

            {/* 4. Evening Proof Photo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-end"
            >
              <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-xs p-2.5 max-w-[82%] shadow-xs space-y-1.5">
                <div className="rounded-xl overflow-hidden bg-slate-200 h-28 flex items-center justify-center text-slate-500 text-xs font-semibold">
                  <span>📷 [Notebook Photo: Solved Train Problems]</span>
                </div>
                <p className="text-[11px] text-slate-700 px-1">
                  Completed 15 problems. Relative speed formula memorized!
                </p>
                <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 pr-1">
                  <span>09:20 PM</span>
                  <span className="text-blue font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            {/* 5. Streak Confirmation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 max-w-[88%] shadow-xs space-y-1.5 border border-slate-100">
                <p className="font-bold text-orange text-xs flex items-center gap-1">
                  <span>🔥</span>
                  <span>Streak Confirmed: 13 Days!</span>
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Proof verified. +50 points added. Your squad (SSC CGL #4) feed updated — Aspirant D completed today.
                </p>
                <p className="text-[10px] text-emerald-800 font-bold pt-0.5 flex items-center gap-1">
                  <CheckIcon size={12} />
                  <span>Tomorrow's plan adapted: Moving to Boat & Stream problems.</span>
                </p>
                <div className="flex justify-end text-[9px] text-slate-400">
                  <span>09:21 PM</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mock Bottom Input Bar */}
          <div className="bg-[#F0F0F0] p-2.5 flex items-center gap-2 border-t border-slate-200">
            <span className="text-lg text-slate-500">😊</span>
            <div className="flex-1 bg-white rounded-full px-3.5 py-2 text-xs text-slate-400">
              Type a message...
            </div>
            <span className="text-lg text-slate-500">📎</span>
            <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white text-xs">
              <MicIcon size={16} />
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
