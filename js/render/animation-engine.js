// Normie Mirror — Trait-based animation engine

const EXPRESSION_ANIMS = {
  'Peaceful':  { type: 'breathe',  speed: 0.5, amplitude: 5 },
  'Serious':   { type: 'breathe',  speed: 0.3, amplitude: 2 },
  'Surprised': { type: 'bounce',   speed: 1.2, amplitude: 10 },
  'Happy':     { type: 'bounce',   speed: 0.9, amplitude: 8 },
  'Angry':     { type: 'shake',    speed: 1.8, amplitude: 4 },
  'Wink':      { type: 'bounce',   speed: 0.6, amplitude: 5 },
  'Smirk':     { type: 'breathe',  speed: 0.4, amplitude: 3 },
};

const TYPE_GLOW = {
  'Cat':   { color: 'rgba(255, 180, 50, 0.35)' },
  'Alien': { color: 'rgba(0, 255, 200, 0.35)' },
  'Agent': { color: 'rgba(180, 80, 255, 0.35)' },
};

export function createAnimationFn(traits) {
  const expression = traits?.Expression || traits?.expression || 'Peaceful';
  const type = traits?.Type || traits?.type || 'Human';

  const anim = EXPRESSION_ANIMS[expression] || EXPRESSION_ANIMS['Peaceful'];
  const glowInfo = TYPE_GLOW[type] || null;

  return function animate(time) {
    const mods = {
      x: 0, y: 0, rotation: 0,
      opacity: 1, scaleX: 1, scaleY: 1,
      glowColor: glowInfo ? glowInfo.color : null,
    };

    const t = time * anim.speed;

    switch (anim.type) {
      case 'breathe':
        mods.y = Math.sin(t * Math.PI * 2) * anim.amplitude;
        mods.rotation = Math.sin(t * Math.PI) * 1;
        break;

      case 'bounce': {
        const bounce = Math.abs(Math.sin(t * Math.PI * 2));
        mods.y = -bounce * anim.amplitude;
        mods.scaleY = 1 + Math.sin(t * Math.PI * 2) * 0.03;
        mods.scaleX = 1 - Math.sin(t * Math.PI * 2) * 0.015;
        break;
      }

      case 'shake':
        mods.x = Math.sin(t * Math.PI * 8) * anim.amplitude;
        mods.rotation = Math.sin(t * Math.PI * 6) * 1.5;
        break;
    }

    return mods;
  };
}
