import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../constants';
import { TreeState } from '../types';
import { getTreePosition, getExplosionVelocity } from '../utils/geometry';

interface OrnamentLayerProps {
  treeState: TreeState;
}

// --- TEXTURES & GEOMETRIES ---

const createGiftTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = `#${COLORS.ACCENT_RED.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = `#${COLORS.RIBBON_GREEN.getHexString()}`;
  const ribbonWidth = 60;
  ctx.fillRect(128 - ribbonWidth / 2, 0, ribbonWidth, 256);
  ctx.fillRect(0, 128 - ribbonWidth / 2, 256, ribbonWidth);

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(128 - 15, 128 - 15, 30, 30);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// Candy Cane: Wider Red Stripes, Spiraling
const createCandyTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0,0,128,128);
  
  ctx.fillStyle = '#FF0000';
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(60, 0); 
  ctx.lineTo(128, 68); 
  ctx.lineTo(128, 128);
  ctx.lineTo(68, 128);
  ctx.lineTo(0, 60);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(68 + 60, 0); 
  ctx.lineTo(128, 0);
  ctx.lineTo(128, 60); 
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8); 
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.rotation = Math.PI / 4; 
  texture.center.set(0.5, 0.5);
  return texture;
}

const createCandyCaneGeometry = () => {
    const lineStart = new THREE.Vector3(0, -1, 0);
    const lineEnd = new THREE.Vector3(0, 1, 0);
    const curve = new THREE.CubicBezierCurve3(
        lineEnd,
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Vector3(0.8, 1.8, 0),
        new THREE.Vector3(0.8, 1.2, 0)
    );
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(lineStart, lineEnd));
    path.add(curve);
    return new THREE.TubeGeometry(path, 24, 0.12, 8, false);
};

