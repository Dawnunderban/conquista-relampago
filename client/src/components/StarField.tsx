import React from 'react';

export function StarField() {
  const stars = [
    { top: '8%', left: '15%', size: 'w-0.5 h-0.5', color: 'bg-white' },
    { top: '20%', left: '80%', size: 'w-1 h-1', color: 'bg-blue-300' },
    { top: '35%', left: '5%', size: 'w-0.5 h-0.5', color: 'bg-purple-400' },
    { top: '50%', left: '90%', size: 'w-0.5 h-0.5', color: 'bg-white' },
    { top: '65%', left: '25%', size: 'w-0.5 h-0.5', color: 'bg-cyan-300' },
    { top: '75%', left: '70%', size: 'w-1 h-1', color: 'bg-white' },
    { top: '90%', left: '40%', size: 'w-0.5 h-0.5', color: 'bg-purple-300' },
    { top: '12%', left: '55%', size: 'w-0.5 h-0.5', color: 'bg-white' },
    { top: '42%', left: '48%', size: 'w-0.5 h-0.5', color: 'bg-blue-200' },
    { top: '82%', left: '12%', size: 'w-0.5 h-0.5', color: 'bg-cyan-200' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s, i) => (
        <div
          key={i}
          className={`absolute ${s.size} ${s.color} rounded-full opacity-50 animate-pulse`}
          style={{ top: s.top, left: s.left, boxShadow: '0 0 3px currentColor' }}
        />
      ))}
    </div>
  );
}
export default StarField;
