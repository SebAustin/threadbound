import {
  BoxGeometry,
  CircleGeometry,
  Color,
  createSystem,
  Group,
  Mesh,
  MeshStandardMaterial,
  VisibilityState,
} from '@iwsdk/core';
import { DIORAMA_DEFAULT_POSITION, VIRTUAL_ROOM } from '../../config/constants';
import { STUDY_TABLE_TOP, studyTableFit, type DioramaOffset } from '../../lib/placement';
import { shouldShowVirtualRoom } from '../../lib/xrMode';
import { mergeParts, type GeometryPart } from '../geometry/mergeParts';
import { puzzleStore } from '../puzzle/puzzleStore';

/**
 * The "cozy study" shown in the browser and in VR sessions (e.g. Safari on
 * visionOS, which has no passthrough). Over passthrough it hides so the
 * diorama sits on the player's real table.
 */
export class EnvironmentSystem extends createSystem({}) {
  private room!: Group;
  private table!: Mesh;
  private background = new Color(VIRTUAL_ROOM.background);
  /** The offset the table was last fitted to (snapshots are immutable, so identity tells a change). */
  private fittedTo: DioramaOffset | null = null;

  init(): void {
    this.room = this.buildRoom();
    this.room.name = 'virtual-room';
    this.world.createTransformEntity(this.room);
    this.apply();
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe(() => this.apply()),
      puzzleStore.subscribe((state) => this.fitTable(state.settings.offset)),
    );
    this.fitTable(puzzleStore.get().settings.offset);
  }

  /** The table follows the player's offset, so the diorama never floats above it or sinks into it. */
  private fitTable(offset: DioramaOffset): void {
    if (offset === this.fittedTo) return;
    this.fittedTo = offset;
    const fit = studyTableFit(offset);
    this.table.position.z = fit.z;
    this.table.scale.y = fit.scaleY;
  }

  private apply(): void {
    const immersive = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    const show = shouldShowVirtualRoom(immersive, this.world.session?.environmentBlendMode);
    this.room.visible = show;
    this.world.scene.background = show ? this.background : null;
  }

  private buildRoom(): Group {
    const room = new Group();
    const wood = new MeshStandardMaterial({ color: VIRTUAL_ROOM.tableColor, roughness: 0.6 });
    const floorMat = new MeshStandardMaterial({ color: VIRTUAL_ROOM.floorColor, roughness: 0.95 });
    const rugMat = new MeshStandardMaterial({ color: VIRTUAL_ROOM.rugColor, roughness: 1 });

    const [x, , z] = DIORAMA_DEFAULT_POSITION;
    const [tw, th, td] = VIRTUAL_ROOM.tableTop;
    const topY = STUDY_TABLE_TOP; // table surface meets the diorama base
    const legH = topY - th;
    const legGeo = new BoxGeometry(VIRTUAL_ROOM.legSize, legH, VIRTUAL_ROOM.legSize);
    const inset = VIRTUAL_ROOM.legSize;
    const legs: GeometryPart[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        legs.push({ geometry: legGeo, at: [x + sx * (tw / 2 - inset), legH / 2, z + sz * (td / 2 - inset)] });
      }
    }
    // Top and legs share the wood: one mesh, one draw call. Built about the floor (y = 0), so
    // scaling it in y keeps the legs on the floor while the top follows the diorama.
    const table = new Mesh(mergeParts([{ geometry: new BoxGeometry(tw, th, td), at: [x, topY - th / 2, z] }, ...legs]), wood);
    table.name = 'study-table';
    this.table = table;
    room.add(table);

    const floor = new Mesh(new CircleGeometry(VIRTUAL_ROOM.floorRadius, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    room.add(floor);
    const rug = new Mesh(new CircleGeometry(VIRTUAL_ROOM.rugRadius, 48), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(x, 0.002, z * 0.5);
    room.add(rug);
    return room;
  }
}
