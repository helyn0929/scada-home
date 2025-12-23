import KpiCard from "@/components/kpi/KpiCard"
import { useLiveTelemetry } from "../telemetry/useLiveTelemetry"
import NavBar from "@/components/nav/NavBar"
import ValveStatusMap from "@/components/valves/ValveStatusMap"


export default function HomeScreen() {
  const data = useLiveTelemetry("/api/telemetry");

  return (
    <div className="relative min-h-screen bg-black text-white">

     {/* Floating NavBar */}
      <NavBar />

    <div className="min-h-dvh w-dvw bg-black text-white p-6 flex flex-col items-start gap-6">
      
      {/* Title */}
      <h1 className="text-4xl font-bold">
        <span className="text-blue-500">AES</span>{" "}
        <span className="text-red-500">Mega</span>
      </h1>

      {/* KPI Cards */}
      <div className="flex flex-col gap-4">
        <KpiCard
          label="ACTIVE POWER"
          value={data?.power_kw ?? '--'}             //display live data here
          unit="kW"
          icon={
            <img
              src="/assets/icons/bolt.svg"
              className="h-12 w-12"
              alt="bolt"
            />
          }
        />
        <KpiCard
          label="ENERGY GENERATED"
          value={data?.energy_kwh ?? '--'}          //display live data here
          unit="kWh"
          icon={
            <img
              src="/assets/icons/active-power.svg"
              className="h-12 w-12"
              alt="Active Power"
            />
          }
        />
        <KpiCard
          label="DISCHARGE"
          value={data?.discharge_cms ?? '--'}          //display live data here
          unit="cms"
          icon={
            <img
              src="/assets/icons/water.svg"
              className="h-12 w-12"
              alt="water"
            />
          }
        />
        <KpiCard
          label="CAPACITY FACTOR"
          value={data?.capacity_factor ?? '--'}          //display live data here
          unit="%"
          icon={
            <img
              src="/assets/icons/charge.svg"
              className="h-12 w-12"
              alt="charge"
            />
          }
        />
            {/* ✅ Valve Status Map */}
        <ValveStatusMap valves={data?.valves} />

         </div>
       </div>
    
     </div>       
  );
} 