// Stocking Shape (Extruded)
const createStockingGeometry = () => {
    const shape = new THREE.Shape();
    // Simplified stocking silhouette
    shape.moveTo(0, 0); // Top Left of opening (approx)
    shape.lineTo(0.5, 0);   // Top width
    shape.lineTo(0.5, -1.0); // Ankle
    shape.quadraticCurveTo(0.5, -1.5, 0.8, -1.5); // Heel/Foot top
    shape.lineTo(0.8, -1.8); // Toe tip
    shape.quadraticCurveTo(0, -1.8, -0.2, -1.5); // Sole to Heel back
    shape.lineTo(-0.2, -1.2); 
    shape.lineTo(0, 0); // Back up
    
    // Increased Bevel for a "Plush" look
    const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

// Reindeer Silhouette (Extruded)
const createReindeerGeometry = () => {
    const shape = new THREE.Shape();
    // Simplified reindeer
    shape.moveTo(0,0);
    shape.lineTo(0.2, 0); // Body top
    shape.lineTo(0.2, 0.3); // Neck
    shape.lineTo(0.4, 0.4); // Head
    shape.lineTo(0.4, 0.6); // Antler start
    shape.lineTo(0.2, 0.6); // Antler back
    shape.lineTo(0.1, 0.4); // Head back
    shape.lineTo(0, 0.3); // Neck back
    shape.lineTo(-0.3, 0.3); // Body back
    shape.lineTo(-0.3, 0); // Body bottom
    shape.lineTo(-0.2, -0.4); // Back leg
    shape.lineTo(-0.1, -0.4); 
    shape.lineTo(-0.1, 0);
    shape.lineTo(0.1, 0);
    shape.lineTo(0.1, -0.4); // Front leg
    shape.lineTo(0.2, -0.4);
    shape.lineTo(0.2, 0);
    
    const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

export const OrnamentLayer: React.FC<OrnamentLayerProps> = ({ treeState }) => {
  const baubleRef = useRef<THREE.InstancedMesh>(null);
  const giftRef = useRef<THREE.InstancedMesh>(null);
  const candyRef = useRef<THREE.InstancedMesh>(null);
  const stockingRef = useRef<THREE.InstancedMesh>(null);
  const reindeerRef = useRef<THREE.InstancedMesh>(null);

  const giftTexture = useMemo(() => createGiftTexture(), []);
  const candyTexture = useMemo(() => createCandyTexture(), []);
  const candyGeometry = useMemo(() => createCandyCaneGeometry(), []);
  const stockingGeometry = useMemo(() => createStockingGeometry(), []);
  const reindeerGeometry = useMemo(() => createReindeerGeometry(), []);

  // Custom Stocking Material with White Cuff logic
  const stockingMaterial = useMemo(() => {
      const mat = new THREE.MeshStandardMaterial({
          color: COLORS.RED_STOCKING,
          roughness: 0.9,
          metalness: 0.1,
      });
      
      mat.onBeforeCompile = (shader) => {
          // Pass local position y to fragment
          shader.vertexShader = `
            varying float vPosY;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vPosY = position.y; // Local Y position before transform
            `
          );

          // Change color based on Y height
          shader.fragmentShader = `
            varying float vPosY;
            ${shader.fragmentShader}
          `.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            // The top of the stocking is at Y=0, going down to -1.8
            // Let's make the top 0.45 units white for the cuff
            if (vPosY > -0.45) {
                diffuseColor.rgb = vec3(0.95, 0.95, 0.95); 
            }
            `
          );
      };
      return mat;
  }, []);

  // --- PHYSICS & DISTRIBUTION ---
  const simulationData = useMemo(() => {
    // Total calculation
    const stockingCount = 3;
    const reindeerCount = 4;
    const miscCount = CONFIG.TREE.ORNAMENT_COUNT - stockingCount - reindeerCount;
    
    // Splits for Misc items
    const split1 = Math.floor(miscCount * 0.4); // Baubles
    const split2 = Math.floor(miscCount * 0.7); // Gifts
    // Remaining misc is Candy
    
    // Indices offsets
    const stockingStart = miscCount;
    const reindeerStart = miscCount + stockingCount;
    const total = CONFIG.TREE.ORNAMENT_COUNT;

    const targets = new Float32Array(total * 3);
    const currents = new Float32Array(total * 3);
    const velocities = new Float32Array(total * 3);
    const rotations = new Float32Array(total * 4); 
    const angularVelocities = new Float32Array(total * 3); 
    const scales = new Float32Array(total);
    const colors = new Float32Array(total * 3);

    const dummyObj = new THREE.Object3D();
    const tempColor = new THREE.Color();

    for (let i = 0; i < total; i++) {
      // Position
      const pos = getTreePosition();
      targets[i * 3] = pos.x;
      targets[i * 3 + 1] = pos.y;
      targets[i * 3 + 2] = pos.z;
      currents[i * 3] = pos.x;
      currents[i * 3 + 1] = pos.y;
      currents[i * 3 + 2] = pos.z;

      // Rotation
      dummyObj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      dummyObj.updateMatrix();
      rotations[i*4] = dummyObj.quaternion.x;
      rotations[i*4+1] = dummyObj.quaternion.y;
      rotations[i*4+2] = dummyObj.quaternion.z;
      rotations[i*4+3] = dummyObj.quaternion.w;

      // --- LOGIC PER TYPE ---
      if (i < miscCount) {
        if (i < split1) {
            // Bauble
            if (Math.random() > 0.5) tempColor.copy(COLORS.GOLD_METALLIC);
            else tempColor.copy(COLORS.GOLD_CHAMPAGNE);
            scales[i] = 0.25 + Math.random() * 0.2;
        } else if (i < split2) {
            // Gift
            tempColor.setHex(0xffffff);
            scales[i] = 0.5 + Math.random() * 0.3;
        } else {
            // Candy Cane 
            tempColor.setHex(0xffffff);
            scales[i] = 0.3 + Math.random() * 0.2;
        }
      } else if (i < reindeerStart) {
          // Stocking - Red body handled by ShaderMaterial now
          tempColor.setHex(0xffffff); // Base white for shader modulation (though color uniform overrides usually)
          scales[i] = 0.6; 
          dummyObj.rotation.set(0, Math.random()*Math.PI*2, 0); 
          dummyObj.updateMatrix();
          rotations[i*4] = dummyObj.quaternion.x;
          rotations[i*4+1] = dummyObj.quaternion.y;
          rotations[i*4+2] = dummyObj.quaternion.z;
          rotations[i*4+3] = dummyObj.quaternion.w;
      } else {
          // Reindeer
          tempColor.copy(COLORS.BROWN_REINDEER);
          scales[i] = 0.7;
          dummyObj.rotation.set(0, Math.random()*Math.PI*2, 0); 
          dummyObj.updateMatrix();
          rotations[i*4] = dummyObj.quaternion.x;
          rotations[i*4+1] = dummyObj.quaternion.y;
          rotations[i*4+2] = dummyObj.quaternion.z;
          rotations[i*4+3] = dummyObj.quaternion.w;
      }

      colors[i*3] = tempColor.r;
      colors[i*3+1] = tempColor.g;
      colors[i*3+2] = tempColor.b;
    }

    return { 
        total, miscCount, split1, split2, stockingStart, reindeerStart,
        targets, currents, velocities, rotations, angularVelocities, scales, colors 
    };
  }, []);

  // --- PHYSICS LOOP ---
  useFrame((state) => {
    if (!baubleRef.current || !giftRef.current || !candyRef.current || !stockingRef.current || !reindeerRef.current) return;

    const { total, miscCount, split1, split2, stockingStart, reindeerStart, 
            currents, targets, velocities, rotations, angularVelocities, scales } = simulationData;
    
    const dummy = new THREE.Object3D();
    const q = new THREE.Quaternion();
    const tempQ = new THREE.Quaternion();

    for (let i = 0; i < total; i++) {
      const idx = i * 3;
      const rotIdx = i * 4;

      if (treeState === TreeState.SCATTERED || treeState === TreeState.PHOTO_VIEW) {
         currents[idx] += velocities[idx];
         currents[idx + 1] += velocities[idx + 1];
         currents[idx + 2] += velocities[idx + 2];
         velocities[idx] *= CONFIG.PHYSICS.DAMPING;
         
         q.set(rotations[rotIdx], rotations[rotIdx+1], rotations[rotIdx+2], rotations[rotIdx+3]);
         tempQ.setFromEuler(new THREE.Euler(angularVelocities[idx], angularVelocities[idx+1], angularVelocities[idx+2]));
         q.multiply(tempQ);
         q.normalize();
         rotations[rotIdx] = q.x; rotations[rotIdx+1] = q.y; rotations[rotIdx+2] = q.z; rotations[rotIdx+3] = q.w;
      } else {
         const lerp = CONFIG.PHYSICS.REASSEMBLY_SPEED * 0.8;
         currents[idx] += (targets[idx] - currents[idx]) * lerp;
         currents[idx+1] += (targets[idx+1] - currents[idx+1]) * lerp;
         currents[idx+2] += (targets[idx+2] - currents[idx+2]) * lerp;
         
         if (i >= miscCount) {
             const currentQ = new THREE.Quaternion(rotations[rotIdx], rotations[rotIdx+1], rotations[rotIdx+2], rotations[rotIdx+3]);
             const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.atan2(currents[idx], currents[idx+2]));
             currentQ.slerp(targetQ, 0.05);
             rotations[rotIdx] = currentQ.x; rotations[rotIdx+1] = currentQ.y; rotations[rotIdx+2] = currentQ.z; rotations[rotIdx+3] = currentQ.w;
         }
      }

      dummy.position.set(currents[idx], currents[idx+1], currents[idx+2]);
      dummy.quaternion.set(rotations[rotIdx], rotations[rotIdx+1], rotations[rotIdx+2], rotations[rotIdx+3]);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();

      if (i < miscCount) {
        if (i < split1) baubleRef.current.setMatrixAt(i, dummy.matrix);
        else if (i < split2) giftRef.current.setMatrixAt(i - split1, dummy.matrix);
        else candyRef.current.setMatrixAt(i - split2, dummy.matrix);
      } else if (i < reindeerStart) {
          stockingRef.current.setMatrixAt(i - stockingStart, dummy.matrix);
      } else {
          reindeerRef.current.setMatrixAt(i - reindeerStart, dummy.matrix);
      }
    }

    baubleRef.current.instanceMatrix.needsUpdate = true;
    giftRef.current.instanceMatrix.needsUpdate = true;
    candyRef.current.instanceMatrix.needsUpdate = true;
    stockingRef.current.instanceMatrix.needsUpdate = true;
    reindeerRef.current.instanceMatrix.needsUpdate = true;
  });

  // Init Trigger for Explosion Velocity
  useEffect(() => {
    if (treeState === TreeState.SCATTERED || treeState === TreeState.PHOTO_VIEW) {
         const { total, currents, velocities, angularVelocities } = simulationData;
         const tempPos = new THREE.Vector3();
         for(let i=0; i<total; i++) {
             tempPos.set(currents[i*3], currents[i*3+1], currents[i*3+2]);
             const vel = getExplosionVelocity(tempPos);
             velocities[i*3] = vel.x; velocities[i*3+1] = vel.y; velocities[i*3+2] = vel.z;
             angularVelocities[i*3] = (Math.random()-0.5)*0.2;
             angularVelocities[i*3+1] = (Math.random()-0.5)*0.2;
             angularVelocities[i*3+2] = (Math.random()-0.5)*0.2;
         }
    }
  }, [treeState, simulationData]);

  // Init Colors
  useEffect(() => {
    if (!baubleRef.current) return;
    const { total, miscCount, split1, split2, stockingStart, reindeerStart, colors } = simulationData;
    const c = new THREE.Color();
    for(let i=0; i<total; i++) {
        c.setRGB(colors[i*3], colors[i*3+1], colors[i*3+2]);
        if (i < miscCount) {
            if (i < split1) baubleRef.current.setColorAt(i, c);
            else if (i < split2) giftRef.current.setColorAt(i - split1, c);
            else candyRef.current.setColorAt(i - split2, c);
        } else if (i < reindeerStart) {
            // Stocking color handled by material prop + shader, but set instance color anyway for safety
            stockingRef.current.setColorAt(i - stockingStart, c);
        } else {
            reindeerRef.current.setColorAt(i - reindeerStart, c);
        }
    }
    baubleRef.current.instanceColor!.needsUpdate = true;
    giftRef.current.instanceColor!.needsUpdate = true;
    candyRef.current.instanceColor!.needsUpdate = true;
    stockingRef.current.instanceColor!.needsUpdate = true;
    reindeerRef.current.instanceColor!.needsUpdate = true;
  }, [simulationData]);

  return (
    <>
      <instancedMesh ref={baubleRef} args={[undefined, undefined, simulationData.split1]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial roughness={0.1} metalness={1.0} envMapIntensity={1.5} />
      </instancedMesh>

      <instancedMesh ref={giftRef} args={[undefined, undefined, simulationData.split2 - simulationData.split1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={giftTexture} roughness={0.4} metalness={0.3} envMapIntensity={1} />
      </instancedMesh>

      <instancedMesh ref={candyRef} args={[undefined, undefined, simulationData.miscCount - simulationData.split2]}>
        <primitive object={candyGeometry} attach="geometry" />
        <meshStandardMaterial map={candyTexture} roughness={0.2} metalness={0.1} envMapIntensity={0.8} />
      </instancedMesh>

      {/* Stockings (3) - Using Custom Material for White Cuff */}
      <instancedMesh ref={stockingRef} args={[undefined, undefined, 3]} material={stockingMaterial}>
        <primitive object={stockingGeometry} attach="geometry" />
      </instancedMesh>

      {/* Reindeer (4) */}
      <instancedMesh ref={reindeerRef} args={[undefined, undefined, 4]}>
        <primitive object={reindeerGeometry} attach="geometry" />
        <meshStandardMaterial color={COLORS.BROWN_REINDEER} roughness={0.9} metalness={0} />
      </instancedMesh>
    </>
  );
};
