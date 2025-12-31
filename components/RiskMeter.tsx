import React from 'react';

interface RiskMeterProps {
  score: number;
  level: string;
}

const RiskMeter: React.FC<RiskMeterProps> = ({ score, level }) => {
  // Calculate rotation: 0 score = -90deg, 100 score = 90deg
  const rotation = (score / 100) * 180 - 90;

  let colorClass = "text-emerald-500";
  let bgClass = "bg-emerald-100";
  
  if (score > 40) { colorClass = "text-yellow-500"; bgClass = "bg-yellow-100"; }
  if (score > 70) { colorClass = "text-orange-500"; bgClass = "bg-orange-100"; }
  if (score > 85) { colorClass = "text-rose-600"; bgClass = "bg-rose-100"; }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-4">Stress Alert Level</h3>
      
      <div className="relative w-48 h-24 overflow-hidden mb-2">
        {/* Gauge Background */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-slate-100"></div>
        
        {/* Gauge Needle/Fill Simulation (Simplified) */}
         <div 
          className={`absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] ${colorClass.replace('text', 'border')} opacity-20`}
          style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 0, 0 0)' }}
         ></div>

        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-24 bg-slate-800 origin-bottom rounded-full transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        ></div>
        
        {/* Pivot */}
        <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-slate-800 rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="text-center mt-2">
        <div className={`text-4xl font-bold ${colorClass}`}>
          {score}
        </div>
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${bgClass} ${colorClass}`}>
          {level.toUpperCase()}
        </div>
      </div>
      
      <p className="text-xs text-slate-400 mt-4 text-center max-w-[200px]">
        This tracks how much "Hidden Stress" has built up recently.
      </p>
    </div>
  );
};

export default RiskMeter;