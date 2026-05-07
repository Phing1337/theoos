import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import './App.css'

const DOOR_PHOTOS = [
  { x: -0.66, y: -0.52, width: 1.16, height: 0.9, rotate: -0.12, colorA: '#cfe0ec', colorB: '#d9d6cc', label: 'Theo photo A' },
  { x: 0.34, y: -0.42, width: 1.12, height: 0.66, rotate: 0.07, colorA: '#e4e1dc', colorB: '#c9d6e8', label: 'Theo photo B' },
  { x: 1.24, y: -0.55, width: 0.48, height: 0.68, rotate: 0, colorA: '#dcded8', colorB: '#e7dccd', label: 'Theo photo C' },
  { x: 0.33, y: -1.04, width: 1.12, height: 0.7, rotate: -0.07, colorA: '#deded9', colorB: '#d7e3d6', label: 'Theo photo D' },
  { x: 1.26, y: -1.18, width: 0.42, height: 0.5, rotate: 0, colorA: '#e8e8e1', colorB: '#d6dde8', label: 'Theo photo E' },
]

const DOOR_NOTES = [
  { x: -0.82, y: -1.44, width: 0.52, height: 0.48, rotate: -0.06, label: 'Note' },
  { x: -0.26, y: -1.5, width: 0.52, height: 0.5, rotate: 0.05, label: 'Note' },
]

const DOOR_ACTIONS = [
  { x: -0.56, y: -2.08, width: 1.02, label: 'request coverage' },
  { x: 0.61, y: -2.08, width: 0.92, label: 'Swap days' },
]

const PLAYLISTS = ['Truck songs', 'Bedtime calm', 'Dance kitchen', 'Dragons Love Tacos']

function App() {
  const sceneRef = useRef(null)
  const controlsRef = useRef(null)
  const [doorOpen, setDoorOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.setDoorOpen(doorOpen)
  }, [doorOpen])

  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.setDrawerOpen(drawerOpen)
  }, [drawerOpen])

  useEffect(() => {
    if (!sceneRef.current) return undefined

    const mount = sceneRef.current
    const model = createFridgeScene({
      mount,
      onDoorToggle: () => setDoorOpen((open) => !open),
      onDrawerToggle: () => setDrawerOpen((open) => !open),
    })

    controlsRef.current = model.controls
    return () => {
      controlsRef.current = null
      model.dispose()
    }
  }, [])

  return (
    <main className="fridge-app">
      <div ref={sceneRef} className="fridge-scene" aria-hidden="true" />
      <h1 className="sr-only">TheoOS refrigerator prototype</h1>

      <section className="fridge-controls" aria-label="Refrigerator controls">
        <button type="button" onClick={() => setDoorOpen((open) => !open)}>{doorOpen ? 'Close fridge' : 'Open fridge'}</button>
        <button type="button" onClick={() => setDrawerOpen((open) => !open)}>{drawerOpen ? 'Close drawer' : 'Open freezer'}</button>
      </section>
    </main>
  )
}

