import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  readTurbinePersistedView,
  writeTurbinePersistedView,
  type SavedGlbCameraView,
} from "@/config/turbinePersistedCamera";
import { TURBINE_SCENE_PRESET_SEEDS } from "./turbineScenePresets";

export type { SavedGlbCameraView };

type ScadaGlbViewerProps = {
  /** Absolute path under `/public` or full HTTPS URL (e.g. object storage). */
  url: string;
  className?: string;
  /** Model scale multiplier (1 = original). */
  scale?: number;
  /** Camera vertical field of view in degrees. Smaller = more zoom. */
  cameraFov?: number;
  /** If true, auto-centers and auto-fits camera to model (cancels visual scaling). */
  autoFit?: boolean;
  /** Translate model in world units. +X = right, +Y = up, +Z = toward camera. */
  modelPosition?: [number, number, number];
  /**
   * Camera position before fit; Bounds keeps the ray from `orbitTarget` → this point (which side / height you see).
   * Tweak x/z to orbit around the model, y for higher/lower angle.
   */
  initialCameraPosition?: [number, number, number];
  /** OrbitControls look-at; shift to center a specific part of the model. */
  orbitTarget?: [number, number, number];
  /** Bounds fit padding; lower = closer / larger on screen. */
  fitMargin?: number;
  /** Y-axis rotation of the model (radians), if the GLB export faces the wrong way. */
  modelRotationY?: number;
  /**
   * After you drag-orbit and release, logs two lines you can paste into `HomeScreen`:
   * `initialCameraPosition` and `orbitTarget`. Only the camera angle is captured (not model spin).
   */
  logViewAfterOrbit?: boolean;
  /**
   * Base key for `localStorage`; actual key is namespaced by `url` so each model keeps its own saved view.
   * Legacy single-key entries are migrated once when still valid (see `turbinePersistedCamera.ts`).
   */
  persistViewStorageKey?: string;
  /** When set, saved camera must match this string or it is ignored (e.g. tie to `modelPosition` + rotation). */
  persistLayoutKey?: string;
  /** Optional hook when orbit ends (after optional persist + console log). */
  onViewOrbitEnd?: (view: SavedGlbCameraView) => void;
  /** When true, disables orbit, zoom, and pan so the camera stays fixed. */
  viewLocked?: boolean;
  /**
   * When set, smoothly moves the camera to `cameraPresets[activeCameraPreset]` (merged with built-in seeds).
   * Omit to disable preset-driven camera moves.
   */
  activeCameraPreset?: string | null;
  /** Overrides / extends built-in `TURBINE_SCENE_PRESET_SEEDS` (stable reference recommended). */
  cameraPresets?: Record<string, SavedGlbCameraView>;
  /** Preset tween length in seconds. */
  cameraPresetDurationSec?: number;
};

