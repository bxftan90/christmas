import { Vector3, Color } from 'three';

export enum TreeState {
  TREE_SHAPE = 'TREE_SHAPE',
  SCATTERED = 'SCATTERED',
  PHOTO_VIEW = 'PHOTO_VIEW',
}

export interface ParticleData {
  // Static Target (Tree shape)
  targetPosition: Vector3;
  // Current Physics State
  position: Vector3;
  velocity: Vector3;
  angularVelocity?: Vector3; // For meshes mainly
  rotation?: Vector3; // For meshes mainly
  // Visuals
  color: Color;
  size: number;
  // Animation Phase
  phaseOffset: number;
}

export enum OrnamentType {
  BAUBLE = 'BAUBLE',
  GIFT = 'GIFT',
  CANDY = 'CANDY',
}
