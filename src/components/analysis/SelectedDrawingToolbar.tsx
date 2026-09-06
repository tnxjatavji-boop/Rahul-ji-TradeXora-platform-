import React from 'react';
import { Trash2, X, Lock, Unlock } from 'lucide-react';
import { DrawingItem } from '../../types/analysis';

interface SelectedDrawingToolbarProps {
  drawing: DrawingItem | null;
  onUpdateDrawing: (updated: DrawingItem) => void;
  onDeleteDrawing: (id: string) => void;
  onCloneDrawing?: (drawing: DrawingItem) => void;
  onDeselect: () => void;
  theme?: 'light' | 'dark';
}

const COLORS = ['#fbbf24', '#0088cc', '#00b067', '#ff3b30', '#ffffff'];

export const SelectedDrawingToolbar: React.FC<SelectedDrawingToolbarProps> = ({
  drawing,
  onUpdateDrawing,
  onDeleteDrawing,
  onDeselect,
  theme = 'light'
}) => {
  if (!drawing) return null;

  const isDark = theme === 'dark';

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      data-interactive="true"
      className="absolute bottom-8 right-17 z-40 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-none"
      onMouseDown={stopEvent}
      onMouseUp={stopEvent}
      onTouchStart={stopEvent}
      onTouchEnd={stopEvent}
      onTouchMove={stopEvent}
      onPointerDown={stopEvent}
      onClick={stopEvent}
    >
      <div 
        data-interactive="true"
        className={`py-1 px-0.5 rounded-xl shadow-2xl border backdrop-blur-2xl flex flex-col items-center gap-1 w-7.5 ${
          isDark ? 'bg-slate-900/98 border-slate-700 text-slate-100' : 'bg-white/98 border-gray-300 text-gray-900'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onDeselect();
          }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer active:scale-90 transition-all"
          title="Deselect"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-4 h-px bg-gray-200 dark:bg-slate-700" />

        {/* Delete Button */}
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteDrawing(drawing.id);
          }}
          className="w-6 h-6 rounded-lg flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white active:scale-90 transition-all cursor-pointer"
          title="Delete Drawing"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-4 h-px bg-gray-200 dark:bg-slate-700" />

        {/* Color Palette (5 Colors Vertical) */}
        <div data-interactive="true" className="flex flex-col items-center gap-1.5 py-0.5">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateDrawing({ ...drawing, color: c });
              }}
              className={`w-4 h-4 rounded-full border transition-transform cursor-pointer active:scale-90 shrink-0 ${
                drawing.color === c 
                  ? 'scale-125 ring-2 ring-blue-400 border-white dark:border-slate-900 shadow-xs' 
                  : 'hover:scale-110 border-black/20 dark:border-white/30'
              }`}
              style={{ backgroundColor: c }}
              title={`Color: ${c}`}
            />
          ))}
        </div>

        <div className="w-4 h-px bg-gray-200 dark:bg-slate-700" />

        {/* Line Thickness: 1w / 2w / 3w (1-tap toggle) */}
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            const nextWidth = drawing.lineWidth === 1 ? 2 : drawing.lineWidth === 2 ? 3 : 1;
            onUpdateDrawing({ ...drawing, lineWidth: nextWidth });
          }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black border border-blue-500/30 bg-[#0088cc]/15 text-[#0088cc] hover:bg-[#0088cc]/25 transition-transform cursor-pointer active:scale-90"
          title={`Line Width: ${drawing.lineWidth}px (Tap to change)`}
        >
          {drawing.lineWidth}w
        </button>

        {/* Line Style Toggle: Solid / Dash */}
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateDrawing({
              ...drawing,
              lineStyle: drawing.lineStyle === 'dashed' ? 'solid' : 'dashed'
            });
          }}
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-colors cursor-pointer active:scale-90 ${
            drawing.lineStyle === 'dashed'
              ? 'bg-blue-500/20 text-[#0088cc] border-blue-400 font-black' 
              : isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
          title="Line Style (Solid / Dash)"
        >
          {drawing.lineStyle === 'dashed' ? '─ ─' : '──'}
        </button>

        <div className="w-4 h-px bg-gray-200 dark:bg-slate-700" />

        {/* Lock / Unlock Toggle */}
        <button
          type="button"
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateDrawing({ ...drawing, locked: !drawing.locked });
          }}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
            drawing.locked 
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
              : 'text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
          title={drawing.locked ? "Unlock" : "Lock position"}
        >
          {drawing.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
