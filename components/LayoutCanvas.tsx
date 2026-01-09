
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Room, FurnitureItem } from '../types';

interface LayoutCanvasProps {
  room: Room;
  onUpdateItem: (id: string, updates: Partial<FurnitureItem>) => void;
}

const LayoutCanvas: React.FC<LayoutCanvasProps> = ({ room, onUpdateItem }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({ scale: 0.5, offsetX: 20, offsetY: 20 });
  const [isDragging, setIsDragging] = useState(false);

  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return;
    
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const padding = 60;
    
    const availableW = containerW - padding;
    const availableH = containerH - padding;
    
    const scaleW = availableW / room.width;
    const scaleH = availableH / room.depth;
    
    const newScale = Math.min(scaleW, scaleH);
    
    setViewState({
      scale: newScale,
      offsetX: (containerW - room.width * newScale) / 2,
      offsetY: (containerH - room.depth * newScale) / 2
    });
  }, [room.width, room.depth]);

  // Handle initialization and window resize
  useEffect(() => {
    // Small delay to ensure container dimensions are painted
    const timer = setTimeout(calculateLayout, 50);
    
    const observer = new ResizeObserver(calculateLayout);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [calculateLayout]);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setSelectedId(id);
    setIsDragging(true);

    const item = room.items.find(i => i.id === id);
    if (!item) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPos = { ...item.position };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / viewState.scale;
      const dy = (moveEvent.clientY - startY) / viewState.scale;

      onUpdateItem(id, {
        position: {
          x: Math.max(0, Math.min(room.width - item.dimensions.width, initialPos.x + dx)),
          y: Math.max(0, Math.min(room.depth - item.dimensions.depth, initialPos.y + dy))
        }
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleRotate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = room.items.find(i => i.id === id);
    if (item) {
      onUpdateItem(id, { rotation: (item.rotation + 90) % 360 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-slate-200/50 rounded-3xl shadow-inner border-2 border-slate-200 overflow-hidden touch-none"
      style={{ height: '450px', width: '100%' }}
      onPointerDown={() => setSelectedId(null)}
    >
      {/* Background Grid Layer */}
      <div 
        className="absolute transition-transform duration-300 pointer-events-none"
        style={{
          width: room.width * viewState.scale,
          height: room.depth * viewState.scale,
          left: viewState.offsetX,
          top: viewState.offsetY,
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '2px solid #cbd5e1'
        }}
      >
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: `${20 * viewState.scale}px ${20 * viewState.scale}px`
        }} />
      </div>

      {/* Interactive Items Layer */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: room.width * viewState.scale,
          height: room.depth * viewState.scale,
          left: viewState.offsetX,
          top: viewState.offsetY
        }}
      >
        {room.items.map(item => (
          <div
            key={item.id}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            className={`absolute flex flex-col items-center justify-center transition-shadow pointer-events-auto cursor-grab active:cursor-grabbing select-none rounded-md
              ${selectedId === item.id ? 'z-30 ring-4 ring-indigo-500/30 shadow-2xl' : 'z-20 bg-white shadow-md border border-slate-300'}`}
            style={{
              left: item.position.x * viewState.scale,
              top: item.position.y * viewState.scale,
              width: item.dimensions.width * viewState.scale,
              height: item.dimensions.depth * viewState.scale,
              transform: `rotate(${item.rotation}deg)`,
              backgroundColor: selectedId === item.id ? '#f5f3ff' : '#ffffff',
              border: selectedId === item.id ? '2px solid #6366f1' : '1px solid #94a3b8'
            }}
          >
            <div className="text-[8px] sm:text-[10px] font-bold text-slate-700 truncate w-full text-center px-1">
              {item.name}
            </div>
            
            {selectedId === item.id && (
              <div className="absolute -top-12 flex space-x-2 pointer-events-auto">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleRotate(e, item.id)}
                  className="bg-indigo-600 text-white p-2.5 rounded-full shadow-lg active:scale-90 transition-transform flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Planner HUD */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
        <div className="flex flex-col space-y-2 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); calculateLayout(); }}
            className="bg-white/90 backdrop-blur-md p-2 rounded-xl text-slate-600 shadow-md border border-slate-200 hover:text-indigo-600 transition-colors"
            title="Recenter Room"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          </button>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold text-white shadow-xl flex flex-col items-center">
          <span className="opacity-50 uppercase tracking-widest text-[8px] mb-0.5">Floor Area</span>
          <span>{room.width}cm × {room.depth}cm</span>
        </div>
      </div>

      {!room.items.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white shadow-lg text-slate-400 text-sm font-medium animate-pulse">
            No furniture placed yet
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutCanvas;
