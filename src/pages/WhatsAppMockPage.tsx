export default function WhatsAppMockPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-grey/20">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy tracking-tight">
            WhatsApp Delivery Channel Preview
          </h1>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
            Pitch Visual
          </span>
        </div>
        <p className="text-xs text-grey mt-1">
          Demonstrating PrepSaathi's Tier 2–3 positioning: The web app is the execution engine; WhatsApp is the zero-friction delivery channel.
        </p>
      </div>

      {/* Stage Explainer Banner (§1 Constraint 25) */}
      <div className="p-4 rounded-xl bg-navy text-white text-xs leading-relaxed space-y-1 shadow-sm">
        <p className="font-bold text-orange uppercase tracking-wider text-[11px]">
          Stage Script & Pitch Framing (§1 & §11 Q&A)
        </p>
        <p className="text-slate-200">
          "Aspirants in small towns do not open heavy discipline apps. They live inside WhatsApp. Here is the exact same daily loop running seamlessly over WhatsApp chat."
        </p>
      </div>

      {/* Mocked WhatsApp Chat Phone Frame */}
      <div className="bg-[#EFEAE2] rounded-3xl shadow-xl border-4 border-slate-700 overflow-hidden flex flex-col max-w-md mx-auto min-h-[580px]">
        {/* WhatsApp Top Bar */}
        <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">←</span>
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white">
              PS
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">PrepSaathi AI Saathi</h3>
              <p className="text-[10px] text-emerald-200">Execution Partner · Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>📹</span>
            <span>📞</span>
            <span>⋮</span>
          </div>
        </div>

        {/* WhatsApp Chat Bubbles Container (§6 Screen 10) */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto text-xs">
          {/* Timestamp */}
          <div className="flex justify-center my-1">
            <span className="bg-white/80 text-slate-600 text-[10px] px-2.5 py-0.5 rounded-md shadow-2xs font-medium">
              Today · 30 Oct 2026
            </span>
          </div>

          {/* 1. Morning Goal Voice Note (User message, right aligned) */}
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-xs p-3 max-w-[85%] shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="text-base">🎙️</span>
                <div className="flex-1">
                  <div className="h-1 bg-slate-300 rounded-full w-28" />
                  <span className="text-[10px] text-slate-500">Voice Note (0:18)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-700 italic">
                "Targeting 6 hours today. Need to clear relative velocity questions in maths."
              </p>
              <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400">
                <span>08:14 AM</span>
                <span className="text-blue">✓✓</span>
              </div>
            </div>
          </div>

          {/* 2. AI Plan Reply (PrepSaathi reply, left aligned) */}
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 max-w-[88%] shadow-xs space-y-1.5 border border-slate-100">
              <p className="font-bold text-navy text-xs">
                Good morning, Priya! 🎯 Here is today’s 3-task adaptive plan:
              </p>
              <div className="space-y-1 text-[11px] text-slate-800 border-l-2 border-[#075E54] pl-2 py-0.5">
                <p><strong>1. Quant (45m):</strong> 15 relative speed train problems (Weak topic · scored 32% on diagnostic)</p>
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
          </div>

          {/* 3. Midday Quiz Link (PrepSaathi message) */}
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-xs p-3 max-w-[88%] shadow-xs space-y-1.5 border border-slate-100">
              <p className="text-slate-800 text-[11px]">
                ⚡ <strong>Midday Concept Check:</strong> Test your understanding of opposite vs same direction relative motion in 5 questions.
              </p>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-900">Take 5-min Diagnostic Quiz</span>
                <span className="text-emerald-700">tap here →</span>
              </div>
              <div className="flex justify-end text-[9px] text-slate-400">
                <span>01:30 PM</span>
              </div>
            </div>
          </div>

          {/* 4. Evening Proof Photo (User message) */}
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-xs p-2 max-w-[80%] shadow-xs space-y-1">
              <div className="rounded-xl overflow-hidden bg-slate-200 h-28 flex items-center justify-center text-slate-500 text-xs">
                <span>📷 [Notebook Photo: Solved Train Problems]</span>
              </div>
              <p className="text-[11px] text-slate-700 px-1">
                Completed 15 problems. Relative speed formula memorized!
              </p>
              <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 pr-1">
                <span>09:20 PM</span>
                <span className="text-blue">✓✓</span>
              </div>
            </div>
          </div>

          {/* 5. Streak Confirmation (PrepSaathi reply) */}
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-xs p-3 max-w-[88%] shadow-xs space-y-1 border border-slate-100">
              <p className="font-bold text-orange text-xs flex items-center gap-1">
                <span>🔥</span>
                <span>Streak Confirmed: 13 Days!</span>
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Proof verified. +50 points added. Your squad (SSC CGL #4) feed updated — Aspirant D completed today.
              </p>
              <p className="text-[10px] text-emerald-800 font-semibold pt-0.5">
                Tomorrow's plan adapted: Moving to Boat & Stream problems.
              </p>
              <div className="flex justify-end text-[9px] text-slate-400">
                <span>09:21 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mock Bottom Input Bar */}
        <div className="bg-[#F0F0F0] p-2 flex items-center gap-2 border-t border-slate-200">
          <span className="text-lg text-slate-500">😊</span>
          <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400">
            Type a message...
          </div>
          <span className="text-lg text-slate-500">📎</span>
          <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white text-xs">
            🎙️
          </div>
        </div>
      </div>
    </div>
  );
}
