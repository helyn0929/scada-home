export interface ValveState {
  open: boolean;
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

  // 🔹 閥件
  valves?: Valves;
}
