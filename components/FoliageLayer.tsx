import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../constants';
import { TreeState } from '../types';
import { getTreePosition, getExplosionVelocity } from '../utils/geometry';

// Custom Shader for "Leafy" Particles
// Uses a diamond/star shape instead of a soft circle for a sharper "needle" look
const foliageVertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uTime;
  
  void main() {
    vColor = color;
    vec3 pos = position;
    
    // Slight wind/breathing
    pos.x += sin(uTime + pos.y) * 0.02;
    pos.z += cos(uTime + pos.y) * 0.02;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (400.0 / -mvPosition.z); // Increased scale
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  
  void main() {
    // Diamond shape logic
    vec2 coord = gl_PointCoord.xy - vec2(0.5);
    
    // Rotate 45 degrees for diamond effect if desired, or just use Manhattan distance
    // Manhattan distance: |x| + |y|
    float dist = abs(coord.x) + abs(coord.y);
    
    if(dist > 0.5) discard;

    // Harder edge for distinct "leaf" look
    float alpha = smoothstep(0.5, 0.4, dist);
    
    // Gradient from center (bright) to edge (darker)
    vec3 finalColor = mix(vColor * 0.8, vColor * 1.5, 1.0 - dist * 2.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface FoliageLayerProps {
  treeState: TreeState;
}

export const FoliageLayer: React.FC<FoliageLayerProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  // Physics State Storage
  const particleSystem = useMemo(() => {
    const count = CONFIG.TREE.PARTICLE_COUNT;
    const targets = new Float32Array(count * 3);
    const currents = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3); // xyz
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // 1. Target Positions (Tree Shape)
      const targetPos = getTreePosition();
      targets[i * 3] = targetPos.x;
      targets[i * 3 + 1] = targetPos.y;
      targets[i * 3 + 2] = targetPos.z;

      // 2. Initial Current Positions
      currents[i * 3] = targetPos.x;
      currents[i * 3 + 1] = targetPos.y;
      currents[i * 3 + 2] = targetPos.z;

      // 3. Visuals - More Vibrant
      const r = Math.random();
      if (r > 0.95) color.copy(COLORS.GOLD_METALLIC); // Rare gold sparkle
      else if (r > 0.7) color.copy(COLORS.EMERALD_VIBRANT); // New lighter green
      else if (r > 0.4) color.copy(COLORS.EMERALD_LIGHT);
      else color.copy(COLORS.EMERALD_DEEP);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 0.4 + 0.2; // Larger particles
    }

    return {
      count,
      targets,
      currents,
      velocities,
      colors,
      sizes
    };
  }, []);

  // Effect: Trigger Explosion
  useEffect(() => {
    if (treeState === TreeState.SCATTERED) {
      const { velocities, currents, count } = particleSystem;
      const tempPos = new THREE.Vector3();
      
      for (let i = 0; i < count; i++) {
        tempPos.set(currents[i * 3], currents[i * 3 + 1], currents[i * 3 + 2]);
        const vel = getExplosionVelocity(tempPos);
        // Foliage explodes faster/further
        vel.multiplyScalar(1.2);
        velocities[i * 3] = vel.x;
        velocities[i * 3 + 1] = vel.y;
        velocities[i * 3 + 2] = vel.z;
      }
    }
  }, [treeState, particleSystem]);

  // Frame Loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const { currents, targets, velocities, count } = particleSystem;
    const positionsAttr = meshRef.current.geometry.attributes.position;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      if (treeState === TreeState.SCATTERED) {
        currents[idx] += velocities[idx];
        currents[idx + 1] += velocities[idx + 1];
        currents[idx + 2] += velocities[idx + 2];

        velocities[idx] *= CONFIG.PHYSICS.DAMPING;
        velocities[idx + 1] *= CONFIG.PHYSICS.DAMPING;
        velocities[idx + 2] *= CONFIG.PHYSICS.DAMPING;

        const time = state.clock.elapsedTime;
        if (Math.abs(velocities[idx]) < 0.01) {
            currents[idx] += Math.sin(time + idx) * CONFIG.PHYSICS.FLOAT_SPEED;
            currents[idx + 1] += Math.cos(time * 0.5 + idx) * CONFIG.PHYSICS.FLOAT_SPEED;
        }

      } else {
        const lerpFactor = CONFIG.PHYSICS.REASSEMBLY_SPEED;
        currents[idx] += (targets[idx] - currents[idx]) * lerpFactor;
        currents[idx + 1] += (targets[idx + 1] - currents[idx + 1]) * lerpFactor;
        currents[idx + 2] += (targets[idx + 2] - currents[idx + 2]) * lerpFactor;
        
        velocities[idx] = 0;
        velocities[idx + 1] = 0;
        velocities[idx + 2] = 0;
      }
    }

    positionsAttr.needsUpdate = true;
    
    if (meshRef.current.material instanceof THREE.ShaderMaterial) {
       meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleSystem.count}
          array={particleSystem.currents}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleSystem.count}
          array={particleSystem.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleSystem.count}
          array={particleSystem.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending} // Changed from Additive to Normal for better visibility
      />
    </points>
  );
};
