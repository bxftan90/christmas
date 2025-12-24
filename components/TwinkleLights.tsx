import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../constants';
import { TreeState } from '../types';
import { getTreePosition, getExplosionVelocity } from '../utils/geometry';

interface TwinkleLightsProps {
  treeState: TreeState;
}

const twinkleVertexShader = `
  attribute float offset;
  attribute float speed;
  varying float vAlpha;
  uniform float uTime;
  
  void main() {
    vec3 pos = position;
    
    // Blinking logic: Sine wave based on time, random speed, and random offset
    // Remap sine (-1 to 1) to (0.2 to 1.0)
    float blink = 0.6 + 0.4 * sin(uTime * speed + offset);
    vAlpha = blink;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const twinkleFragmentShader = `
  varying float vAlpha;
  uniform vec3 uColor;
  
  void main() {
    // Simple glowing circle/sphere look
    gl_FragColor = vec4(uColor, vAlpha);
  }
`;

export const TwinkleLights: React.FC<TwinkleLightsProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const system = useMemo(() => {
    const count = CONFIG.TREE.LIGHT_COUNT;
    const targets = new Float32Array(count * 3);
    const currents = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    // Attributes for shader
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const pos = getTreePosition();
      // Push slightly out so they sit on top of foliage
      pos.multiplyScalar(1.02);

      targets[i * 3] = pos.x;
      targets[i * 3 + 1] = pos.y;
      targets[i * 3 + 2] = pos.z;
      
      currents[i * 3] = pos.x;
      currents[i * 3 + 1] = pos.y;
      currents[i * 3 + 2] = pos.z;

      offsets[i] = Math.random() * 100;
      speeds[i] = 2.0 + Math.random() * 5.0; // Varied speed
    }

    return { count, targets, currents, velocities, offsets, speeds };
  }, []);

  useEffect(() => {
      if (treeState === TreeState.SCATTERED) {
          const { count, currents, velocities } = system;
          const temp = new THREE.Vector3();
          for(let i=0; i<count; i++) {
              temp.set(currents[i*3], currents[i*3+1], currents[i*3+2]);
              const vel = getExplosionVelocity(temp);
              velocities[i*3] = vel.x; velocities[i*3+1] = vel.y; velocities[i*3+2] = vel.z;
          }
      }
  }, [treeState, system]);

  const uniforms = useMemo(() => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#FFD700') } // Gold
  }), []);

  useFrame((state) => {
      if (!meshRef.current) return;
      
      const { count, currents, targets, velocities } = system;
      const dummy = new THREE.Object3D();

      for (let i = 0; i < count; i++) {
          const idx = i * 3;
          
          if (treeState === TreeState.SCATTERED) {
             currents[idx] += velocities[idx];
             currents[idx+1] += velocities[idx+1];
             currents[idx+2] += velocities[idx+2];
             
             velocities[idx] *= CONFIG.PHYSICS.DAMPING;
             
             if (Math.abs(velocities[idx]) < 0.05) {
                 const t = state.clock.elapsedTime;
                 currents[idx] += Math.sin(t + i) * 0.005;
             }
          } else {
             const lerp = CONFIG.PHYSICS.REASSEMBLY_SPEED;
             currents[idx] += (targets[idx] - currents[idx]) * lerp;
             currents[idx+1] += (targets[idx+1] - currents[idx+1]) * lerp;
             currents[idx+2] += (targets[idx+2] - currents[idx+2]) * lerp;
             velocities[idx] = 0; 
          }

          dummy.position.set(currents[idx], currents[idx+1], currents[idx+2]);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      
      // Update shader time
      if (meshRef.current.material instanceof THREE.ShaderMaterial) {
          meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
      }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, system.count]}>
       <sphereGeometry args={[0.08, 8, 8]}>
           <instancedBufferAttribute attach="attributes-offset" args={[system.offsets, 1]} />
           <instancedBufferAttribute attach="attributes-speed" args={[system.speeds, 1]} />
       </sphereGeometry>
       <shaderMaterial 
         vertexShader={twinkleVertexShader}
         fragmentShader={twinkleFragmentShader}
         uniforms={uniforms}
         transparent
       />
    </instancedMesh>
  );
};
