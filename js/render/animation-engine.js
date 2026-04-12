// Normie Mirror — Trait-based animation engine (enhanced)

const EXPRESSION_ANIMS = {
  'Peaceful':  { type: 'breathe',  speed: 0.6, amplitude: 6 },
  'Serious':   { type: 'breathe',  speed: 0.35, amplitude: 3 },
  'Surprised': { type: 'bounce',   speed: 1.5, amplitude: 12 },
  'Happy':     { type: 'bounce',   speed: 1.0, amplitude: 10 },
  'Angry':     { type: 'shake',    speed: 2.0, amplitude: 5 },
  'Wink':      { type: 'bounce',   speed: 0.7, amplitude: 6 },
  'Smirk':     { type: 'breathe',  speed: 0.5, amplitude: 4 },
};

const TYPE_GLOW = {
  'Cat':   { glow: true, color: 'rgba(255, 180, 50, 0.5)' },
  'Alien': { glow: true, color: 'rgba(0, 255, 200, 0.5)' },
  'Agent': { glow: true, color: 'rgba(180, 80, 255, 0.5)' },
};

const FLICKER_CHANCE = 0.005;
const FLICKER_DURATION = 0.1;

export function createAnimationFn(traits) {
  const expression = traits?.Expression || traits?.expression || 'Peaceful';
  const type = traits?.Type || traits?.type || 'Human';

  const anim = EXPRESSION_ANIMS[expression] || EXPRESSION_ANIMS['Peaceful'];
  const glowInfo = TYPE_GLOW[type] || null;

  let flickerEnd = 0;

  return function animate(time, defaults) {
    const mods = {
      x: 0, y: 0, rotation: 0,
      opacity: 1, scaleX: 1, scaleY: 1,
      glowColor: glowInfo ? glowInfo.color : null,
    };

    const t = time * anim.speed;

    switch (anim.type) {
      case 'breathe':
        mods.y = Math.sin(t * Math.PI * 2) * anim.amplitude;
        // Subtle rotation sway
        mods.rotation = Math.sin(t * Math.PI) * 1.5;
        break;

      case 'bounce': {
        const bounce = Math.abs(Math.sin(t * Math.PI * 2));
        mods.y = -bounce * anim.amplitude;
        mods.scaleY = 1 + Math.sin(t * Math.PI * 2) * 0.04;
        mods.scaleX = 1 - Math.sin(t * Math.PI * 2) * 0.02;
        break;
      }

      case 'shake':
        mods.x = Math.sin(t * Math.PI * 8) * anim.amplitude;
        mods.rotation = Math.sin(t * Math.PI * 6) * 2;
        break;
    }

    // Hologram flicker
    if (time > flickerEnd && Math.random() < FLICKER_CHANCE) {
      flickerEnd = time + FLICKER_DURATION;
    }
    if (time < flickerEnd) {
      mods.opacity = 0.5 + Math.random() * 0.3;
    }

    return mods;
  };
}
