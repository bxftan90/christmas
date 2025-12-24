import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../constants';
import { TreeState } from '../types';
import { getExplosionVelocity } from '../utils/geometry';

interface PhotoLayerProps {
  treeState: TreeState;
  photos: string[]; 
  selectedIndex: number; 
}

const createPlaceholderTexture = (index: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if(ctx) {
      ctx.fillStyle = '#0f5f3e';
      ctx.fillRect(0,0,256,256);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 10;
      ctx.strokeRect(5,5,246,246);
      ctx.fillStyle = '#FFD700';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Upload', 128, 110);
      ctx.fillText('Photo', 128, 150);
  }
  return new THREE.CanvasTexture(canvas);
};

export const PhotoLayer: React.FC<PhotoLayerProps> = ({ treeState, photos, selectedIndex }) => {
  const groupRef = useRef<THREE.Group>(null);

  const physicsData = useMemo(() => {
    const count = CONFIG.TREE.PHOTO_COUNT;
    const items = [];
    
    const height = CONFIG.TREE.HEIGHT * 1.1; 
    const bottomRadius = CONFIG.TREE.RADIUS_BOTTOM * 1.05; 
    const topRadius = 0.5; 
    const spiralTurns = 4.5; 
    
    for(let i=0; i<count; i++) {
        const t = i / (count - 1); 
        
        const y = (height / 2) - (t * height); 
        
        const currentRadius = THREE.MathUtils.lerp(topRadius, bottomRadius, t);
        const angle = t * Math.PI * 2 * spiralTurns;
        
        const x = Math.cos(angle) * currentRadius;
        const z = Math.sin(angle) * currentRadius;

        const target = new THREE.Vector3(x, y, z);
        
        items.push({
            id: i,
            targetPosition: target,
            position: target.clone(),
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
            angularVelocity: new THREE.Vector3(),
            texture: createPlaceholderTexture(i),
            aspectRatio: 1.0 // Default square aspect ratio
        });
    }
    return items;
  }, []);

  // Update textures and calculate Aspect Ratio
  useEffect(() => {
      photos.forEach((url, i) => {
          if (i < physicsData.length) {
              const loader = new THREE.TextureLoader();
              loader.load(url, (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  // Calculate Aspect Ratio
                  if (tex.image && tex.image.width && tex.image.height) {
                      physicsData[i].aspectRatio = tex.image.width / tex.image.height;
                  }

                  const mesh = groupRef.current?.children[i] as THREE.Mesh;
                  if (mesh) {
                     (mesh.material as THREE.MeshStandardMaterial).map = tex;
                     (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
                  }
              });
          }
      });
  }, [photos, physicsData]);

  // Trigger Explosion
  useEffect(() => {
    if (treeState === TreeState.SCATTERED || treeState === TreeState.PHOTO_VIEW) {
      physicsData.forEach(item => {
        const vel = getExplosionVelocity(item.position);
        item.velocity.copy(vel).multiplyScalar(0.5); 
        item.angularVelocity.set(
            (Math.random()-0.5)*0.1,
            (Math.random()-0.5)*0.1,
            (Math.random()-0.5)*0.1
        );
      });
    }
  }, [treeState, physicsData]);

  useFrame((state) => {
      if (!groupRef.current) return;

      physicsData.forEach((item, i) => {
          const mesh = groupRef.current!.children[i];
          if(!mesh) return;

          // --- SCALE ANIMATION ---
          // Determine target scale based on state and aspect ratio
          const targetScale = new THREE.Vector3(1, 1, 1);
          
          if (treeState === TreeState.PHOTO_VIEW && i === selectedIndex) {
              // Zoomed View: Large scale, respect aspect ratio
              const viewHeight = 4.5; // Large height to fill center
              targetScale.set(viewHeight * item.aspectRatio, viewHeight, 1);
          } else {
              // Tree/Scatter View: Smaller scale, still respect aspect ratio slightly or keep compact?
              // Let's keep them consistent with image ratio but smaller
              const baseHeight = 0.9;
              targetScale.set(baseHeight * item.aspectRatio, baseHeight, 1);
          }
          
          // Smoothly interpolate scale
          mesh.scale.lerp(targetScale, 0.1);

          // --- POSITION & ROTATION ANIMATION ---

          if (treeState === TreeState.SCATTERED) {
              item.position.add(item.velocity);
              mesh.rotation.x += item.angularVelocity.x;
              mesh.rotation.y += item.angularVelocity.y;
              mesh.rotation.z += item.angularVelocity.z;
              item.velocity.multiplyScalar(CONFIG.PHYSICS.DAMPING);
              mesh.position.copy(item.position);

          } else if (treeState === TreeState.PHOTO_VIEW) {
             if (i === selectedIndex) {
                 // Selected photo moves to center camera front
                 const camPos = state.camera.position;
                 const camDir = new THREE.Vector3();
                 state.camera.getWorldDirection(camDir);
                 
                 // Position exactly in front of camera
                 const distance = 8; // Enough distance to fit the larger scale
                 const viewPos = camPos.clone().add(camDir.multiplyScalar(distance));
                 
                 mesh.position.lerp(viewPos, 0.1);
                 
                 // Face the camera perfectly flat (align quaternion)
                 mesh.quaternion.slerp(state.camera.quaternion, 0.1);

             } else {
                  // Others float in background
                  item.position.add(item.velocity);
                  mesh.rotation.x += item.angularVelocity.x;
                  mesh.rotation.y += item.angularVelocity.y;
                  mesh.position.copy(item.position);
             }
          } else {
              // Reassemble
              item.position.lerp(item.targetPosition, CONFIG.PHYSICS.REASSEMBLY_SPEED);
              mesh.position.copy(item.position);
              
              mesh.lookAt(0, item.position.y, 0);
              mesh.rotateY(Math.PI);
              mesh.rotateX(-0.15); 
              item.velocity.set(0,0,0);
          }
      });
  });

  return (
    <group ref={groupRef}>
        {physicsData.map((item, i) => (
            <mesh key={i} position={item.targetPosition} castShadow receiveShadow>
                {/* Unit Square Geometry - Scaling handled in useFrame */}
                <boxGeometry args={[1, 1, 0.05]} />
                <meshStandardMaterial 
                    map={item.texture} 
                    roughness={0.2} 
                    metalness={0.5}
                />
                {/* Gold Border - slight offset to be visible */}
                <mesh position={[0,0,-0.03]}>
                     <boxGeometry args={[1.05, 1.05, 0.02]} />
                     <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.1} />
                </mesh>
            </mesh>
        ))}
    </group>
  );
};
