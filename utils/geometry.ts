import { Vector3 } from 'three';
import { CONFIG } from '../constants';

/**
 * Generates a random point inside a cone volume (The Tree).
 */
export const getTreePosition = (): Vector3 => {
  const { HEIGHT, RADIUS_BOTTOM } = CONFIG.TREE;
  
  const y = Math.random() * HEIGHT; // 0 to height
  const radiusAtY = RADIUS_BOTTOM * (1 - y / HEIGHT); // Linear taper
  
  const theta = Math.random() * Math.PI * 2;
  // Sqrt for uniform distribution in a circle slice
  const r = Math.sqrt(Math.random()) * radiusAtY; 

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);

  // Center the tree vertically around 0
  return new Vector3(x, y - HEIGHT / 2, z);
};

/**
 * Generates an initial velocity vector for explosion based on position relative to center.
 */
export const getExplosionVelocity = (position: Vector3): Vector3 => {
  const direction = position.clone().normalize();
  // Add some randomness to direction
  direction.x += (Math.random() - 0.5) * 0.5;
  direction.y += (Math.random() - 0.5) * 0.5;
  direction.z += (Math.random() - 0.5) * 0.5;
  
  return direction.normalize().multiplyScalar(CONFIG.PHYSICS.EXPLOSION_FORCE * (0.5 + Math.random()));
};
