import {
  createSystem,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Object3D,
} from '@iwsdk/core';
import { DIORAMA, ONBOARDING, PEG } from '../../config/constants';
import { ghostPose, type OnboardingStep } from '../../lib/onboarding';
import { GEOMETRIES } from '../diorama/palette';
import { puzzleStore } from '../puzzle/puzzleStore';
import { onboardingStepOf } from './onboardingState';

const UP = new Vector3(0, 1, 0);
/** Peg knobs sit in front of the glass; the ghost hovers just in front of them. */
const KNOB_Z = DIORAMA.channelHalfDepth + PEG.radius;
const GHOST_Z = KNOB_Z + ONBOARDING.hover;

/** Never let the demonstration intercept the pinch it is demonstrating. */
function ignorePointer(object: Object3D): void {
  object.traverse((child) => {
    (child as Object3D & { pointerEvents?: string }).pointerEvents = 'none';
  });
}

/**
 * First five minutes: translucent fingertips pinch the first peg, pull a ghost
 * thread to the second and let go, on a loop; after the player's first thread
 * they pinch the chute instead. Hidden for good after the first solve.
 */
export class OnboardingSystem extends createSystem({}) {
  private root = new Group();
  private thumb!: Mesh;
  private index!: Mesh;
  private thread!: Mesh;
  private rings: Mesh[] = [];
  private material!: MeshStandardMaterial;
  private step: OnboardingStep = 'done';
  /** Loop clock restarts whenever the step changes, so each demo starts cleanly. */
  private clock = 0;
  private tmp = new Vector3();
  private dir = new Vector3();
  private quat = new Quaternion();

  init(): void {
    this.material = new MeshStandardMaterial({
      color: ONBOARDING.color,
      emissive: ONBOARDING.color,
      emissiveIntensity: 0.8,
      transparent: true,
      depthWrite: false,
    });
    const tip = new SphereGeometry(ONBOARDING.tipRadius, 16, 12);
    this.thumb = new Mesh(tip, this.material);
    this.index = new Mesh(tip, this.material);
    this.thread = new Mesh(GEOMETRIES.unitCylinder, this.material);
    const ring = new TorusGeometry(ONBOARDING.ringRadius, ONBOARDING.ringTube, 8, 32);
    this.rings = [new Mesh(ring, this.material), new Mesh(ring, this.material)];
    this.root.add(this.thumb, this.index, this.thread, ...this.rings);
    this.root.name = 'onboarding-ghost';
    this.root.visible = false;
    this.root.userData.step = this.step;
    ignorePointer(this.root);
    this.world.createTransformEntity(this.root);
    // The step only changes with puzzle state; update() just animates.
    const track = () => {
      const step = onboardingStepOf(puzzleStore.get());
      if (step === this.step) return;
      this.step = step;
      this.clock = 0;
      this.root.userData.step = step;
    };
    this.cleanupFuncs.push(puzzleStore.subscribe(track));
    track();
  }

  update(delta: number): void {
    const step = this.step;
    const frame = puzzleStore.frame;
    const showing = (step === 'pinch-pull' || step === 'drop') && frame !== null;
    this.root.visible = showing;
    if (!showing || !frame) return;
    this.clock += delta;
    this.root.quaternion.copy(frame.anchor.quaternion);
    frame.localToWorld(0, 0, 0, this.root.position);

    const pose = ghostPose(this.clock);
    this.material.opacity = ONBOARDING.maxOpacity * pose.opacity;
    if (step === 'pinch-pull') this.demoThread(pose.along, pose.pinch, pose.thread);
    else this.demoChute(pose.pinch);
  }

  /** Root sits at the diorama origin with its rotation, so children use local coordinates. */
  private demoThread(along: number, pinch: number, showThread: boolean): void {
    const { level, pegPositions } = puzzleStore.get();
    const link = level?.solution[0];
    const a = link && pegPositions[link.from];
    const b = link && pegPositions[link.to];
    if (!a || !b) return;
    const x = a.x + (b.x - a.x) * along;
    const y = a.y + (b.y - a.y) * along;
    this.placeTips(x, y, pinch);
    this.rings[0].visible = true;
    this.rings[1].visible = true;
    this.rings[0].position.set(a.x, a.y, KNOB_Z);
    this.rings[1].position.set(b.x, b.y, KNOB_Z);
    this.thread.visible = showThread && along > 0;
    if (this.thread.visible) this.stretch(a.x, a.y, x, y);
  }

  private demoChute(pinch: number): void {
    const chute = puzzleStore.get().level?.chutes[0];
    if (!chute) return;
    this.placeTips(chute.x, chute.y + ONBOARDING.chuteLift, pinch);
    this.thread.visible = false;
    this.rings[0].visible = true;
    this.rings[1].visible = false;
    this.rings[0].position.set(chute.x, chute.y, KNOB_Z);
  }

  /** Thumb below, index above: they meet at the target when pinched. */
  private placeTips(x: number, y: number, pinch: number): void {
    const gap = ONBOARDING.openGap * (1 - pinch) + ONBOARDING.tipRadius;
    this.thumb.position.set(x, y - gap, GHOST_Z);
    this.index.position.set(x, y + gap, GHOST_Z);
  }

  private stretch(ax: number, ay: number, bx: number, by: number): void {
    this.dir.set(bx - ax, by - ay, 0);
    const len = this.dir.length();
    this.thread.position.set((ax + bx) / 2, (ay + by) / 2, KNOB_Z);
    this.quat.setFromUnitVectors(UP, this.dir.divideScalar(len));
    this.thread.quaternion.copy(this.quat);
    this.thread.scale.set(ONBOARDING.threadRadius, len, ONBOARDING.threadRadius);
  }
}
