import { Color } from 'three';

export const COLORS = {
  EMERALD_DEEP: new Color('#022b1c'),
  EMERALD_LIGHT: new Color('#106b46'), // Slightly brighter for visibility
  EMERALD_VIBRANT: new Color('#2ecc71'), // New vibrant highlight
  GOLD_METALLIC: new Color('#FFD700'),
  GOLD_CHAMPAGNE: new Color('#F7E7CE'),
  ACCENT_RED: new Color('#8a1c1c'),
  RIBBON_GREEN: new Color('#0f5f3e'),
  CANDY_WHITE: new Color('#ffffff'),
  BROWN_REINDEER: new Color('#8B4513'),
  RED_STOCKING: new Color('#D32F2F'),
};

export const CONFIG = {
  TREE: {
    HEIGHT: 12,
    RADIUS_BOTTOM: 4.5,
    PARTICLE_COUNT: 7500, // Increased density
    // Baubles/Gifts/Candy + 3 Stockings + 4 Reindeer
    ORNAMENT_COUNT: 110, 
    PHOTO_COUNT: 36, // Increased to make the spiral denser
    LIGHT_COUNT: 300, // New Twinkle Lights
  },
  PHYSICS: {
    EXPLOSION_FORCE: 0.8,
    DAMPING: 0.96, // Air resistance
    REASSEMBLY_SPEED: 0.08, // Lerp factor
    FLOAT_SPEED: 0.005, // Slight movement when scattered
  },
};
