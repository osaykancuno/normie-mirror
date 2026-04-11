// Normie Mirror — Trait-based animation engine

// Maps Expression trait to animation behavior
const EXPRESSION_ANIMS = {
  'Peaceful':  { type: 'breathe',  speed: 0.5, amplitude: 4 },
  'Serious':   { type: 'breathe',  speed: 0.3, amplitude: 2 },
  'Surprised': { type: 'bounce',   speed: 1.2, amplitude: 8 },
  'Happy':     { type: 'bounce',   speed: 0.8, amplitude: 6 },
  'Angry':     { type: 'shake',    speed: 1.5, amplitude: 3 },
  'Wink':      { type: 'bounce',   speed: 0.6, amplitude: 4 },
  'Smirk':     { type: 'breathe',  speed: 0.4, amplitude: 3 },
};

// Maps Type trait to glow
const TYPE_GLOW = {
  'Cat':   { glow: true, color: 'rgba(255, 153, 0, 0.4)' },
  'Alien': { glow: true, color: 'rgba(0, 255, 204, 0.4)' },
  'Agent': { glow: true, color: 'rgba(150, 0, 255, 0.4)' },
};

// Hologram flicker parameters
const FLICKER_CHANCE = 0.003; // per frame
const FLICKER_DURATION = 0.08; // seconds

/**
 * Create an animation function based on Normie traits.
 * Returns a function (time, defaults) => modifiers
 */
export function createAnimationFn(traits) {
  const expression = traits?.Expression || traits?.expression || 'Peaceful';
  const type = traits?.Type || traits?.type || 'Human';

  const anim = EXPRESSION_ANIMS[expression] || EXPRESSION_ANIMS['Peaceful'];
  const glowInfo = TYPE_GLOW[type] || null;

  let flickerEnd = 0;

  return function animate(time, defaults) {
    const mods = {
      x: defaults.x || 0,
      y: defaults.y || 0,
      rotation: defaults.rotation || 0,
      opacity: defaults.opacity || 1,
      scaleX: defaults.scaleX || 1,
      scaleY: defaults.scaleY || 1,
      glowColor: glowInfo ? glowInfo.color : null,
    };

    const t = time * anim.speed;

    // Movement animation
    switch (anim.type) {
      case 'breathe':
        mods.y += Math.sin(t * Math.PI * 2) * anim.amplitude;
        break;

      case 'bounce':
        const bounce = Math.abs(Math.sin(t * Math.PI * 2));
        mods.y -= bounce * anim.amplitude;
        mods.scaleY = 1 + Math.sin(t * Math.PI * 2) * 0.02;
        mods.scaleX = 1 - Math.sin(t * Math.PI * 2) * 0.01;
        break;

      case 'shake':
        mods.x += Math.sin(t * Math.PI * 8) * anim.amplitude;
        break;
    }

    // Hologram flicker
    if (time > flickerEnd && Math.random() < FLICKER_CHANCE) {
      flickerEnd = time + FLICKER_DURATION;
    }
    if (time < flickerEnd) {
      mods.opacity = 0.7 + Math.random() * 0.2;
    }

    return mods;
  };
}

/**
 * Get a description of the animation for UI display.
 */
export function getAnimationInfo(traits) {
  const expression = traits?.Expression || traits?.expression || 'Peaceful';
  const type = traits?.Type || traits?.type || 'Human';
  const anim = EXPRESSION_ANIMS[expression] || EXPRESSION_ANIMS['Peaceful'];
  const glow = TYPE_GLOW[type];

  return {
    movement: anim.type,
    hasGlow: !!glow,
    glowColor: glow?.color || null,
    expression,
    type,
  };
}
