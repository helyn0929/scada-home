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
  type HealthLevel,
} from "@/components/turbine/TurbineGeneratorGauges"
import PressureDN900, { PressureDN900Title } from "@/components/pressure/PressureDN900"
import WaterQualityTesting, {
  WaterQualityTestingTitle,
} from "@/components/water/WaterQualityTesting"
import HpuStatus, { HpuStatusTitle } from "@/components/hpu/HpuStatus"
import PowerhouseStatusPanel from "@/components/powerhouse/PowerhouseStatusPanel"
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

const TURBINE_MODEL_POSITION: Vector3Tuple = [-12, 9, 10]
const TURBINE_MODEL_ROTATION_Y = MathUtils.degToRad(-270)
const TURBINE_ORBIT_CENTER_OFFSET: Vector3Tuple = [0, 0, 0]
const TURBINE_ORBIT_TARGET: Vector3Tuple = vecAdd(TURBINE_MODEL_POSITION, TURBINE_ORBIT_CENTER_OFFSET)
const TURBINE_INITIAL_CAMERA: Vector3Tuple = [-15.7978, 11.6872, 10.8027]
const TURBINE_MODEL_SCALE = 1
const TURBINE_AUTO_FIT = false
const TURBINE_DEBUG_LOG_ORBIT = false
const TURBINE_VIEW_LOCKED = true
const TURBINE_FIT_MARGIN = 0.75

function format1Decimal(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--"
  return Number(value).toFixed(1)
}

function format3Decimal(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--"
  return Number(value).toFixed(3)
}

const STATUS_CONFIG = {
  connecting: { color: "bg-yellow-400", label: "連線中" },
  ok:         { color: "bg-green-400",  label: "即時" },
  error:      { color: "bg-red-500",    label: "連線失敗" },
}

type PowerhouseHealth = { hydraulic: HealthLevel; electrical: HealthLevel; environment: HealthLevel }
const INITIAL_HEALTH: PowerhouseHealth = { hydraulic: "unknown", electrical: "unknown", environment: "unknown" }

