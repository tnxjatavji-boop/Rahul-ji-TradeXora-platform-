import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, TrendingUp, Minus, Split, 
  Square, Eye, EyeOff, Layers, Activity, ArrowUpRight, MousePointer
} from 'lucide-react';
import { DrawingToolType } from '../../types/analysis';

interface DrawingToolsBarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  magnetMode?: boolean;
  onToggleMagnet?: () => void;
  drawingsCount: number;
  onClearDrawings?: () => void;
  hideAllDrawings: boolean;
  onToggleHideAllDrawings: () => void;
  theme?: 'light' | 'dark';
}

interface ToolItem {
  id: DrawingToolType;
  icon: React.ReactNode;
  title: string;
}

export const DrawingToolsBar: React.FC<DrawingToolsBarProps> = ({
  activeTool,
  onSelectTool,
  drawingsCount,
  hideAllDrawings,
  onToggleHideAllDrawings,
  theme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const tools: ToolItem[] = [
    { id: 'none', icon: <MousePointer className="w-3.5 h-3.5" />, title: 'Cursor / Select (पॉइंटर)' },
    { id: 'trendline', icon: <TrendingUp className="w-3.5 h-3.5" />, title: 'Trendline (ट्रेंड लाइन)' },
    { id: 'horizontal', icon: <Minus className="w-3.5 h-3.5" />, title: 'Horizontal Line (सपोर्ट/रेजिस्टेंस)' },
    { id: 'horizontal_ray', icon: <span className="font-mono text-xs font-bold leading-none">─→</span>, title: 'Horizontal Ray (रे)' },
    { id: 'arrow', icon: <ArrowUpRight className="w-3.5 h-3.5" />, title: 'Arrow (एरो)' },
    { id: 'rectangle', icon: <Square className="w-3.5 h-3.5" />, title: 'Rectangle Zone (सप्लाई/डिमांड)' },
    { id: 'fibonacci', icon: <Split className="w-3.5 h-3.5 rotate-90" />, title: 'Fibonacci (फाइबोनैचि)' },
    { id: 'channel', icon: <Layers className="w-3.5 h-3.5" />, title: 'Parallel Channel (चैनल)' },
    { id: 'ruler', icon: <Activity className="w-3.5 h-3.5" />, title: 'Price Ruler (रूलर)' },
    { id: 'brush', icon: <Pencil className="w-3.5 h-3.5" />, title: 'Brush (फ्रीहैंड)' },
    { id: 'vertical', icon: <span className="font-mono text-xs font-bold leading-none rotate-90 inline-block">─</span>, title: 'Vertical Line (टाइम लाइन)' },
  ];

  return (
    <div 
      ref={containerRef} 
      data-interactive="true"
      className="absolute top-9 left-2 z-30 flex flex-col items-center select-none pointer-events-auto"
      onMouseDown={stopEvent}
      onTouchStart={stopEvent}
      onTouchEnd={stopEvent}
      onClick={stopEvent}
    >
      {/* 1. Main Pencil Trigger Button (Compact, sleek & below the HUD timer) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border shadow-md transition-all cursor-pointer active:scale-95 ${
          activeTool !== 'none'
            ? 'bg-[#0088cc] text-white border-[#0088cc] shadow-blue-500/25 ring-2 ring-blue-400/40 scale-105'
            : isOpen
              ? isDark 
                ? 'bg-slate-800 border-[#0088cc] text-[#38bdf8]' 
                : 'bg-blue-50 border-[#0088cc] text-[#0088cc]'
              : isDark
                ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                : 'bg-white/95 border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
        title="Drawing Tools (ड्रॉइंग टूल्स)"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* 2. Slim Vertical Toolbar Strip Dropping Downwards */}
      {isOpen && (
        <div className={`mt-1 p-0.5 rounded-lg shadow-2xl border backdrop-blur-xl flex flex-col items-center gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
          isDark 
            ? 'bg-slate-900/95 border-slate-700 text-slate-200' 
            : 'bg-white/95 border-gray-300 text-gray-800'
        }`}>
          {tools.map(tool => {
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTool(tool.id);
                  setIsOpen(false);
                }}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#0088cc] text-white shadow-xs'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={tool.title}
              >
                {tool.icon}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-4 h-px bg-gray-200 dark:bg-slate-700 my-0.5" />

          {/* Eye Icon for Hide / Unhide at the very bottom */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHideAllDrawings();
            }}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              hideAllDrawings
                ? 'bg-amber-500/20 text-amber-500'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={hideAllDrawings ? "Unhide All Drawings (दिखाएं)" : "Hide All Drawings (छुपाएं)"}
          >
            {hideAllDrawings ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
