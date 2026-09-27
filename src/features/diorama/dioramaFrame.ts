import { Matrix4, Object3D, Quaternion, Vector3 } from '@iwsdk/core';

/**
 * The diorama's local coordinate frame: x right, y up from the base, z = 0 is the
 * marble channel plane. Physics entities live in world space, so every placement
 * goes through here. Methods write into caller-provided targets (no allocation).
 */
export class DioramaFrame {
  readonly anchor = new Object3D();
  private readonly inverse = new Matrix4();

  constructor(position: Vector3, yaw = 0) {
    this.anchor.position.copy(position);
    this.anchor.rotation.set(0, yaw, 0);
    this.anchor.updateMatrixWorld(true);
    this.inverse.copy(this.anchor.matrixWorld).invert();
  }

  localToWorld(x: number, y: number, z: number, target: Vector3): Vector3 {
    return target.set(x, y, z).applyMatrix4(this.anchor.matrixWorld);
  }

  worldToLocal(world: Vector3, target: Vector3): Vector3 {
    return target.copy(world).applyMatrix4(this.inverse);
  }

  /** Rotates a world-space direction into the local frame. */
  directionToLocal(world: Vector3, target: Vector3): Vector3 {
    return target.copy(world).transformDirection(this.inverse);
  }

  /** World orientation for something with local orientation `local`. */
  worldQuaternion(local: Quaternion, target: Quaternion): Quaternion {
    return target.copy(this.anchor.quaternion).multiply(local);
  }
}
