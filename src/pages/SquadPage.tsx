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
import {
  FlameIcon,
  CheckIcon,
  FlagIcon,
  ClockIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { motion } from 'motion/react';

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
    text: 'Loss Aversion Alert: Aspirants E and F have not logged hours in 28 hours.',
  },
];

export default function SquadPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const currentProfile = profile || DEMO_PROFILE;

  const [members] = useState<SquadMember[]>(INITIAL_MEMBERS);

  const comparisonData = members.map((m) => ({
    name: m.isUser ? 'You' : m.codename.split(' ')[0] + ' ' + m.codename.split(' ')[1],
    hours: m.hoursThisWeek,
    checkins: m.checkinsThisWeek,
    isUser: m.isUser,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                Squad Accountability Board
              </h1>
              <Badge variant="neutral">
                <span>Cohort #SSC-04</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Six pseudonymous aspirants preparing for {currentProfile.exam}. Mutual visibility keeps you honest.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/proof')}
            className="px-4 py-2.5 rounded-xl bg-orange hover:bg-orange/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <FlameIcon size={14} />
            <span>Submit Today's Proof</span>
          </motion.button>
        </div>
      </BlurFade>

      {/* Mechanism Label Card with BorderBeam */}
      <BlurFade delay={0.1}>
        <div className="relative overflow-hidden p-5 rounded-2xl bg-navy text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-navy/40">
          <BorderBeam size={190} duration={14} colorFrom="#F97316" colorTo="#FED7AA" />
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange/20 border border-orange/30 flex items-center justify-center text-orange flex-shrink-0">
              <FlagIcon size={18} className="text-orange" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange block">
                Behavioral Mechanism: Loss Aversion
              </span>
              <p className="text-sm font-semibold text-white mt-0.5">
                Your squad sees the gap. Missing your daily target places a visible red flag next to your codename.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl font-mono text-slate-200 self-start sm:self-auto flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>4 of 6 Checked In Today</span>
          </div>
        </div>
      </BlurFade>

      {/* Members Standings Table/Cards using SpotlightCard */}
      <BlurFade delay={0.15}>
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-4">
          <h3 className="font-bold text-base text-navy tracking-tight">Member Execution Standings</h3>

          <div className="space-y-3">
            {members.map((m) => (
              <SpotlightCard
                key={m.id}
                spotlightColor={m.isUser ? 'rgba(249, 115, 22, 0.08)' : 'rgba(37, 99, 235, 0.06)'}
                className={`p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                  m.isUser
                    ? 'border-orange/40 bg-orange/5 ring-1 ring-orange/30'
                    : m.checkedInToday
                    ? 'border-slate-200 bg-white'
                    : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
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
                      <h4 className="text-sm font-bold text-navy">{m.codename}</h4>
                      {m.isUser && (
                        <span className="text-[10px] bg-orange text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.statusTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-semibold justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Weekly Hours</span>
                    <span className="text-navy font-bold font-mono text-sm">{m.hoursThisWeek}h</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Streak</span>
                    <span className={`font-mono font-bold flex items-center gap-1 ${m.streak > 0 ? 'text-orange' : 'text-slate-400'}`}>
                      {m.streak > 0 && <FlameIcon size={12} className="text-orange" />}
                      <span>{m.streak > 0 ? `${m.streak}d` : 'Broken'}</span>
                    </span>
                  </div>

                  <div>
                    {m.checkedInToday ? (
                      <Badge variant="mastered">
                        <CheckIcon size={11} />
                        <span>Active</span>
                      </Badge>
                    ) : (
                      <Badge variant="weak">
                        <FlagIcon size={11} className="text-red-600" />
                        <span>Missed Today</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </BlurFade>

      {/* Chart 4: Squad Comparison Bar Chart */}
      <BlurFade delay={0.2}>
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-5">
          <div>
            <h3 className="font-bold text-base text-navy tracking-tight">Weekly Executed Hours Comparison</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your standing relative to squad peers. Being 4th with 22h executed proves the social pressure works.
            </p>
          </div>

          <div className="h-64 w-full">
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

          <div className="p-3.5 rounded-xl bg-orange/5 border border-orange/20 text-xs text-orange-950 flex items-center justify-between">
            <span className="leading-relaxed">
              💡 <strong>Deck Citation:</strong> You are currently 4th in your 6-member squad with 22 hours logged. Peer accountability drives you to finish task 3.
            </span>
            <span className="font-bold text-orange font-mono text-sm ml-2">Rank #4</span>
          </div>
        </div>
      </BlurFade>

      {/* Live Squad Activity Feed */}
      <BlurFade delay={0.25}>
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-3.5">
          <h3 className="font-bold text-sm text-navy tracking-tight">Live Squad Activity Feed</h3>
          <div className="space-y-2.5">
            {SQUAD_FEED.map((item, idx) => (
              <motion.div
                whileHover={{ x: 2 }}
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start justify-between gap-3 transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  <ClockIcon size={13} className="text-slate-400 flex-shrink-0" />
                  <p className="text-slate-800 font-medium">{item.text}</p>
                </div>
                <span className="text-slate-400 text-[11px] whitespace-nowrap font-mono">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
