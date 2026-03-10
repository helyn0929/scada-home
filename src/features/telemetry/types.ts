export interface ValveState {
  open: boolean;
  percent?: number;
}

export interface Valves {
  dn800?: ValveState;
  dn900?: ValveState;
  dn1350?: ValveState;
  dn1400?: ValveState;
  dn1400D?: ValveState;
}

export interface TelemetryData {
  // 🔹 發電相關
  power_kw?: number;
  energy_kwh?: number;
  capacity_factor?: number;

  // 🔹 水文
  discharge_cms?: number;

  // 🔹 噪音
  noiseIndoor?: number;
  noiseOutdoor?: number;

  // 🔹 溫度
  tempWindingU?: number;
  tempWindingV?: number;
  tempWindingW?: number;
  tempControlPanel?: number;
  tempEnvironment?: number;

  // 🔹 閥件
  valves?: Valves;

  // 🔹 Generator power (card: S, P, Q, P.F)
  generatorApparentPowerS?: number; // kVA, -2000..+2000
  generatorActivePowerP?: number;   // kW, -2000..+2000
  generatorReactivePowerQ?: number; // kvar, -2000..+2000
}
