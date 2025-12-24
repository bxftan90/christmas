import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { FoliageLayer } from './FoliageLayer';
import { OrnamentLayer } from './OrnamentLayer';
import { SnowSystem } from './SnowSystem';
import { TreeTopper } from './TreeTopper';
import { PhotoLayer } from './PhotoLayer';
import { TwinkleLights } from './TwinkleLights';
import { TreeState } from '../types';
import * as THREE from 'three';

interface ExperienceProps {
  treeState: TreeState;
  photos: string[];
  selectedPhotoIndex: number;
  cameraOffset: { x: number, y: number };
}

export const Experience: React.FC<ExperienceProps> = ({ 
    treeState, 
    photos, 
    selectedPhotoIndex,
    cameraOffset
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating rotation for the whole container
      // If hand is controlling camera, disable auto spin or reduce it
      if (treeState === TreeState.TREE_SHAPE) {
         groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      }
    }

    // Camera Hand Control
    if (controlsRef.current && treeState === TreeState.SCATTERED) {
       // Smoothly interpolate current azimuth/polar to target
       // Note: OrbitControls uses spherical coordinates
       // We'll add the offset to the auto-rotate or manual position
       controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + cameraOffset.x * 0.05);
       controlsRef.current.setPolarAngle(Math.max(1, Math.min(2, controlsRef.current.getPolarAngle() + cameraOffset.y * 0.05)));
       controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={45} />
      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.5}
        minDistance={10}
        maxDistance={40}
        // Disable mouse interaction if in photo view to prevent confusion, optional
        enabled={treeState !== TreeState.PHOTO_VIEW} 
      />

      {/* Lighting: Moody and Cinematic */}
      <ambientLight intensity={0.2} color="#001a10" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        color="#ffebc2" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#0f5f3e" />
      
      {/* High Quality Reflections */}
      <Environment preset="city" />

      {/* Background Snow */}
      <SnowSystem />

      <group ref={groupRef}>
        <FoliageLayer treeState={treeState} />
        <OrnamentLayer treeState={treeState} />
        <TwinkleLights treeState={treeState} />
        <TreeTopper treeState={treeState} />
        <PhotoLayer 
            treeState={treeState} 
            photos={photos} 
            selectedIndex={selectedPhotoIndex} 
        />
        
        {/* Central Glowing Core (Subtle) */}
        <pointLight position={[0, 0, 0]} intensity={1.5} color="#FFD700" distance={15} decay={2} />
      </group>

      <EffectComposer disableNormalPass>
        {/* Luxury Glow */}
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.4} 
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};
