import KpiCard from "@/components/kpi/KpiCard"
import { useLiveTelemetry } from "../telemetry/useLiveTelemetry"
import NavBar from "@/components/nav/NavBar"
import ValveStatusMap from "@/components/valves/ValveStatusMap"
import NoiseMonitoring from "@/components/noise/NoiseMonitoring"
import TemperatureCard from "@/components/temperature/TemperatureCard"
import GeneratorVibration from "@/components/vibration/GeneratorVibration"
import GeneratorPower from "@/components/power/GeneratorPower"

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
          {/* KPI cards stack */}
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

          {/* Row 1: Valve | spacer | Power. Row 2: Noise | Temperature | Vibration — content-sized columns (stable layout, less empty space). */}
          <div className="grid w-max shrink-0 gap-3 grid-cols-[240px_max-content_max-content] items-stretch justify-items-stretch">
            <ValveStatusMap valves={data?.valves} />
            <div />
            <GeneratorPower
              apparentPowerS={data?.generatorApparentPowerS}
              activePowerP={data?.generatorActivePowerP}
              reactivePowerQ={data?.generatorReactivePowerQ}
            />

            <NoiseMonitoring
              indoorNoise={data?.noiseIndoor}
              outdoorNoise={data?.noiseOutdoor}
            />
            <TemperatureCard
              tempWindingU={data?.tempWindingU}
              tempWindingV={data?.tempWindingV}
              tempWindingW={data?.tempWindingW}
              tempControlPanel={data?.tempControlPanel}
              tempEnvironment={data?.tempEnvironment}
            />
            <GeneratorVibration />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

