/** Keys for `activeCameraPreset` / gauge sector callbacks. */
export type TurbineScenePresetId =
  | "default"
  | "hydraulic"
  | "generator";

export type TurbineSceneCameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

/** Tune position/target per GLB layout; use `logViewAfterOrbit` to capture from the app. */
export const TURBINE_SCENE_PRESET_SEEDS: Record<
  TurbineScenePresetId,
  TurbineSceneCameraView
> = {
  default: {
    position: [-5, 1.12, 2.05],
    target: [0, 0, 0],
  },
  /** Water path / wicket area — adjust after you frame it in the viewer. */
  hydraulic: {
    position: [-4.2, 0.95, 2.4],
    target: [-0.4, 0.15, 0],
  },
  /** Generator / red housing — adjust after you frame it in the viewer. */
  generator: {
    position: [-2.8, 1.15, 1.85],
    target: [0.6, 0.35, 0],
  },
};
