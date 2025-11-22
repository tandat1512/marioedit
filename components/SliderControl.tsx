import React from 'react';
import { SliderProps } from '../types';

export const SliderControl: React.FC<SliderProps> = ({ label, value, min = 0, max = 100, onChange }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) * 100) / (max - min)));

  return (
    <div className="mb-5 group">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">{label}</label>
        <span className="text-xs text-gray-500 font-mono group-hover:text-fuchsia-400">{value > 0 ? `+${value}` : value}</span>
      </div>
      <div className="relative w-full h-4 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
             {/* Track Fill */}
            <div 
                className="h-full bg-fuchsia-500 rounded-full transition-all duration-150 ease-out" 
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
        
        {/* Input (Invisible but interactive) */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {/* Custom Thumb (Visual only) */}
        <div 
            className="absolute h-3.5 w-3.5 bg-fuchsia-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(217,70,239,0.4)] pointer-events-none z-20 transition-all duration-150 ease-out"
            style={{ left: `calc(${percentage}% - 7px)` }}
        ></div>
      </div>
    </div>
  );
};