type OrbitControlsLike = {
  object: { position: { x: number; y: number; z: number } };
  target: { x: number; y: number; z: number };
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

function snapshotFromControls(oc: OrbitControlsLike): SavedGlbCameraView {
  const p = oc.object.position;
  const t = oc.target;
  return {
    position: [p.x, p.y, p.z],
    target: [t.x, t.y, t.z],
  };
}

function OrbitViewCapture({
  persistBaseKey,
  modelUrl,
  persistLayoutKey,
  logToConsole,
  onViewOrbitEnd,
  captureOnMount,
  onCaptured,
}: {
  persistBaseKey?: string;
  modelUrl: string;
  persistLayoutKey?: string;
  logToConsole?: boolean;
  onViewOrbitEnd?: (view: SavedGlbCameraView) => void;
  /** When true, captures and persists once as soon as controls are ready. */
  captureOnMount?: boolean;
  /** Called whenever a view is captured (end event or mount capture). */
  onCaptured?: (view: SavedGlbCameraView) => void;
}) {
  const controls = useThree((s) => s.controls);
  const onEndRef = useRef(onViewOrbitEnd);
  onEndRef.current = onViewOrbitEnd;
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;
  const didMountCapture = useRef(false);

  useEffect(() => {
    if (!controls) return;
    const oc = controls as unknown as OrbitControlsLike;
    if (typeof oc.addEventListener !== "function") return;

    if (captureOnMount && !didMountCapture.current) {
      didMountCapture.current = true;
      // Defer one tick so other initializers (e.g. Bounds fit) can move the camera first.
      setTimeout(() => {
        const view = snapshotFromControls(oc);
        if (persistBaseKey) {
          writeTurbinePersistedView(persistBaseKey, modelUrl, view, persistLayoutKey);
        }
        if (logToConsole) {
          const { position: pos, target: tgt } = view;
          // eslint-disable-next-line no-console -- intentional dev UX: copy camera + target into props
          console.log(
            "[ScadaGlbViewer] Saved view" +
              (persistBaseKey ? ` (base key: ${persistBaseKey}, namespaced by model URL)` : "") +
              ". Paste into HomeScreen constants or keep using persist key only:\n" +
              `  initialCameraPosition={[${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}, ${pos[2].toFixed(4)}]}\n` +
              `  orbitTarget={[${tgt[0].toFixed(4)}, ${tgt[1].toFixed(4)}, ${tgt[2].toFixed(4)}]}`
          );
        }
        onCapturedRef.current?.(view);
        onEndRef.current?.(view);
      }, 0);
    }

    const onEnd = () => {
      const view = snapshotFromControls(oc);
      if (persistBaseKey) {
        writeTurbinePersistedView(persistBaseKey, modelUrl, view, persistLayoutKey);
      }
      if (logToConsole) {
        const { position: pos, target: tgt } = view;
        // eslint-disable-next-line no-console -- intentional dev UX: copy camera + target into props
        console.log(
          "[ScadaGlbViewer] Saved view" +
            (persistBaseKey ? ` (base key: ${persistBaseKey}, namespaced by model URL)` : "") +
            ". Paste into HomeScreen constants or keep using persist key only:\n" +
            `  initialCameraPosition={[${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}, ${pos[2].toFixed(4)}]}\n` +
            `  orbitTarget={[${tgt[0].toFixed(4)}, ${tgt[1].toFixed(4)}, ${tgt[2].toFixed(4)}]}`
        );
      }
      onCapturedRef.current?.(view);
      onEndRef.current?.(view);
    };
    oc.addEventListener("end", onEnd);
    return () => oc.removeEventListener("end", onEnd);
  }, [controls, persistBaseKey, modelUrl, persistLayoutKey, logToConsole]);

  return null;
}

type ControlsWithTarget = {
  target: THREE.Vector3;
  update: () => void;
};

function CameraPresetAnimator({
  activeKey,
  presets,
  durationSec,
}: {
  activeKey: string;
  presets: Record<string, SavedGlbCameraView>;
  durationSec: number;
}) {
  const { camera, controls, invalidate } = useThree();
  const presetsRef = useRef(presets);
  presetsRef.current = presets;
  const firstLayout = useRef(true);
  const anim = useRef<{
    t: number;
    fP: THREE.Vector3;
    tP: THREE.Vector3;
    fT: THREE.Vector3;
    tT: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }
    const next = presetsRef.current[activeKey];
    if (!next) return;
    const oc = controls as unknown as ControlsWithTarget | null;
    if (!oc?.target) return;
    anim.current = {
      t: 0,
      fP: camera.position.clone(),
      tP: new THREE.Vector3(...next.position),
      fT: oc.target.clone(),
      tT: new THREE.Vector3(...next.target),
    };
  }, [activeKey, camera, controls]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    a.t += delta / durationSec;
    const k = Math.min(1, a.t);
    const ease = 1 - (1 - k) ** 3;
    camera.position.lerpVectors(a.fP, a.tP, ease);
    const oc = controls as unknown as ControlsWithTarget;
    oc.target.lerpVectors(a.fT, a.tT, ease);
    oc.update();
    invalidate();
    if (k >= 1) anim.current = null;
  });

  return null;
}

function GlbModel({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url);
  // Clone so we can safely apply transforms without mutating cached GLTF scene.
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={scale} />;
}