export default function HomeScreen() {
  const { data, status, lastUpdated } = useLiveTelemetry("/api/telemetry")
  const { color, label } = STATUS_CONFIG[status]
  const [turbineScenePreset, setTurbineScenePreset] =
    useState<TurbineScenePresetId>("default")
  const [powerhouseHealth, setPowerhouseHealth] = useState<PowerhouseHealth>(INITIAL_HEALTH)

  const handleHealthChange = useCallback(
    (hydraulic: HealthLevel, electrical: HealthLevel, environment: HealthLevel) => {
      setPowerhouseHealth((prev) =>
        prev.hydraulic === hydraulic && prev.electrical === electrical && prev.environment === environment
          ? prev
          : { hydraulic, electrical, environment }
      )
    },
    []
  )

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
  )

  const focusGaugeScene = useCallback((scene: TurbineGaugeScene) => {
    setTurbineScenePreset((prev) => (prev === scene ? "default" : scene))
  }, [])

  return (
    <div className="h-dvh w-full overflow-hidden bg-black text-white flex flex-col">
      <div className="flex flex-1 min-h-0 flex-col gap-3 p-4">

        {/* Logo */}
        <h1 className="m-0 shrink-0 flex items-center">
          <img
            src="/aesmegalogo.png"
            alt="AES Mega"
            className="h-11 w-auto max-w-[280px] object-contain object-left"
          />
        </h1>

        {/* Main row: left KPI column + right grid */}
        <div className="flex flex-1 min-h-0 gap-3">

          {/* Left column: KPIs + valve map at bottom */}
          <div className="flex w-[240px] shrink-0 flex-col gap-3">
            <KpiCard
              label="ACTIVE POWER"
              value={format1Decimal(data?.power_kw)}
              unit="kW"
              icon={<img src="/assets/icons/bolt.svg" className="h-10 w-10" alt="bolt" />}
            />
            <KpiCard
              label="ENERGY GENERATED"
              value={format3Decimal(data?.energy_kwh)}
              unit={data?.energy_unit ?? "kWh"}
              icon={<img src="/assets/icons/active-power.svg" className="h-10 w-10" alt="energy" />}
            />
            <KpiCard
              label="DISCHARGE"
              value={format3Decimal(data?.discharge_cms)}
              unit="cms"
              icon={<img src="/assets/icons/water.svg" className="h-10 w-10" alt="water" />}
            />
            <KpiCard
              label="CAPACITY FACTOR"
              value={format1Decimal(data?.capacity_factor)}
              unit="%"
              icon={<img src="/assets/icons/charge.svg" className="h-10 w-10" alt="charge" />}
            />
            <div className="flex-1 min-h-0">
              <ValveStatusMap
                className="h-full"
                valves={data?.valves}
                dn1400FillingInletOpen={data?.dn1400FillingInletOpen}
                dn1400FillingOutletOpen={data?.dn1400FillingOutletOpen}
                dn900FillingValveOpen={data?.dn900FillingValveOpen}
              />
            </div>
          </div>

          {/*
            Right section — CSS grid (matches helyn structure):
              col 1: dials width
              col 2: 1fr (3D model area / cards area)
              col 3: NavBar / StatusBar column
            row 1: dials height
            row 2: 1fr (3D model)
            row 3: bottom cards (cols 1-2) + StatusBar (col 3)
          */}
          <div
            className="flex-1 min-w-0 min-h-0"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gridTemplateRows: "auto 1fr auto",
              gap: "12px",
            }}
          >
            {/* Dials — top-left cell */}
            <div style={{ gridColumn: 1, gridRow: 1 }}>
              <TurbineGeneratorGauges
                waterFlow={data?.discharge_cms}
                guideVanePct={data?.guideVanePct}
                genSpeedRpm={data?.genSpeedRpm}
                genSpeedPct={data?.genSpeedPct}
                onFocusScene={focusGaugeScene}
                onHealthChange={handleHealthChange}
                telemetry={{
                  tempWindingU: data?.tempWindingU,
                  tempWindingV: data?.tempWindingV,
                  tempWindingW: data?.tempWindingW,
                  noiseIndoor: data?.noiseIndoor,
                  noiseOutdoor: data?.noiseOutdoor,
                  tempControlPanel: data?.tempControlPanel,
                  tempEnvironment: data?.tempEnvironment,
                }}
              />
            </div>

            {/* PowerhouseStatusPanel — col 2 row 1, same height as dials */}
            <div style={{ gridColumn: 2, gridRow: 1 }} className="flex flex-col min-h-0">
              <PowerhouseStatusPanel
                hydraulic={powerhouseHealth.hydraulic}
                electrical={powerhouseHealth.electrical}
                environment={powerhouseHealth.environment}
                overpressureAlarm={data?.overpressureValveAlarm}
                upsAlarm={data?.upsAlarm}
                generalShutdownAlarm={data?.generalShutdownAlarm}
                className="flex-1 min-h-0"
              />
            </div>

            {/* NavBar — col 3 row 1, top-right */}
            <div style={{ gridColumn: 3, gridRow: 1 }} className="flex flex-col min-h-0">
              <NavBar />
            </div>

            {/* 3D model — cols 1-2 row 2 */}
            <div
              className="relative min-h-0 overflow-hidden rounded-[20px]"
              style={{ gridColumn: "1 / 3", gridRow: 2 }}
            >
              <TurbineViewerErrorBoundary modelUrl={TURBINE_GLB_URL} className="h-full w-full">
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
                  persistLayoutKey={`v3;pos:${TURBINE_MODEL_POSITION.join(",")};rotY:${TURBINE_MODEL_ROTATION_Y};scale:${TURBINE_MODEL_SCALE};fit:${TURBINE_FIT_MARGIN};fov:50`}
                  viewLocked={TURBINE_VIEW_LOCKED}
                  activeCameraPreset={turbineScenePreset}
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
                  className="max-h-[36%] max-w-[40%] object-contain opacity-25 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>

            {/* Bottom cards — cols 1-2 row 3 */}
            <div
              className="flex flex-col gap-1 min-w-0"
              style={{ gridColumn: "1 / 3", gridRow: 3 }}
            >
              {/* Top sub-row: Pressure | Water | HPU1 | HPU2 | GeneratorPower */}
              <div className="flex flex-row gap-3">
                <div className="flex flex-1 min-w-0 flex-col justify-end gap-3">
                  <PressureDN900Title />
                  <PressureDN900
                    hideTitle
                    pressureBefore={data?.pressureBeforeDn900}
                    pressureAfter={data?.pressureAfterDn900}
                  />
                </div>
                <div className="flex flex-1 min-w-0 flex-col justify-end gap-3">
                  <WaterQualityTestingTitle />
                  <WaterQualityTesting
                    hideTitle
                    waterQualityIn={data?.waterQualityIn}
                    waterQualityOut={data?.waterQualityOut}
                  />
                </div>
                <div className="flex flex-[0.65] min-w-0 flex-col justify-end gap-3">
                  <HpuStatusTitle name="HPU1" />
                  <HpuStatus
                    unit={1}
                    hideTitle
                    pressure={data?.hpu1Pressure}
                    motorOn={data?.hpu1MotorOn}
                    valveOpen={data?.hpu1QsdValveOpen}
                  />
                </div>
                <div className="flex flex-[0.65] min-w-0 flex-col justify-end gap-3">
                  <HpuStatusTitle name="HPU2" />
                  <HpuStatus
                    unit={2}
                    hideTitle
                    pressure={data?.hpu2Pressure}
                    motorOn={data?.hpu2MotorOn}
                    valveOpen={data?.hpu2Dn1400Open}
                  />
                </div>
                <div className="flex flex-[1.4] min-w-0 flex-col justify-end gap-3">
                  <GeneratorPowerTitle />
                  <GeneratorPower
                    hideTitle
                    apparentPowerS={data?.generatorApparentPowerS}
                    activePowerP={data?.generatorActivePowerP}
                    reactivePowerQ={data?.generatorReactivePowerQ}
                  />
                </div>
              </div>
              {/* Bottom sub-row: Noise | Temperature | Vibration */}
              <div className="flex flex-row gap-3">
                <NoiseMonitoring
                  className="flex-1 min-w-0"
                  indoorNoise={data?.noiseIndoor}
                  outdoorNoise={data?.noiseOutdoor}
                />
                <TemperatureCard
                  className="flex-[2] min-w-0"
                  tempWindingU={data?.tempWindingU}
                  tempWindingV={data?.tempWindingV}
                  tempWindingW={data?.tempWindingW}
                  tempControlPanel={data?.tempControlPanel}
                  tempEnvironment={data?.tempEnvironment}
                />
                <GeneratorVibration
                  className="flex-1 min-w-0"
                  vibrationDE={data?.vibrationDE}
                  vibrationNDE={data?.vibrationNDE}
                />
              </div>
            </div>

            {/* StatusBar — col 3 row 3, aligned to bottom */}
            <div style={{ gridColumn: 3, gridRow: 3, alignSelf: "end" }}>
              <div className="flex items-center gap-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/10 px-4 py-2 shadow-lg">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color} ${status === "ok" ? "animate-pulse" : ""}`} />
                <span className="text-[12px] font-semibold text-white leading-none">{label}</span>
                {lastUpdated && (
                  <span className="text-[12px] font-medium text-white/70 tabular-nums leading-none">
                    {lastUpdated.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
