import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../constants';
import { TreeState } from '../types';
import { getExplosionVelocity } from '../utils/geometry';

interface TreeTopperProps {
  treeState: TreeState;
}

export const TreeTopper: React.FC<TreeTopperProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Static Target (Top of tree)
  const targetPos = new THREE.Vector3(0, CONFIG.TREE.HEIGHT / 2 + 0.5, 0);
  
  // Physics State
  const [velocity] = useState(new THREE.Vector3());
  const [angularVelocity] = useState(new THREE.Vector3());
  
  // Create Star Geometry
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Trigger Explosion
  useEffect(() => {
    if ((treeState === TreeState.SCATTERED || treeState === TreeState.PHOTO_VIEW) && meshRef.current) {
      // Explode upwards and outwards
      const vel = getExplosionVelocity(targetPos);
      vel.y += 0.5; // Bias up
      velocity.copy(vel);

      angularVelocity.set(
        Math.random() - 0.5, 
        Math.random() - 0.5, 
        Math.random() - 0.5
      ).multiplyScalar(0.2);
    }
  }, [treeState, velocity, angularVelocity, targetPos]);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (treeState === TreeState.SCATTERED || treeState === TreeState.PHOTO_VIEW) {
      meshRef.current.position.add(velocity);
      meshRef.current.rotation.x += angularVelocity.x;
      meshRef.current.rotation.y += angularVelocity.y;
      meshRef.current.rotation.z += angularVelocity.z;

      velocity.multiplyScalar(CONFIG.PHYSICS.DAMPING);
      
      // Gentle float
      if (velocity.length() < 0.05) {
         meshRef.current.position.y += Math.sin(state.clock.elapsedTime) * 0.005;
      }
    } else {
      // Reassemble
      meshRef.current.position.lerp(targetPos, CONFIG.PHYSICS.REASSEMBLY_SPEED);
      // Reset rotation slowly to upright
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.05);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.05);
      // Spin nicely on Y
      meshRef.current.rotation.y += 0.02;
      
      velocity.set(0,0,0);
    }
  });

  return (
    <group ref={meshRef} position={targetPos}>
      <mesh geometry={starGeometry}>
        <meshStandardMaterial 
          color="#FFD700" 
          emissive="#FFD700" 
          emissiveIntensity={1}
          roughness={0.1}
          metalness={1}
        />
      </mesh>
      {/* Light coming from the star */}
      <pointLight color="#FFD700" intensity={2} distance={10} decay={2} />
    </group>
  );
};
