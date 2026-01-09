
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/gemini';

interface ScannerProps {
  type: 'room' | 'furniture';
  onResult: (data: any, imageUrl: string) => void;
  onCancel: () => void;
}

const resizeImage = (file: File, maxWidth: number = 1024): Promise<{ base64: string, dataUrl: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, dataUrl });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const Scanner: React.FC<ScannerProps> = ({ type, onResult, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statuses = [
    "Uploading image...",
    "Gemini is analyzing depth...",
    "Identifying boundaries...",
    "Calculating dimensions...",
    "Finishing up..."
  ];

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statuses.length);
      }, 2000);
    } else {
      setStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      const { base64, dataUrl } = await resizeImage(file);
      
      let result;
      if (type === 'room') {
        result = await geminiService.scanRoom(base64);
      } else {
        result = await geminiService.scanFurniture(base64);
      }
      onResult(result, dataUrl);
    } catch (err: any) {
      setError("AI could not analyze this image. Please try another angle or check your connection.");
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center space-y-8">
        <h2 className="text-3xl font-bold">
          {type === 'room' ? 'Scan Your Room' : 'Scan Furniture'}
        </h2>
        <p className="text-slate-400">
          Upload or capture a photo. Gemini AI will analyze the dimensions and boundaries.
        </p>

        <div className="aspect-square w-full border-4 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center space-y-4 relative overflow-hidden bg-slate-800">
          {isScanning ? (
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg transition-all duration-500">
                  {statuses[statusIndex]}
                </p>
                <p className="text-slate-500 text-xs">This usually takes 3-5 seconds</p>
              </div>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
              </svg>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95"
              >
                Upload Photo
              </button>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 p-4 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={onCancel}
          disabled={isScanning}
          className="text-slate-400 hover:text-white underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Scanner;
