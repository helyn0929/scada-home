import KpiCard from "@/components/kpi/KpiCard"

export default function HomeScreen() {
  return (
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
          value={1352}
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
          value={350}
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
          value={23}
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
          value={"92.3"}
          unit="%"
          icon={
            <img
              src="/assets/icons/charge.svg"
              className="h-12 w-12"
              alt="charge"
            />
          }
        />
      </div>
    </div>
  )
}

