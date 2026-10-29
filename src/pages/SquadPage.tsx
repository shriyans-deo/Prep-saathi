import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

interface SquadMember {
  id: string;
  codename: string;
  exam: string;
  streak: number;
  hoursThisWeek: number;
  checkinsThisWeek: number;
  checkedInToday: boolean;
  statusTime: string;
  isUser?: boolean;
}

const INITIAL_MEMBERS: SquadMember[] = [
  {
    id: 'm1',
    codename: 'Aspirant A (Rank Target < 500)',
    exam: 'SSC CGL',
    streak: 18,
    hoursThisWeek: 34.5,
    checkinsThisWeek: 7,
    checkedInToday: true,
    statusTime: 'Checked in 2h ago (Notebook Photo)',
  },
  {
    id: 'm2',
    codename: 'Aspirant B (Tier-2 Delhi)',
    exam: 'SSC CGL',
    streak: 14,
    hoursThisWeek: 31.0,
    checkinsThisWeek: 6,
    checkedInToday: true,
    statusTime: 'Checked in 45m ago (Text Log)',
  },
  {
    id: 'm3',
    codename: 'Aspirant C (Repeat Attempt)',
    exam: 'SSC CGL',
    streak: 9,
    hoursThisWeek: 26.5,
    checkinsThisWeek: 5,
    checkedInToday: true,
    statusTime: 'Checked in 4h ago (Voice Memo)',
  },
  {
    id: 'm4',
    codename: 'Aspirant D (You · Priya Sharma)',
    exam: 'SSC CGL',
    streak: 12,
    hoursThisWeek: 22.0,
    checkinsThisWeek: 5,
    checkedInToday: true,
    statusTime: 'Checked in today (Photo Verified)',
    isUser: true,
  },
  {
    id: 'm5',
    codename: 'Aspirant E (Patna Center)',
    exam: 'SSC CGL',
    streak: 0,
    hoursThisWeek: 16.0,
    checkinsThisWeek: 3,
    checkedInToday: false,
    statusTime: 'Missed today’s check-in',
  },
  {
    id: 'm6',
    codename: 'Aspirant F (Self-Study)',
    exam: 'SSC CGL',
    streak: 0,
    hoursThisWeek: 14.2,
    checkinsThisWeek: 2,
    checkedInToday: false,
    statusTime: 'Missed today’s check-in',
  },
];

const SQUAD_FEED = [
  {
    time: '2 hours ago',
    text: 'Aspirant A completed today’s plan and submitted notebook proof (Geometry formulas). Streak: 18 days.',
  },
  {
    time: '45 mins ago',
    text: 'Aspirant B logged 4.2 hours and completed 20 syllogism questions.',
  },
  {
    time: '4 hours ago',
    text: 'Aspirant C verified study session with 45s voice recall debrief.',
  },
  {
    time: '6 hours ago',
    text: '⚠️ Loss Aversion Alert: Aspirants E and F have not logged hours in 28 hours.',
  },
];

