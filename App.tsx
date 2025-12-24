import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { TreeState } from './types';
import { CONFIG } from './constants';

const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#022b1c] text-[#FFD700]">
    <div className="animate-pulse tracking-widest uppercase text-sm">Loading Experience...</div>
  </div>
);

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  const handleUpload = (files: FileList) => {
      const newPhotos: string[] = [];
      Array.from(files).forEach(file => {
          const url = URL.createObjectURL(file);
          newPhotos.push(url);
      });
      // Append new photos
      setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleGestureStateChange = useCallback((newState: TreeState) => {
     setTreeState(newState);
  }, []);

  const handleCameraMove = useCallback((x: number, y: number) => {
      setCameraOffset({ x, y });
  }, []);

  const handlePhotoGrab = useCallback((isGrabbing: boolean) => {
      if (isGrabbing) {
          // If grabbing, pick a random photo to zoom (or cycle them)
          // In a real app, this would raycast to find the closest one
          setSelectedPhotoIndex(prev => (prev + 1) % Math.max(1, photos.length || CONFIG.TREE.PHOTO_COUNT));
      }
  }, [photos.length]);

  return (
    <div className="relative w-full h-screen bg-[#01140d] overflow-hidden">
      
      <GestureController 
        onStateChange={handleGestureStateChange}
        onCameraMove={handleCameraMove}
        onPhotoGrab={handlePhotoGrab}
      />

      <Suspense fallback={<Loader />}>
        <Canvas 
          shadows 
          dpr={[1, 2]} 
          gl={{ antialias: false, toneMappingExposure: 1.2 }}
        >
          <Experience 
            treeState={treeState} 
            photos={photos} 
            selectedPhotoIndex={selectedPhotoIndex}
            cameraOffset={cameraOffset}
          />
        </Canvas>
      </Suspense>
      
      <UIOverlay 
        currentState={treeState} 
        onToggle={toggleState} 
        onUpload={handleUpload}
      />
    </div>
  );
};

export default App;
