import React from 'react';

export function StarField() {
  const stars = [
    { top: '8%', left: '15%', size: 'w-1 h-1', color: 'bg-green-500' },
    { top: '20%', left: '80%', size: 'w-1.5 h-1.5', color: 'bg-blue-500' },
    { top: '35%', left: '5%', size: 'w-1 h-1', color: 'bg-slate-950' },
    { top: '50%', left: '90%', size: 'w-1 h-1', color: 'bg-green-500' },
    { top: '65%', left: '25%', size: 'w-1.5 h-1.5', color: 'bg-blue-500' },
    { top: '75%', left: '70%', size: 'w-1 h-1', color: 'bg-slate-950' },
    { top: '90%', left: '40%', size: 'w-1.5 h-1.5', color: 'bg-green-500' },
    { top: '12%', left: '55%', size: 'w-1 h-1', color: 'bg-blue-500' },
    { top: '42%', left: '48%', size: 'w-1 h-1', color: 'bg-slate-950' },
    { top: '82%', left: '12%', size: 'w-1.5 h-1.5', color: 'bg-green-500' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-white">
      {stars.map((s, i) => (
        <div
          key={i}
          className={`absolute ${s.size} ${s.color} rounded-full opacity-20 animate-pulse`}
          style={{ top: s.top, left: s.left }}
        />
      ))}
    </div>
  );
}
export default StarField;
