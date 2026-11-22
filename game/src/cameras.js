// cameras.js — wall cameras: slow sweeping red cones, hack panels.
import { angleDiff, losBlocked, inShadow } from './world.js';

export const CAM_CONE_HALF = 0.42; // ~24 degrees each side

export class Camera {
  constructor(def, index) {
    this.index = index;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.range = def.range;
    this.t = Math.random() * 6; // phase offset so the two cameras differ
    this.angle = def.baseAngle;
    this.on = true;
    this.hackProgress = 0; // 0..1 while the thief holds E at the panel
    this.seesThief = false;
  }

  update(dt, thief, blockers, smokes) {
    this.seesThief = false;
    if (!this.on) return;
    this.t += dt;
    this.angle = this.baseAngle + Math.sin(this.t * this.speed) * this.sweep;
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.range) return;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) > CAM_CONE_HALF) return;
    if (losBlocked(this.x, this.y, thief.x, thief.y, blockers, smokes)) return;
    this.seesThief = true;
  }

  // Detection rate for the alarm meter; sneak and shadow slow it.
  detectionRate(thief) {
    let rate = 7;
    if (thief.sneaking) rate *= 0.6;
    if (inShadow(thief.x, thief.y)) rate *= 0.5;
    return rate;
  }
}
