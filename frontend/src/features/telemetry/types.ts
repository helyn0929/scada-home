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

  // 🔹 Filling valve feedbacks
  dn1400FillingInletOpen?: boolean;    // Bool 1.6
  dn1400FillingInletClosed?: boolean;  // Bool 1.7
  dn1400FillingOutletOpen?: boolean;   // Bool 2.6
  dn1400FillingOutletClosed?: boolean; // Bool 2.7
  dn900FillingValveOpen?: boolean;     // Bool 3.6
  dn900FillingValveClosed?: boolean;   // Bool 3.7

  // 🔹 Turbine gauge dials
  waterFlowCms?: number;   // 0–2.5 cms
  wicketGatePct?: number;  // 0–100 %
  genRpm?: number;         // rpm
  genSpeedPct?: number;    // %

  // 🔹 Pressure DN900
  pressureUpstreamDn900?: number;    // bar
  pressureDownstreamDn900?: number;  // bar

  // 🔹 Pressure DN1350
  pressureUpstreamDn1350?: number;   // bar
  pressureDownstreamDn1350?: number; // bar

  // 🔹 Oil in Water
  oilInWaterBeforeDn900?: number;   // ppm
  oilInWaterAfterDn1400d?: number;  // ppm

  // 🔹 Generator vibration
  vibrationDe?: number;   // mm/s
  vibrationNde?: number;  // mm/s

  // 🔹 Generator power (card: S, P, Q, P.F)
  generatorApparentPowerS?: number; // kVA, -2000..+2000
  generatorActivePowerP?: number;   // kW, -2000..+2000
  generatorReactivePowerQ?: number; // kvar, -2000..+2000

  // 🔹 Powerhouse alarms
  overpressureValveAlarm?: boolean;  // Bool 5.7
  upsAlarm?: boolean;                // Bool 5.3
  generalShutdownAlarm?: boolean;    // Bool 5.4

  // 🔹 HPU1
  hpu1Pressure?: number;      // bar
  hpu1MotorOn?: boolean;
  hpu1QsdValveOpen?: boolean;

  // 🔹 HPU2
  hpu2Pressure?: number;      // bar
  hpu2MotorOn?: boolean;
  hpu2Dn1400Open?: boolean;
}