function createFridgeScene({ mount, onDoorToggle, onDrawerToggle }) {
  const scene = new THREE.Scene()
  scene.background = null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  mount.appendChild(renderer.domElement)

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80)
  camera.position.set(0, 0.14, 12.8)

  const renderRoot = new THREE.Group()
  scene.add(renderRoot)

  const fridge = new THREE.Group()
  fridge.rotation.y = -0.16
  fridge.position.y = -0.16
  renderRoot.add(fridge)

  const clickable = []
  const disposable = []

  const aoMap = createAoTexture()
  const brushedSteelTexture = createBrushedSteelTexture()
  const porcelain = makeMaterial({
    color: '#d8d9d2',
    map: brushedSteelTexture,
    roughness: 0.46,
    metalness: 0.72,
    aoMap,
    aoMapIntensity: 0.36,
  })
  const porcelainDim = makeMaterial({
    color: '#aeb4ae',
    map: brushedSteelTexture,
    roughness: 0.54,
    metalness: 0.68,
    aoMap,
    aoMapIntensity: 0.44,
  })
  const interiorMaterial = makeMaterial({
    color: '#dcefe8',
    roughness: 0.72,
    metalness: 0.02,
    aoMap,
    aoMapIntensity: 0.26,
  })
  const chrome = makeMaterial({ color: '#bac8c1', roughness: 0.34, metalness: 0.58 })
  const rubber = makeMaterial({ color: '#24342c', roughness: 0.78, metalness: 0.02 })
  const floorMaterial = makeMaterial({ color: '#cfb58d', roughness: 0.9, metalness: 0.01 })
  const wallMaterial = makeMaterial({ color: '#e8efe0', roughness: 0.94, metalness: 0 })

  disposable.push(aoMap, brushedSteelTexture, porcelain, porcelainDim, interiorMaterial, chrome, rubber, floorMaterial, wallMaterial)

  const body = mesh(beveledBox(3.32, 6.74, 0.88, 0.08), porcelainDim)
  body.position.set(0, 0, -0.04)
  body.castShadow = true
  body.receiveShadow = true
  addUv2(body.geometry)
  fridge.add(body)
  disposable.push(body.geometry)

  const interior = mesh(beveledBox(2.86, 4.74, 0.16, 0.04), interiorMaterial)
  interior.position.set(0, 0.86, 0.48)
  interior.castShadow = false
  interior.receiveShadow = true
  addUv2(interior.geometry)
  fridge.add(interior)
  disposable.push(interior.geometry)

  const coldGlow = mesh(new THREE.PlaneGeometry(2.4, 4.08), makeTransparentMaterial('#ccfff4', 0.14))
  coldGlow.position.set(0, 0.9, 0.57)
  fridge.add(coldGlow)
  disposable.push(coldGlow.geometry, coldGlow.material)

  addInteriorCards({ fridge, disposable })

  const doorHinge = new THREE.Group()
  doorHinge.position.set(-1.56, 0.86, 0.62)
  fridge.add(doorHinge)

  const door = mesh(beveledBox(3.04, 4.86, 0.28, 0.065), porcelain)
  door.position.set(1.52, 0, 0)
  door.castShadow = true
  door.receiveShadow = true
  addUv2(door.geometry)
  door.userData.action = 'door'
  doorHinge.add(door)
  clickable.push(door)
  disposable.push(door.geometry)

  const doorHandle = mesh(new THREE.CapsuleGeometry(0.055, 1.54, 10, 18), chrome)
  doorHandle.position.set(2.84, 0.88, 0.22)
  doorHandle.castShadow = true
  doorHinge.add(doorHandle)
  disposable.push(doorHandle.geometry)

  addDoorDecor({ doorHinge, disposable, clickable })

  const drawerGroup = new THREE.Group()
  drawerGroup.position.set(0, -2.5, 0.62)
  fridge.add(drawerGroup)

  const drawerBin = mesh(beveledBox(2.7, 1.1, 0.72, 0.04), interiorMaterial)
  drawerBin.position.set(0, -0.05, -0.16)
  drawerBin.castShadow = true
  drawerBin.receiveShadow = true
  drawerGroup.add(drawerBin)
  disposable.push(drawerBin.geometry)

  const drawerFace = mesh(beveledBox(3.1, 1.38, 0.32, 0.065), porcelain)
  drawerFace.position.set(0, 0, 0.14)
  drawerFace.castShadow = true
  drawerFace.receiveShadow = true
  drawerFace.userData.action = 'drawer'
  drawerGroup.add(drawerFace)
  clickable.push(drawerFace)
  disposable.push(drawerFace.geometry)

  const drawerHandle = mesh(new THREE.CapsuleGeometry(0.055, 1.44, 10, 18), chrome)
  drawerHandle.rotation.z = Math.PI / 2
  drawerHandle.position.set(0, 0.34, 0.36)
  drawerHandle.castShadow = true
  drawerGroup.add(drawerHandle)
  disposable.push(drawerHandle.geometry)

  addFreezerDecor({ drawerGroup, disposable, clickable })

  addLights(scene)
  addRoom(scene, disposable, floorMaterial, wallMaterial)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const state = {
    doorOpen: false,
    drawerOpen: false,
    targetDoor: 0,
    targetDrawer: 0,
    modelScale: 1,
    modelX: 0,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }

  function resize() {
    const { clientWidth, clientHeight } = mount
    renderer.setSize(clientWidth, clientHeight, false)
    camera.aspect = clientWidth / clientHeight
    const narrow = clientWidth < 720
    const short = clientHeight < 780
    const compactDesktop = clientWidth < 1040
    camera.fov = narrow ? 31 : 30
    camera.position.y = narrow ? 0.02 : 0.12
    camera.position.z = narrow ? 13.7 : short ? 14.1 : compactDesktop ? 13.7 : 13.2
    camera.updateProjectionMatrix()
    state.modelScale = narrow ? 0.9 : short ? 0.94 : 1
    state.modelX = narrow ? 0 : 0.04
    renderRoot.scale.setScalar(state.modelScale)
    renderRoot.position.x = state.modelX
  }

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(clickable, true)[0]?.object
    if (hit?.userData.action === 'door') onDoorToggle()
    if (hit?.userData.action === 'drawer') onDrawerToggle()
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)
  resize()

  let frameId = 0
  let previous = performance.now()

  function animate(now) {
    const delta = Math.min((now - previous) / 1000, 0.05)
    previous = now

    const damping = state.reducedMotion ? 100 : 7.8
    doorHinge.rotation.y = THREE.MathUtils.damp(doorHinge.rotation.y, state.targetDoor, damping, delta)
    drawerGroup.position.z = THREE.MathUtils.damp(drawerGroup.position.z, 0.62 + state.targetDrawer, damping, delta)
    drawerGroup.position.y = THREE.MathUtils.damp(drawerGroup.position.y, -2.5 - state.targetDrawer * 0.11, damping, delta)
    fridge.rotation.y = THREE.MathUtils.damp(fridge.rotation.y, state.doorOpen ? -0.08 : -0.16, 3.8, delta)
    renderRoot.position.x = THREE.MathUtils.damp(renderRoot.position.x, state.modelX, 4.2, delta)
    renderRoot.scale.setScalar(THREE.MathUtils.damp(renderRoot.scale.x, state.modelScale, 4.2, delta))

    renderer.render(scene, camera)
    frameId = requestAnimationFrame(animate)
  }

  frameId = requestAnimationFrame(animate)

  return {
    controls: {
      setDoorOpen(open) {
        state.doorOpen = open
        state.targetDoor = open ? -1.82 : 0
      },
      setDrawerOpen(open) {
        state.drawerOpen = open
        state.targetDrawer = open ? 0.82 : 0
      },
    },
    dispose() {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.dispose()
      disposable.forEach((item) => item.dispose?.())
      mount.replaceChildren()
    },
  }
}

