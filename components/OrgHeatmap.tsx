import React, { useState } from 'react';
import { MOCK_DEPARTMENT_DATA } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, ShieldCheck, X, Activity, Heart } from 'lucide-react';

const OrgHeatmap: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const activeDeptData = MOCK_DEPARTMENT_DATA.find(d => d.name === selectedDept);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Team Health Check</h2>
            <p className="text-slate-500 text-sm">How is everyone holding up? (Anonymous data)</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-100 flex items-center gap-1">
              <Activity size={12} /> Live Pulse
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_DEPARTMENT_DATA.map((dept, idx) => {
            let color = "bg-emerald-500";
            let bg = "bg-emerald-50";
            if (dept.risk > 60) { color = "bg-yellow-500"; bg = "bg-yellow-50"; }
            if (dept.risk > 80) { color = "bg-rose-500"; bg = "bg-rose-50"; }

            return (
              <button 
                key={idx} 
                onClick={() => setSelectedDept(dept.name)}
                className={`text-left ${bg} p-4 rounded-xl border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-slate-700">{dept.name}</h3>
                  {dept.trend === 'rising' && <TrendingUp size={16} className="text-rose-500" />}
                  {dept.trend === 'falling' && <TrendingDown size={16} className="text-emerald-500" />}
                  {dept.trend === 'stable' && <span className="text-slate-400 text-xs">-</span>}
                </div>
                
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold text-slate-800">{dept.risk}</span>
                  <span className="text-xs text-slate-500 mb-1">Stress Level</span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color}`} 
                    style={{ width: `${dept.risk}%` }}
                  ></div>
                </div>
                
                {dept.risk > 80 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-white/50 p-2 rounded">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>Needs Attention</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Heart size={18} className="text-rose-500" />
            Community Benefits
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 text-sm">Potential Sick Days Saved</span>
              <span className="font-bold text-emerald-600">~14 Days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 text-sm">People helped early</span>
              <span className="font-bold text-slate-800">14</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 text-sm">Team Mood Trend</span>
              <span className="font-bold text-emerald-600">+12% Happier</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white">
            <h3 className="font-bold mb-4">Quiet Care Suggestions</h3>
            <p className="text-slate-300 text-sm mb-4">
              "Tech Team" seems pushed to the limit. 
              They've been in meetings 40% more than usual and aren't sleeping well.
            </p>
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors">
              Suggest "No-Meeting Friday"
            </button>
        </div>
      </div>

      {/* Drill-down Modal (Simplified Overlay) */}
      {selectedDept && activeDeptData && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelectedDept(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">{activeDeptData.name} Details</h3>
                <button onClick={() => setSelectedDept(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-4">
               <div className="p-4 bg-slate-50 rounded-xl">
                 <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Biggest Drain</p>
                 <p className="font-medium text-slate-800">{activeDeptData.topStressor}</p>
               </div>
               
               <div className="p-4 bg-slate-50 rounded-xl">
                 <p className="text-xs text-slate-500 uppercase font-semibold mb-1">What's happening?</p>
                 <p className="font-medium text-slate-800">{activeDeptData.details}</p>
               </div>

               <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                 <p className="text-xs text-indigo-500 uppercase font-semibold mb-1">Helpful Tip Applied</p>
                 <p className="font-medium text-indigo-700">{activeDeptData.intervention}</p>
               </div>
             </div>

             <button 
               onClick={() => setSelectedDept(null)}
               className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
             >
               Close Details
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgHeatmap;