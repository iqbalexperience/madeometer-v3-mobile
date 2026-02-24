import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MeterGaugeProps {
  value: number;
  label: string;
  color: string;
}

const MeterGauge: React.FC<MeterGaugeProps> = ({ value, label, color }) => {
  // Normalize value 0-100
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  
  const data = [
    { name: 'Value', value: normalizedValue },
    { name: 'Remaining', value: 100 - normalizedValue },
  ];

  return (
    <div className="flex flex-col items-center justify-center relative w-32 h-32">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center mt-4">
          <span className="text-2xl font-bold text-white block">{normalizedValue}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={40}
            outerRadius={55}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell key={`cell-val`} fill={color} />
            <Cell key={`cell-bg`} fill="#334155" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Decorative Ticks */}
      <div className="absolute bottom-10 w-full flex justify-between px-4 text-[10px] text-slate-500 font-mono">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};

export default MeterGauge;