function addInteriorCards({ fridge, disposable }) {
  PLAYLISTS.forEach((playlist, index) => {
    const texture = createLabelTexture(playlist, '#edf8ef', '#2f5146', 280, 118)
    const material = makeTextureMaterial(texture)
    const card = mesh(beveledBox(1.14, 0.42, 0.035, 0.018), material)
    card.position.set(index % 2 ? 0.56 : -0.56, index < 2 ? 1.14 : 0.16, 0.72)
    card.castShadow = true
    fridge.add(card)
    disposable.push(texture, material, card.geometry)
  })
}

function addDoorDecor({ doorHinge, disposable, clickable }) {
  const calendarTexture = createPanelTexture({
    label: 'Calendar',
    width: 720,
    height: 520,
    background: '#d8d8d6',
    foreground: '#151614',
    font: '500 29px Arial',
    radius: 24,
  })
  const calendar = card(2.62, 1.92, calendarTexture, 0.026)
  calendar.position.set(1.52, 1.12, 0.17)
  calendar.castShadow = true
  calendar.userData.action = 'door'
  doorHinge.add(calendar)
  clickable.push(calendar)
  disposable.push(calendarTexture, calendar.material, calendar.geometry)

  DOOR_PHOTOS.forEach((photo) => {
    const texture = createPhotoTexture(photo)
    const picture = card(photo.width, photo.height, texture, 0.018)
    picture.position.set(1.52 + photo.x, photo.y, 0.2)
    picture.rotation.z = photo.rotate
    picture.castShadow = true
    doorHinge.add(picture)
    disposable.push(texture, picture.material, picture.geometry)
  })

  DOOR_NOTES.forEach((note) => {
    const texture = createPanelTexture({
      label: note.label,
      width: 220,
      height: 200,
      background: '#ecece7',
      foreground: '#171817',
      font: '500 28px Arial',
      radius: 4,
    })
    const notePlane = card(note.width, note.height, texture, 0.016)
    notePlane.position.set(1.52 + note.x, note.y, 0.22)
    notePlane.rotation.z = note.rotate
    notePlane.castShadow = true
    notePlane.userData.action = 'door'
    doorHinge.add(notePlane)
    clickable.push(notePlane)
    disposable.push(texture, notePlane.material, notePlane.geometry)
  })

  DOOR_ACTIONS.forEach((action) => {
    const texture = createPanelTexture({
      label: action.label,
      width: 360,
      height: 116,
      background: '#f3f3ef',
      foreground: '#151614',
      font: '600 26px Arial',
      radius: 10,
    })
    const button = card(action.width, 0.32, texture, 0.02)
    button.position.set(1.52 + action.x, action.y, 0.235)
    button.castShadow = true
    button.userData.action = 'door'
    doorHinge.add(button)
    clickable.push(button)
    disposable.push(texture, button.material, button.geometry)
  })
}

