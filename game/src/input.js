// input.js — keyboard + mouse. Keys are tracked as a live set; the game
// polls it each frame. Clicks are queued so a single click is consumed once.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    // Edge queue: a quick tap (down+up between two frames) still counts as
    // a press. keydown records it; consumePress takes it once.
    this.pressed = new Set();
    this.clicks = []; // queued {x, y} in canvas pixels
    this.mouse = { x: 0, y: 0 };
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (!e.repeat) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
    });
  }

  down(key) {
    return this.keys.has(key);
  }

  // Movement state the thief reads each frame.
  move() {
    return {
      up: this.down('w') || this.down('arrowup'),
      down: this.down('s') || this.down('arrowdown'),
      left: this.down('a') || this.down('arrowleft'),
      right: this.down('d') || this.down('arrowright'),
      sneak: this.down('shift'),
    };
  }

  interactHeld() {
    return this.down('e');
  }

  takeClick() {
    return this.clicks.shift() || null;
  }

  // True only once per physical key press (edge trigger).
  consumePress(key) {
    if (!this.pressed.has(key)) return false;
    this.pressed.delete(key);
    this.keys.delete(key);
    return true;
  }
}
