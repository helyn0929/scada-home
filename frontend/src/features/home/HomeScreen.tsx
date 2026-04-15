import { useCallback, useMemo, useState } from "react"
import KpiCard from "@/components/kpi/KpiCard"
import { useLiveTelemetry } from "../telemetry/useLiveTelemetry"
import NavBar from "@/components/nav/NavBar"
import ValveStatusMap from "@/components/valves/ValveStatusMap"
import NoiseMonitoring from "@/components/noise/NoiseMonitoring"
import TemperatureCard from "@/components/temperature/TemperatureCard"
import GeneratorVibration from "@/components/vibration/GeneratorVibration"
import GeneratorPower, { GeneratorPowerTitle } from "@/components/power/GeneratorPower"
import TurbineGeneratorGauges, {
  type TurbineGaugeScene,
} from "@/components/turbine/TurbineGeneratorGauges"
import PressureDN900, { PressureDN900Title } from "@/components/pressure/PressureDN900"
import WaterQualityTesting, {
  WaterQualityTestingTitle,
} from "@/components/water/WaterQualityTesting"
import ScadaGlbViewer from "@/components/three/ScadaGlbViewer"
import TurbineViewerErrorBoundary from "@/components/three/TurbineViewerErrorBoundary"
import { TURBINE_GLB_URL } from "@/config/turbineGltfUrl"
import {
  TURBINE_SCENE_PRESET_SEEDS,
  type TurbineScenePresetId,
} from "@/components/three/turbineScenePresets"
import { MathUtils } from "three"

type Vector3Tuple = [number, number, number]

function vecAdd(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

/**
 * Model placement in world space. Framing uses explicit orbit + camera ray (no localStorage).
 */
const TURBINE_MODEL_POSITION: Vector3Tuple = [-12, 9, 10]
/**
 * World +Y up: positive rotation.y is CCW from above; clockwise 270° → -270°.
 * If it still looks unchanged, the mesh may be symmetric around Y — try -90 or +90 to verify.
 */
const TURBINE_MODEL_ROTATION_Y = MathUtils.degToRad(-270)

/**
 * Shift look-at from the model origin if the GLB’s geometry is offset from its pivot.
 * World space; added to `TURBINE_MODEL_POSITION` for `TURBINE_ORBIT_TARGET`.
 */
const TURBINE_ORBIT_CENTER_OFFSET: Vector3Tuple = [0, 0, 0]
/** OrbitControls look-at (world) — aim near your model; tweak if the mesh sits off the pivot. */
const TURBINE_ORBIT_TARGET: Vector3Tuple = vecAdd(TURBINE_MODEL_POSITION, TURBINE_ORBIT_CENTER_OFFSET)

/**
 * Fixed camera (world) for a consistent view on every load.
 * With `TURBINE_AUTO_FIT = false`, this position is used as-is (no auto-framing).
 */
// Baseline seed direction (Bounds will choose the correct distance).
const TURBINE_INITIAL_CAMERA: Vector3Tuple = [10, 22, 32]

/**
 * Uniform scale on the GLB (1 = file units). With `TURBINE_AUTO_FIT`, Bounds still frames the mesh.
 */
const TURBINE_MODEL_SCALE = 1

/**
 * When true, drei `Bounds` fits the camera to the model (fixes “can’t see” for huge GLBs).
 * Set false to use only `TURBINE_INITIAL_CAMERA` / `TURBINE_ORBIT_TARGET` / distance below.
 */
const TURBINE_AUTO_FIT = true

/** Set `true` to log `initialCameraPosition` / `orbitTarget` after each orbit end (unlock view). */
const TURBINE_DEBUG_LOG_ORBIT = false

/** Freeze orbit/zoom; set `false` while tuning or when `TURBINE_DEBUG_LOG_ORBIT` is on. */
const TURBINE_VIEW_LOCKED = true
/** Bounds padding; larger = farther / safer; start at viewer default. */
const TURBINE_FIT_MARGIN = 0.52

function format1Decimal(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--"
  }
  return Number(value).toFixed(1)
}