function addFreezerDecor({ drawerGroup, disposable, clickable }) {
  const texture = createPanelTexture({
    label: 'Freezer: Theo other details',
    width: 720,
    height: 300,
    background: 'rgba(210,210,205,0)',
    foreground: '#10120f',
    font: '600 32px Arial',
    radius: 0,
  })
  const label = plane(2.5, 0.7, texture)
  label.position.set(0, -0.2, 0.36)
  label.userData.action = 'drawer'
  drawerGroup.add(label)
  clickable.push(label)
  disposable.push(texture, label.material, label.geometry)
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#f7fff1', '#74684f', 0.98))

  const key = new THREE.DirectionalLight('#fff2d9', 1.82)
  key.position.set(-4.8, 6.4, 6.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 4
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 22
  key.shadow.camera.left = -6
  key.shadow.camera.right = 6
  key.shadow.camera.top = 8
  key.shadow.camera.bottom = -7
  scene.add(key)

  const fill = new THREE.DirectionalLight('#dffcf2', 0.52)
  fill.position.set(5.2, 2.6, 3.8)
  scene.add(fill)

  const rim = new THREE.DirectionalLight('#c8deff', 0.62)
  rim.position.set(3.8, 4.2, -2.4)
  scene.add(rim)

  const counterWarmth = new THREE.PointLight('#ffd8a8', 0.38, 7.4, 2)
  counterWarmth.position.set(-2.4, -1.6, 3.2)
  scene.add(counterWarmth)

  const fridgeLight = new THREE.PointLight('#dcfff7', 0.82, 5.2, 2)
  fridgeLight.position.set(0.1, 1.9, 1.8)
  fridgeLight.castShadow = true
  fridgeLight.shadow.mapSize.set(1024, 1024)
  fridgeLight.shadow.radius = 5
  scene.add(fridgeLight)
}

function addRoom(scene, disposable, floorMaterial, wallMaterial) {
  const floor = mesh(new THREE.PlaneGeometry(20, 12), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.52
  floor.position.z = 1.2
  floor.receiveShadow = true
  scene.add(floor)
  disposable.push(floor.geometry)

  const wall = mesh(new THREE.PlaneGeometry(20, 12), wallMaterial)
  wall.position.set(0, 1.3, -1.1)
  wall.receiveShadow = true
  scene.add(wall)
  disposable.push(wall.geometry)
}

function mesh(geometry, material) {
  return new THREE.Mesh(geometry, material)
}

function beveledBox(width, height, depth, bevel) {
  return new RoundedBoxGeometry(width, height, depth, 1, bevel)
}

function plane(width, height, texture) {
  const material = makeTextureMaterial(texture)
  const item = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  return item
}

function card(width, height, texture, depth) {
  const material = makeTextureMaterial(texture)
  return new THREE.Mesh(beveledBox(width, height, depth, Math.min(0.018, width * 0.04, height * 0.04)), material)
}

function makeMaterial(options) {
  return new THREE.MeshStandardMaterial(options)
}

function makeTransparentMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
}

function makeTextureMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.76,
    metalness: 0.02,
    transparent: true,
  })
}

