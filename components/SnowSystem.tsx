import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SNOW_COUNT = 1000;

export const SnowSystem: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(SNOW_COUNT * 3);
    const speeds = new Float32Array(SNOW_COUNT);
    const offsets = new Float32Array(SNOW_COUNT); // For swaying

    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50; // Wide spread X
      positions[i * 3 + 1] = Math.random() * 40 - 10; // Y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z
      
      speeds[i] = 0.02 + Math.random() * 0.05;
      offsets[i] = Math.random() * 100;
    }
    return { positions, speeds, offsets };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const { speeds, offsets } = particles;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < SNOW_COUNT; i++) {
      // Move down
      positions[i * 3 + 1] -= speeds[i];

      // Sway x and z
      positions[i * 3] += Math.sin(time + offsets[i]) * 0.01;
      positions[i * 3 + 2] += Math.cos(time + offsets[i] * 0.5) * 0.01;

      // Reset if below floor
      if (positions[i * 3 + 1] < -10) {
        positions[i * 3 + 1] = 30;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SNOW_COUNT}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="white"
        size={0.1}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};
