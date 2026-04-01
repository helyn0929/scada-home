import KpiCard from "@/components/kpi/KpiCard"
import { useLiveTelemetry } from "../telemetry/useLiveTelemetry"
import NavBar from "@/components/nav/NavBar"
import ValveStatusMap from "@/components/valves/ValveStatusMap"
import NoiseMonitoring from "@/components/noise/NoiseMonitoring"
import TemperatureCard from "@/components/temperature/TemperatureCard"
import GeneratorVibration from "@/components/vibration/GeneratorVibration"
import GeneratorPower, { GeneratorPowerTitle } from "@/components/power/GeneratorPower"
import TurbineGeneratorGauges from "@/components/turbine/TurbineGeneratorGauges"
import PressureDN900, { PressureDN900Title } from "@/components/pressure/PressureDN900"
import WaterQualityTesting, {
  WaterQualityTestingTitle,
} from "@/components/water/WaterQualityTesting"

function format1Decimal(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--"
  }
  return Number(value).toFixed(1)
}

export default function HomeScreen() {
  const data = useLiveTelemetry("/api/telemetry");

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
        <div className="flex flex-col gap-4 items-start w-full max-w-full">
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
            <TurbineGeneratorGauges />
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

          {/* Col2: PressureDN900 + Water — title stacked above each card (justify-end) so titles sit on the bars. Col3: Generator power stacked the same way. Row3: Noise | Temp | Vib */}
          <div className="grid w-max shrink-0 grid-cols-[240px_max-content_max-content] grid-rows-[auto_auto_auto] gap-x-3 gap-y-1 items-stretch justify-items-stretch">
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
  );
}

