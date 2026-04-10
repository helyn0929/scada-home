import { useCallback, useState } from "react"
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
import {
  TURBINE_SCENE_PRESET_SEEDS,
  type TurbineScenePresetId,
} from "@/components/three/turbineScenePresets"
import { MathUtils } from "three"

/**
 * Defaults when no saved view exists. After you orbit once with `persistViewStorageKey` set,
 * the browser stores position + target in localStorage and uses them on reload (overrides these).
 * Set `logViewAfterOrbit` on `<ScadaGlbViewer />` to print values to paste here if you want them in git.
 */
const TURBINE_INITIAL_CAMERA: [number, number, number] = [-5, 1.12, 2.05]
const TURBINE_ORBIT_TARGET: [number, number, number] = [0, 0, 0]
const TURBINE_VIEW_STORAGE_KEY = "scada-home-turbine-camera"

function readSavedTurbineViewForPresets():
  | { position: [number, number, number]; target: [number, number, number] }
  | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(TURBINE_VIEW_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { position?: unknown; target?: unknown }
    const p = o.position
    const t = o.target
    if (!Array.isArray(p) || !Array.isArray(t) || p.length !== 3 || t.length !== 3) {
      return null
    }
    const position: [number, number, number] = [
      Number(p[0]),
      Number(p[1]),
      Number(p[2]),
    ]
    const target: [number, number, number] = [
      Number(t[0]),
      Number(t[1]),
      Number(t[2]),
    ]
    if (position.some((n) => !Number.isFinite(n)) || target.some((n) => !Number.isFinite(n))) {
      return null
    }
    return { position, target }
  } catch {
    return null
  }
}

/** Merged camera views for gauge-driven presets; `default` prefers saved localStorage view. */
const TURBINE_CAMERA_PRESETS: Record<
  TurbineScenePresetId,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  ...TURBINE_SCENE_PRESET_SEEDS,
  default:
    readSavedTurbineViewForPresets() ?? {
      position: TURBINE_INITIAL_CAMERA,
      target: TURBINE_ORBIT_TARGET,
    },
}

/** Set `true` when the camera angle is final — disables mouse orbit and zoom on the 3D viewer. */
const TURBINE_VIEW_LOCKED = true
/**
 * World +Y up: positive rotation.y is CCW from above; clockwise 270° → -270°.
 * If it still looks unchanged, the mesh may be symmetric around Y — try -90 or +90 to verify.
 */
const TURBINE_MODEL_ROTATION_Y = MathUtils.degToRad(-270)
/** Bounds padding; smaller = camera closer / model larger in the frame. */
const TURBINE_FIT_MARGIN = 0.22

function format1Decimal(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--"
  }
  return Number(value).toFixed(1)
}

export default function HomeScreen() {
  const data = useLiveTelemetry("/api/telemetry");
  const [turbineScenePreset, setTurbineScenePreset] =
    useState<TurbineScenePresetId>("default");

  const focusGaugeScene = useCallback((scene: TurbineGaugeScene) => {
    setTurbineScenePreset((prev) => (prev === scene ? "default" : scene));
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Floating NavBar */}
      <NavBar />

      {/* Horizontal scroll when viewport is narrower than fixed layout — layout does not shrink */}
      <div className="min-h-dvh overflow-x-auto overflow-y-auto bg-black text-white">
        <div className="p-6 flex flex-col gap-6 items-start shrink-0 w-max">
        {/* Title */}
        <h1 className="text-4xl font-bold">
          <span className="text-blue-500">AES</span>{" "}
          <span className="text-red-500">Mega</span>
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
            <TurbineGeneratorGauges onFocusScene={focusGaugeScene} />
          </div>

          {/* 3D sector: positioned to the right without affecting KPI layout */}
          <div className="pointer-events-none absolute left-[252px] top-[110px] z-[999]">
            <div className="pointer-events-auto">
              <ScadaGlbViewer
                url="/assets/models/hushanturbine.glb"
                className="h-[400px] w-[800px]"
                autoFit
                fitMargin={TURBINE_FIT_MARGIN}
                initialCameraPosition={TURBINE_INITIAL_CAMERA}
                orbitTarget={TURBINE_ORBIT_TARGET}
                persistViewStorageKey={TURBINE_VIEW_STORAGE_KEY}
                viewLocked={TURBINE_VIEW_LOCKED}
                activeCameraPreset={turbineScenePreset}
                cameraPresets={TURBINE_CAMERA_PRESETS}
                modelPosition={[0, 0, 6]}
                modelRotationY={TURBINE_MODEL_ROTATION_Y}
              />
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
                <PressureDN900 hideTitle />
              </div>
              <div className="flex h-full min-h-0 w-[240px] shrink-0 flex-col justify-end gap-3">
                <WaterQualityTestingTitle />
                <WaterQualityTesting hideTitle />
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
              <GeneratorVibration />
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