function addUv2(geometry) {
  if (geometry.attributes.uv) {
    geometry.setAttribute('uv2', geometry.attributes.uv)
  }
}

function createAoTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(128, 112, 24, 128, 128, 178)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.58, '#d8d8d8')
  gradient.addColorStop(1, '#626262')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

function createBrushedSteelTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 384
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  gradient.addColorStop(0, '#aeb4ad')
  gradient.addColorStop(0.18, '#d8dbd4')
  gradient.addColorStop(0.5, '#c2c7c0')
  gradient.addColorStop(0.78, '#f0efe6')
  gradient.addColorStop(1, '#9ca39d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y += 2) {
    const alpha = y % 8 === 0 ? 0.18 : 0.08
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(0, y, canvas.width, 1)
    ctx.fillStyle = `rgba(54, 62, 58, ${alpha * 0.55})`
    ctx.fillRect(0, y + 1, canvas.width, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.2, 1.8)
  return texture
}

function createLabelTexture(label, background, foreground, width, height, options = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = foreground
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = options.display ? '800 46px Georgia' : '900 28px Arial'
  ctx.fillText(label, width / 2, height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createPanelTexture({ label, background, foreground, width, height, font, radius }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (radius > 0) {
    drawRoundedRect(ctx, 0, 0, width, height, radius)
    ctx.fillStyle = background
    ctx.fill()
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  ctx.fillStyle = foreground
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = font
  wrapText(ctx, label, width / 2, height / 2, width * 0.78, parseInt(font.match(/\d+/)?.[0] || '28', 10) * 1.16)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createPhotoTexture(photo) {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 280
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#efefea'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fillRect(0, canvas.height - 22, canvas.width, 22)
  ctx.fillStyle = photo.colorA
  ctx.fillRect(26, 24, canvas.width - 52, canvas.height * 0.48)
  ctx.fillStyle = photo.colorB
  ctx.fillRect(26, canvas.height * 0.52, canvas.width - 52, canvas.height * 0.26)
  ctx.fillStyle = 'rgba(255,255,255,0.34)'
  ctx.beginPath()
  ctx.arc(canvas.width * 0.68, canvas.height * 0.28, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111412'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fontSize = photo.width < 0.5 ? 21 : 24
  ctx.font = `500 ${fontSize}px Arial`
  wrapText(ctx, photo.label, canvas.width / 2, canvas.height / 2, canvas.width * 0.78, fontSize * 1.22)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function wrapText(ctx, text, x, centerY, maxWidth, lineHeight) {
  const lines = []
  text.split('\n').forEach((paragraph) => {
    const words = paragraph.split(' ')
    let line = ''

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = testLine
      }
    })
    lines.push(line)
  })

  const startY = centerY - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((lineText, index) => ctx.fillText(lineText, x, startY + index * lineHeight))
}

export default App