export default function ScadaGlbViewer({
  url,
  className,
  scale = 1,
  cameraFov = 35,
  autoFit = true,
  modelPosition = [0, 0, 0],
  initialCameraPosition = [-5, 1.12, 2.05],
  orbitTarget = [0, 0, 0],
  fitMargin = 0.52,
  modelRotationY = 0,
  logViewAfterOrbit = false,
  persistViewStorageKey,
  persistLayoutKey,
  onViewOrbitEnd,
  viewLocked = false,
  activeCameraPreset = null,
  cameraPresets,
  cameraPresetDurationSec = 0.55,
}: ScadaGlbViewerProps) {
  const boundsKey = useMemo(() => {
    // Remount Bounds to refit when seed view/layout changes.
    const seed = initialCameraPosition.join(",");
    const pos = modelPosition.join(",");
    return `bounds:${url}:${fitMargin}:${seed}:${orbitTarget.join(",")}:${pos}:${modelRotationY}:${scale}`;
  }, [url, fitMargin, initialCameraPosition, orbitTarget, modelPosition, modelRotationY, scale]);

  const [persistedView, setPersistedView] = useState<SavedGlbCameraView | null>(() => {
    if (typeof window === "undefined" || !persistViewStorageKey) return null;
    return readTurbinePersistedView(persistViewStorageKey, url, persistLayoutKey);
  });

  useEffect(() => {
    if (!persistViewStorageKey) {
      setPersistedView(null);
      return;
    }
    setPersistedView(readTurbinePersistedView(persistViewStorageKey, url, persistLayoutKey));
  }, [persistViewStorageKey, url, persistLayoutKey]);

  const cameraPosition = persistedView?.position ?? initialCameraPosition;
  const orbitTargetEffective = persistedView?.target ?? orbitTarget;
  const useBoundsFit = autoFit && !persistedView;
  /**
   * Only pass `target` when it comes from persisted storage. Passing a fixed prop every
   * re-render (e.g. [0,0,0]) makes drei reset OrbitControls — toggling `viewLocked` then
   * snaps the camera. Without persistence, let controls own `target` after the first fit.
   */
  const presetMode = activeCameraPreset != null && activeCameraPreset !== "";
  const mergedPresets = useMemo(
    () => ({ ...TURBINE_SCENE_PRESET_SEEDS, ...cameraPresets }),
    [cameraPresets]
  );
  /**
   * While a non-default preset is active, avoid passing a fixed React `target` so it does not
   * fight the animator. For `default` with persisted storage, keep syncing target from props.
   */
  const shouldForceTarget =
    persistedView != null ||
    (!autoFit && (!presetMode || activeCameraPreset === "default"));
  const orbitTargetProp = shouldForceTarget
    ? ({ target: orbitTargetEffective } as const)
    : ({} as { target?: [number, number, number] });
  const captureOnMount = Boolean(persistViewStorageKey) && persistedView == null;

  return (
    <div
      className={[
        "rounded-[20px] bg-[#D9D9D9]/15 overflow-hidden touch-none select-none",
        "shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]",
        className ?? "",
      ].join(" ")}
    >
      <Canvas
        camera={{
          position: cameraPosition,
          fov: cameraFov,
          near: 0.1,
          far: 10_000_000,
        }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
      >
        <CameraFovSync fov={cameraFov} />
        <color attach="background" args={["#2c2c30"]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[-2.5, 4, 2]} intensity={1.6} />
        {/* Before Bounds: clip() needs state.controls. Do not use Bounds observe — it refits and cancels orbit. */}
        <OrbitControls
          makeDefault
          enablePan={false}
          enableRotate={!viewLocked}
          enableZoom={!viewLocked}
          minDistance={0.001}
          maxDistance={5_000_000}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
          {...orbitTargetProp}
        />
        {persistViewStorageKey || logViewAfterOrbit || onViewOrbitEnd ? (
          <OrbitViewCapture
            persistBaseKey={persistViewStorageKey}
            modelUrl={url}
            persistLayoutKey={persistLayoutKey}
            logToConsole={logViewAfterOrbit}
            onViewOrbitEnd={onViewOrbitEnd}
            captureOnMount={captureOnMount}
            onCaptured={setPersistedView}
          />
        ) : null}
        {presetMode && mergedPresets[activeCameraPreset!] ? (
          <CameraPresetAnimator
            activeKey={activeCameraPreset!}
            presets={mergedPresets}
            durationSec={cameraPresetDurationSec}
          />
        ) : null}
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#06E2F4" wireframe />
            </mesh>
          }
        >
          {useBoundsFit ? (
            <Bounds key={boundsKey} fit margin={fitMargin} clip={false}>
              <group
                position={modelPosition}
                rotation={[0, modelRotationY, 0]}
              >
                <Center>
                  <GlbModel url={url} scale={scale} />
                </Center>
              </group>
            </Bounds>
          ) : (
            <group position={modelPosition} rotation={[0, modelRotationY, 0]}>
              <Center>
                <GlbModel url={url} scale={scale} />
              </Center>
            </group>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

function CameraFovSync({ fov }: { fov: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!camera) return;
    if ("fov" in camera) {
      // @ts-expect-error -- r3f camera can be PerspectiveCamera; keep runtime-guarded
      camera.fov = fov;
      // @ts-expect-error -- runtime camera guard
      camera.updateProjectionMatrix?.();
    }
  }, [camera, fov]);
  return null;
}

