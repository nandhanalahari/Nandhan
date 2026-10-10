import * as THREE from 'three'

export type Axis = 'x' | 'y' | 'z'

export interface Move {
  axis: Axis
  layer: -1 | 0 | 1
  dir: 1 | -1
}

const FACE = {
  px: 0xb71234,
  nx: 0xff5800,
  py: 0xf4f4f4,
  ny: 0xffd500,
  pz: 0x009b48,
  nz: 0x0046ad,
}

const SIZE = 0.94
const SNAP = [0, 0.5, -0.5, 1, -1, Math.SQRT1_2, -Math.SQRT1_2]

function snap(v: number): number {
  let best = v
  let bestDist = Infinity
  for (const s of SNAP) {
    const d = Math.abs(v - s)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

interface Active {
  pivot: THREE.Group
  cubies: THREE.Mesh[]
  move: Move
  duration: number
  elapsed: number
}

export class CubeEngine {
  readonly group = new THREE.Group()
  onIdle: (() => void) | null = null
  /** Fired after each quarter turn with how many moves are still queued. */
  onMove: ((remaining: number) => void) | null = null

  private cubies: THREE.Mesh[] = []
  private queue: { move: Move; duration: number }[] = []
  private active: Active | null = null
  private plastic: THREE.MeshStandardMaterial
  private box: THREE.BoxGeometry
  private stickerGeo: THREE.PlaneGeometry

  constructor() {
    this.plastic = new THREE.MeshStandardMaterial({
      color: 0x23262c,
      roughness: 0.55,
      metalness: 0.08,
    })
    this.box = new THREE.BoxGeometry(SIZE, SIZE, SIZE)
    this.stickerGeo = new THREE.PlaneGeometry(0.78, 0.78)
    this.build()
  }

  private build(): void {
    const half = SIZE / 2 + 0.012
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = new THREE.Mesh(this.box, this.plastic)
          cubie.position.set(x, y, z)
          const add = (color: number, place: (m: THREE.Mesh) => void) => {
            const sticker = new THREE.Mesh(
              this.stickerGeo,
              new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.02 }),
            )
            place(sticker)
            cubie.add(sticker)
          }
          if (x === 1) add(FACE.px, (m) => { m.position.x = half; m.rotation.y = Math.PI / 2 })
          if (x === -1) add(FACE.nx, (m) => { m.position.x = -half; m.rotation.y = -Math.PI / 2 })
          if (y === 1) add(FACE.py, (m) => { m.position.y = half; m.rotation.x = -Math.PI / 2 })
          if (y === -1) add(FACE.ny, (m) => { m.position.y = -half; m.rotation.x = Math.PI / 2 })
          if (z === 1) add(FACE.pz, (m) => { m.position.z = half })
          if (z === -1) add(FACE.nz, (m) => { m.position.z = -half; m.rotation.y = Math.PI })
          this.cubies.push(cubie)
          this.group.add(cubie)
        }
      }
    }
  }

  get busy(): boolean {
    return this.active !== null || this.queue.length > 0
  }

  get queued(): number {
    return this.queue.length + (this.active ? 1 : 0)
  }

  enqueue(moves: Move[], duration: number): void {
    for (const move of moves) this.queue.push({ move, duration })
  }

  /** Drop pending turns and rebuild a solved cube. */
  reset(): void {
    if (this.active) {
      this.group.remove(this.active.pivot)
      this.active = null
    }
    this.queue = []
    this.onIdle = null
    this.onMove = null
    for (const cubie of this.cubies) this.group.remove(cubie)
    this.cubies = []
    this.build()
  }

  update(dt: number): void {
    if (!this.active && this.queue.length > 0) {
      const next = this.queue.shift()!
      const pivot = new THREE.Group()
      this.group.add(pivot)
      const cubies = this.cubies.filter((c) => Math.round(c.position[next.move.axis]) === next.move.layer)
      for (const cubie of cubies) pivot.attach(cubie)
      this.active = { pivot, cubies, move: next.move, duration: next.duration, elapsed: 0 }
    }
    if (!this.active) return

    const a = this.active
    a.elapsed += dt
    const t = Math.min(a.elapsed / a.duration, 1)
    a.pivot.rotation.set(0, 0, 0)
    a.pivot.rotation[a.move.axis] = ease(t) * (Math.PI / 2) * a.move.dir

    if (t >= 1) {
      a.pivot.rotation[a.move.axis] = (Math.PI / 2) * a.move.dir
      a.pivot.updateMatrixWorld(true)
      for (const cubie of a.cubies) {
        this.group.attach(cubie)
        cubie.position.set(
          Math.round(cubie.position.x),
          Math.round(cubie.position.y),
          Math.round(cubie.position.z),
        )
        const q = cubie.quaternion
        q.set(snap(q.x), snap(q.y), snap(q.z), snap(q.w))
        q.normalize()
      }
      this.group.remove(a.pivot)
      this.active = null
      const remaining = this.queue.length
      if (this.onMove) this.onMove(remaining)
      if (remaining === 0 && this.onIdle) this.onIdle()
    }
  }
}

const AXES: Axis[] = ['x', 'y', 'z']
const LAYERS: Array<-1 | 0 | 1> = [-1, 0, 1]

export function scrambleMoves(count: number): Move[] {
  const moves: Move[] = []
  let prev = ''
  while (moves.length < count) {
    const axis = AXES[Math.floor(Math.random() * 3)]
    const layer = LAYERS[Math.floor(Math.random() * 3)]
    const key = axis + layer
    if (key === prev) continue
    prev = key
    moves.push({ axis, layer, dir: Math.random() < 0.5 ? 1 : -1 })
  }
  return moves
}

export function inverseMoves(moves: Move[]): Move[] {
  return moves
    .slice()
    .reverse()
    .map((m) => ({ ...m, dir: (m.dir * -1) as 1 | -1 }))
}
