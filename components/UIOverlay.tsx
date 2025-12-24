import React, { useRef } from 'react';
import { TreeState } from '../types';

interface UIOverlayProps {
  currentState: TreeState;
  onToggle: () => void;
  onUpload: (files: FileList) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ currentState, onToggle, onUpload }) => {
  const isScattered = currentState === TreeState.SCATTERED;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files) {
          onUpload(e.target.files);
      }
  };

  return (
    <>
      {/* Top Center Title */}
      <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none z-10">
        <h1 className="text-5xl md:text-6xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#F7E7CE] to-[#FFD700] tracking-widest uppercase text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          Merry Christmas
        </h1>
      </div>

      {/* Controls - Bottom Right, Scaled Down */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end pointer-events-none z-10 origin-bottom-right transform scale-75">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
          
          <div className="text-center">
            <h2 className="text-xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#F7E7CE] to-[#FFD700] tracking-widest uppercase">
              Arix Signature
            </h2>
            <p className="text-emerald-200/70 text-[0.6rem] tracking-[0.2em] font-light uppercase mb-2">
              Gesture Controlled Cloud
            </p>
          </div>
          
          <div className="flex flex-col gap-4 items-center">
              {/* Gesture Legend */}
              <div className="text-[10px] text-emerald-100/50 flex flex-wrap gap-x-4 gap-y-1 justify-center border-b border-white/10 pb-2 mb-2 w-full">
                  <span>✊ Fist: Assemble</span>
                  <span>✋ Open: Scatter</span>
                  <span>👌 Pinch: Zoom Photo</span>
                  <span>👋 Move: Rotate</span>
              </div>

              <div className="flex flex-col gap-2 w-full">
                  <button
                  onClick={onToggle}
                  className={`
                      pointer-events-auto
                      relative overflow-hidden group px-8 py-2 rounded-full 
                      transition-all duration-500 ease-out
                      border w-full
                      ${isScattered 
                      ? 'bg-transparent border-[#FFD700] text-[#FFD700]' 
                      : 'bg-[#FFD700] border-[#FFD700] text-[#022b1c]'}
                      hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]
                  `}
                  >
                  <span className="relative z-10 font-bold tracking-widest text-xs uppercase">
                      {isScattered ? 'Reassemble' : 'Explode'}
                  </span>
                  </button>

                  <button
                      onClick={() => fileInputRef.current?.click()}
                      className="pointer-events-auto bg-white/10 hover:bg-white/20 text-emerald-200 text-xs py-2 rounded-full border border-white/10 transition-colors uppercase tracking-widest w-full"
                  >
                      Upload Photos
                  </button>
                  <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                  />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};
