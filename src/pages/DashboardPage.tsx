export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-grey mt-1">Your daily execution overview</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-grey/20 p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-grey">Execution Gap chart — Phase 4</p>
      </div>
    </div>
  );
}