export default function SquadPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const currentProfile = profile || DEMO_PROFILE;

  const [members] = useState<SquadMember[]>(INITIAL_MEMBERS);

  // Grouped comparison data for Chart 4 (§8)
  const comparisonData = members.map((m) => ({
    name: m.isUser ? 'You' : m.codename.split(' ')[0] + ' ' + m.codename.split(' ')[1],
    hours: m.hoursThisWeek,
    checkins: m.checkinsThisWeek,
    isUser: m.isUser,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-grey/20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-navy tracking-tight">
              Squad Accountability Board
            </h1>
            <span className="text-xs bg-navy text-white px-2.5 py-0.5 rounded-full font-mono">
              Batch #SSC-04
            </span>
          </div>
          <p className="text-xs text-grey mt-1">
            Six pseudonymous aspirants preparing for {currentProfile.exam}. Mutual visibility keeps you honest.
          </p>
        </div>

        <button
          onClick={() => navigate('/proof')}
          className="px-4 py-2 rounded-xl bg-orange hover:bg-orange/90 text-white font-bold text-xs shadow-sm transition"
        >
          Submit Today's Proof 🔥
        </button>
      </div>

      {/* Mechanism Label Card (§6 Screen 8: "Label the card with the mechanism: Loss aversion — your squad sees the gap.") */}
      <div className="p-4 rounded-xl bg-navy text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-navy/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👀</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange">
              Behavioral Mechanism: Loss Aversion
            </p>
            <p className="text-xs text-slate-200 mt-0.5">
              Your squad sees the gap. Missing your daily target places a visible red flag next to your codename.
            </p>
          </div>
        </div>
        <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-slate-300 font-mono">
          4 of 6 Checked In Today
        </span>
      </div>

      {/* Members Table (§6 Screen 8: Six pseudonymous members, today's status, streak, hours, red flags) */}
      <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6 space-y-4">
        <h3 className="font-bold text-base text-navy">Member Execution Standings</h3>

        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                m.isUser
                  ? 'border-orange/40 bg-orange/5 ring-1 ring-orange/30'
                  : m.checkedInToday
                  ? 'border-grey/20 bg-white'
                  : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    m.isUser
                      ? 'bg-orange text-white'
                      : m.checkedInToday
                      ? 'bg-navy text-white'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {m.codename.charAt(9) || 'A'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-navy">{m.codename}</h4>
                    {m.isUser && (
                      <span className="text-[10px] bg-orange text-white px-2 py-0.5 rounded font-extrabold">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{m.statusTime}</p>
                </div>
              </div>

              {/* Status and Red Flag Indicators (§6 Screen 8: "Red flag on anyone who missed today, including the user") */}
              <div className="flex items-center gap-4 text-xs font-semibold justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-grey/15">
                <div>
                  <span className="text-grey text-[10px] block">Weekly Hours</span>
                  <span className="text-navy font-bold font-mono">{m.hoursThisWeek}h</span>
                </div>

                <div>
                  <span className="text-grey text-[10px] block">Current Streak</span>
                  <span className={`font-mono font-bold ${m.streak > 0 ? 'text-orange' : 'text-grey'}`}>
                    {m.streak > 0 ? `🔥 ${m.streak}d` : 'Broken'}
                  </span>
                </div>

                <div>
                  {m.checkedInToday ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                      Active ✓
                    </span>
                  ) : (
                    /* Red Flag */
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold border border-red-300 flex items-center gap-1 animate-pulse">
                      <span>🚩</span>
                      <span>Missed Today</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 4: Squad Comparison (§8: "Grouped bars, pseudonymous labels, check-ins this week. The user's own bar highlighted in orange. Being fourth of five is the product working.") */}
      <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6 space-y-4">
        <div>
          <h3 className="font-bold text-base text-navy">Weekly Executed Hours Comparison</h3>
          <p className="text-xs text-grey mt-0.5">
            Your position relative to squad peers. Being 4th with 22h executed proves the social pressure works.
          </p>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} unit="h" />
              <Tooltip />
              <Bar dataKey="hours" name="Executed Hours" radius={[6, 6, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isUser ? '#F97316' : '#2563EB'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 rounded-xl bg-orange/5 border border-orange/20 text-xs text-orange-950 flex items-center justify-between">
          <span>
            💡 <strong>Deck Citation:</strong> You are currently 4th in your 6-member squad with 22 hours logged. Peer accountability drives you to finish task 3.
          </span>
          <span className="font-bold text-orange">Rank: #4</span>
        </div>
      </div>

      {/* Squad Activity Feed (§6 Screen 8) */}
      <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6 space-y-3">
        <h3 className="font-bold text-sm text-navy">Live Squad Activity Feed</h3>
        <div className="space-y-2.5">
          {SQUAD_FEED.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50 border border-grey/15 text-xs flex items-start justify-between gap-3"
            >
              <p className="text-slate-800">{item.text}</p>
              <span className="text-grey text-[11px] whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