const STATUS_CONFIG = {
  connecting: { color: "bg-yellow-400", label: "連線中" },
  ok:         { color: "bg-green-400",  label: "即時" },
  error:      { color: "bg-red-500",    label: "連線失敗" },
};

export default function HomeScreen() {
  const { data, status } = useLiveTelemetry("/api/telemetry");
  const { color, label } = STATUS_CONFIG[status];
  const [, setTurbineScenePreset] =
    useState<TurbineScenePresetId>("default");

  /** `default` preset matches fixed camera (no localStorage). */
  const turbineCameraPresets = useMemo(
    (): Record<
      TurbineScenePresetId,
      { position: [number, number, number]; target: [number, number, number] }
    > => ({
      ...TURBINE_SCENE_PRESET_SEEDS,
      default: {
        position: TURBINE_INITIAL_CAMERA,
        target: TURBINE_ORBIT_TARGET,
      },
    }),
    []
  );

  const focusGaugeScene = useCallback((scene: TurbineGaugeScene) => {
    setTurbineScenePreset((prev) => (prev === scene ? "default" : scene));
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Floating NavBar */}
      <NavBar />

      {/* 連線狀態指示 */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
        <span className={`h-2 w-2 rounded-full ${color} ${status === "ok" ? "animate-pulse" : ""}`} />
        <span className="text-[11px] font-medium text-white/80">{label}</span>
      </div>

      {/* Horizontal scroll when viewport is narrower than fixed layout — layout does not shrink */}
      <div className="min-h-dvh overflow-x-auto overflow-y-auto bg-black text-white">
        <div className="p-6 flex flex-col gap-6 items-start shrink-0 w-max">
        {/* Title — logo from `frontend/public/aesmegalogo.png` */}
        <h1 className="m-0 flex items-center">
          <img
            src="/aesmegalogo.png"
            alt="AES Mega"
            className="h-11 w-auto max-w-[280px] object-contain object-left"
          />
        </h1>

        {/* Main layout: KPIs, then Valve + Power row and Noise | Temperature | Vibration row */}
        <div className="relative flex flex-col gap-4 items-start w-full max-w-full">
          {/* Active Power KPI + turbine generator gauges (same row, both 96px tall) */}
          <div className="flex flex-row flex-nowrap items-stretch gap-3">
            <KpiCard
              label="ACTIVE POWER"
              value={format1Decimal(data?.power_kw)} // display live data here
              unit="kW"
              icon={
                <img
                  src="/assets/icons/bolt.svg"
                  className="h-10 w-10"
                  alt="bolt"
                />
              }
            />
            <TurbineGeneratorGauges
              waterFlow={data?.discharge_cms}
              guideVanePct={data?.guideVanePct}
              genSpeedRpm={data?.genSpeedRpm}
              genSpeedPct={data?.genSpeedPct}
              onFocusScene={focusGaugeScene}
            />
          </div>

          {/* 3D sector: positioned to the right without affecting KPI layout */}
          <div className="pointer-events-none absolute left-[252px] top-[110px] z-[999]">
            <div className="pointer-events-auto relative h-[400px] w-[800px]">
              <TurbineViewerErrorBoundary
                modelUrl={TURBINE_GLB_URL}
                className="h-full w-full"
              >
                <ScadaGlbViewer
                  url={TURBINE_GLB_URL}
                  className="h-full w-full"
                  autoFit={TURBINE_AUTO_FIT}
                  scale={TURBINE_MODEL_SCALE}
                  cameraFov={50}
                  fitMargin={TURBINE_FIT_MARGIN}
                  initialCameraPosition={TURBINE_INITIAL_CAMERA}
                  orbitTarget={TURBINE_ORBIT_TARGET}
                  logViewAfterOrbit={TURBINE_DEBUG_LOG_ORBIT}
                  persistViewStorageKey="turbine-view"
                  persistLayoutKey={`pos:${TURBINE_MODEL_POSITION.join(",")};rotY:${TURBINE_MODEL_ROTATION_Y};scale:${TURBINE_MODEL_SCALE}`}
                  viewLocked={TURBINE_VIEW_LOCKED}
                  activeCameraPreset={null}
                  cameraPresets={turbineCameraPresets}
                  modelPosition={TURBINE_MODEL_POSITION}
                  modelRotationY={TURBINE_MODEL_ROTATION_Y}
                />
              </TurbineViewerErrorBoundary>
              <div
                className="pointer-events-none absolute inset-0 flex items-end justify-end p-4 select-none"
                aria-hidden
              >
                <img
                  src="/images/aesmegaweb.png"
                  alt=""
                  className="max-h-[36%] max-w-[62%] object-contain object-right object-bottom opacity-25 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <KpiCard
              label="ENERGY GENERATED"
              value={format1Decimal(data?.energy_kwh)} // display live data here
              unit="kWh"
              icon={
                <img
                  src="/assets/icons/active-power.svg"
                  className="h-10 w-10"
                  alt="Active Power"
                />
              }
            />
            <KpiCard
              label="DISCHARGE"
              value={format1Decimal(data?.discharge_cms)} // display live data here
              unit="cms"
              icon={
                <img
                  src="/assets/icons/water.svg"
                  className="h-10 w-10"
                  alt="water"
                />
              }
            />
          </div>
          <KpiCard
            label="CAPACITY FACTOR"
            value={format1Decimal(data?.capacity_factor)} // display live data here
            unit="%"
            icon={
              <img
                src="/assets/icons/charge.svg"
                className="h-10 w-10"
                alt="charge"
              />
            }
          />

          {/* Dashboard grid */}
          <div className="w-max shrink-0">
            {/* Col2: PressureDN900 + Water — title stacked above each card (justify-end) so titles sit on the bars. Col3: Generator power stacked the same way. Row3: Noise | Temp | Vib */}
            <div className="grid w-max grid-cols-[240px_max-content_max-content] grid-rows-[auto_auto_auto] gap-x-3 gap-y-1 items-stretch justify-items-stretch">
            <div className="row-span-2 row-start-1 col-start-1 self-start">
              <ValveStatusMap valves={data?.valves} />
            </div>

            <div className="row-span-2 row-start-1 col-start-2 flex h-full min-h-0 w-max flex-row flex-nowrap gap-3">
              <div className="flex h-full min-h-0 w-[240px] shrink-0 flex-col justify-end gap-3">
                <PressureDN900Title />
                <PressureDN900
                  hideTitle
                  pressureBefore={data?.pressureBeforeDn900}
                  pressureAfter={data?.pressureAfterDn900}
                />
              </div>
              <div className="flex h-full min-h-0 w-[240px] shrink-0 flex-col justify-end gap-3">
                <WaterQualityTestingTitle />
                <WaterQualityTesting
                  hideTitle
                  waterQualityIn={data?.waterQualityIn}
                  waterQualityOut={data?.waterQualityOut}
                />
              </div>
            </div>

            <div className="row-span-2 row-start-1 col-start-3 flex h-full min-h-0 w-full min-w-0 flex-col justify-end gap-3">
              <GeneratorPowerTitle />
              <GeneratorPower
                hideTitle
                apparentPowerS={data?.generatorApparentPowerS}
                activePowerP={data?.generatorActivePowerP}
                reactivePowerQ={data?.generatorReactivePowerQ}
              />
            </div>

            <div className="col-start-1 row-start-3">
              <NoiseMonitoring
                indoorNoise={data?.noiseIndoor}
                outdoorNoise={data?.noiseOutdoor}
              />
            </div>
            <div className="col-start-2 row-start-3">
              <TemperatureCard
                tempWindingU={data?.tempWindingU}
                tempWindingV={data?.tempWindingV}
                tempWindingW={data?.tempWindingW}
                tempControlPanel={data?.tempControlPanel}
                tempEnvironment={data?.tempEnvironment}
              />
            </div>
            <div className="col-start-3 row-start-3">
              <GeneratorVibration
                vibrationDE={data?.vibrationDE}
                vibrationNDE={data?.vibrationNDE}
              />
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

