
import React, { useState, useEffect } from 'react';
import { Room, FurnitureItem, FurnitureType } from './types';
import { ICONS } from './constants';
import LayoutCanvas from './components/LayoutCanvas';
import Scanner from './components/Scanner';
import Chatbot from './components/Chatbot';
import { geminiService } from './services/gemini';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'planner'>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [scanType, setScanType] = useState<'room' | 'furniture' | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const savedRoom = localStorage.getItem('current_room');
    if (savedRoom) {
      try {
        const parsed = JSON.parse(savedRoom);
        if (parsed && !parsed.items) parsed.items = [];
        setRoom(parsed);
      } catch (e) {
        console.error("Failed to parse saved room", e);
      }
    }
  }, []);

  const saveRoom = (newRoom: Room) => {
    setRoom(newRoom);
    localStorage.setItem('current_room', JSON.stringify(newRoom));
  };

  const handleScanResult = (data: any, imageUrl: string) => {
    if (scanType === 'room') {
      const newRoom: Room = {
        id: Date.now().toString(),
        name: "My Room",
        width: Math.max(100, data.width || 400),
        depth: Math.max(100, data.depth || 500),
        items: [],
        imageUrl
      };
      saveRoom(newRoom);
      setActiveTab('planner');
    } else if (scanType === 'furniture' && room) {
      const itemW = data.dimensions?.width || 60;
      const itemD = data.dimensions?.depth || 60;
      const centerX = (room.width - itemW) / 2;
      const centerY = (room.depth - itemD) / 2;
      const offset = (room.items.length * 15) % 100;

      const newItem: FurnitureItem = {
        id: Date.now().toString(),
        name: data.name || `Furniture ${room.items.length + 1}`,
        type: (data.type as FurnitureType) || FurnitureType.OTHER,
        dimensions: { 
          width: itemW, 
          depth: itemD, 
          height: data.dimensions?.height || 60 
        },
        position: { 
          x: Math.max(0, centerX + offset), 
          y: Math.max(0, centerY + offset) 
        },
        rotation: 0,
        imageUrl
      };
      
      const updatedRoom = { ...room, items: [...room.items, newItem] };
      saveRoom(updatedRoom);
      setActiveTab('planner');
    }
    setScanType(null);
  };

  const handleUpdateItem = (id: string, updates: Partial<FurnitureItem>) => {
    if (!room) return;
    const updatedItems = room.items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveRoom({ ...room, items: updatedItems });
  };

  const handleDeleteItem = (id: string) => {
    if (!room) return;
    if (window.confirm("Remove this item from layout?")) {
      const updatedItems = room.items.filter(item => item.id !== id);
      saveRoom({ ...room, items: updatedItems });
    }
  };

  const runOptimizer = async () => {
    if (!room || !room.items || room.items.length === 0) return;
    setIsOptimizing(true);
    
    try {
      const suggestions = await geminiService.optimizeLayout(room.width, room.depth, room.items);
      console.log("AI Suggestions:", suggestions);

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error("AI returned no suggestions.");
      }

      const updatedItems = room.items.map(item => {
        const suggestion = suggestions.find((s: any) => String(s.id) === String(item.id));
        if (suggestion) {
          return {
            ...item,
            position: { 
              x: Math.max(0, Math.min(room.width - item.dimensions.width, suggestion.x)), 
              y: Math.max(0, Math.min(room.depth - item.dimensions.depth, suggestion.y)) 
            },
            rotation: suggestion.rotation || 0
          };
        }
        return item;
      });

      saveRoom({ ...room, items: updatedItems });
    } catch (err) {
      console.error("Optimization error:", err);
      alert("AI was unable to arrange the furniture. Please try manually or check your connection.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-30">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">SmartHome</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Optimizer AI</p>
          </div>
        </div>
        <button 
          onClick={() => { if(confirm("Clear all layout data?")) { localStorage.clear(); window.location.reload(); } }}
          className="text-xs text-slate-400 font-medium hover:text-red-500 transition-colors"
        >
          Reset App
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        {activeTab === 'home' && (
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-3">Your Space, <br/>Optimized.</h2>
                <p className="text-indigo-100 text-sm opacity-90 max-w-[80%]">Use Gemini AI to scan your room and find the perfect furniture arrangement.</p>
                <button 
                  onClick={() => setScanType('room')}
                  className="mt-8 bg-white text-indigo-700 px-8 py-4 rounded-2xl font-bold flex items-center space-x-3 shadow-xl active:scale-95 transition-all"
                >
                  <span className="bg-indigo-100 p-1 rounded-lg">{ICONS.Scan}</span>
                  <span>Analyze Room</span>
                </button>
              </div>
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {room ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                    <span>Active Layout</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  </h3>
                  <button onClick={() => setActiveTab('planner')} className="text-indigo-600 text-xs font-bold hover:underline">
                    Open Planner
                  </button>
                </div>
                <div 
                  onClick={() => setActiveTab('planner')}
                  className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors text-lg">{room.name}</span>
                    <span className="text-xs font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{room.width}x{room.depth} cm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {room.items && room.items.length > 0 ? (
                        room.items.slice(0, 4).map((item, idx) => (
                          <div key={item.id} className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-sm
                            ${idx % 2 === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.name[0].toUpperCase()}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic px-1">No furniture added yet</span>
                      )}
                      {room.items && room.items.length > 4 && (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                          +{room.items.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  {ICONS.Magic}
                </div>
                <h4 className="font-bold text-sm">AI Layouts</h4>
                <p className="text-[10px] text-slate-500">Auto-arrange furniture with Gemini reasoning.</p>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
                <h4 className="font-bold text-sm">Easy Editing</h4>
                <p className="text-[10px] text-slate-500">Intuitive drag-and-drop on any mobile device.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && room && (
          <div className="space-y-6 max-w-lg mx-auto pb-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">Planner</h2>
                <p className="text-xs text-slate-500 font-medium italic">Drag items to arrange your floor</p>
              </div>
              <button 
                onClick={runOptimizer}
                disabled={isOptimizing || !room.items || room.items.length === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all active:scale-95
                  ${isOptimizing ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {isOptimizing ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                ) : <span className="mr-1">✨</span>}
                <span>{isOptimizing ? 'Arranging...' : 'AI Arrange'}</span>
              </button>
            </div>

            <LayoutCanvas room={room} onUpdateItem={handleUpdateItem} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 tracking-tight">Room Inventory ({room.items?.length || 0})</h3>
                <button 
                  onClick={() => setScanType('furniture')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
                >
                  + Add Item
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {(!room.items || room.items.length === 0) && (
                  <div className="bg-slate-100/50 rounded-[1.5rem] p-10 text-center flex flex-col items-center space-y-3 border-2 border-dashed border-slate-200">
                    <div className="w-12 h-12 text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <p className="text-slate-400 text-sm font-medium italic">Your inventory is empty. Start scanning!</p>
                  </div>
                )}
                {room.items && room.items.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 group hover:border-indigo-200 transition-all shadow-sm">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100">
                      {item.type === FurnitureType.CHAIR && '🪑'}
                      {item.type === FurnitureType.TABLE && '🏷️'}
                      {item.type === FurnitureType.SOFA && '🛋️'}
                      {item.type === FurnitureType.BED && '🛏️'}
                      {item.type === FurnitureType.DESK && '🖥️'}
                      {item.type === FurnitureType.OTHER && '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800 truncate">{item.name}</div>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                          {item.dimensions.width}w × {item.dimensions.depth}d cm
                        </span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md font-bold">
                          {item.rotation}°
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex-shrink-0"
                    >
                      {ICONS.Trash}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && !room && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in zoom-in-95">
             <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9h18"/><path d="M9 21V9"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
             </div>
             <div className="space-y-2">
               <h3 className="text-xl font-bold text-slate-800">No Room Found</h3>
               <p className="text-slate-500 max-w-xs mx-auto text-sm">Please scan a room floor plan before you can start arranging furniture.</p>
             </div>
             <button onClick={() => setScanType('room')} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
               Start Room Scan
             </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-10 py-6 flex justify-between items-center z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-1 transition-all duration-300 ${activeTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {ICONS.Home}
          <span className="text-[10px] font-extrabold tracking-widest">HOME</span>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setScanType(room ? 'furniture' : 'room')}
            className="bg-indigo-600 text-white w-16 h-16 rounded-[1.5rem] -mt-16 shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-white ring-8 ring-slate-50/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('planner')}
          className={`flex flex-col items-center space-y-1 transition-all duration-300 ${activeTab === 'planner' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {ICONS.Layout}
          <span className="text-[10px] font-extrabold tracking-widest">PLAN</span>
        </button>
      </nav>

      {scanType && (
        <Scanner 
          type={scanType} 
          onResult={handleScanResult} 
          onCancel={() => setScanType(null)} 
        />
      )}

      <Chatbot />
    </div>
  );
};

export default App;
