# Copilot Instructions for SCADA Home

## Project Overview
**SCADA Home** is a React + TypeScript + Vite real-time monitoring dashboard for a hydroelectric facility (AES Mega). It displays live telemetry data (power, energy, water discharge) and valve status visualization using SVG-based components.

## Architecture Patterns

### Data Flow Architecture
- **Single source of truth**: `useLiveTelemetry` hook ([src/features/telemetry/useLiveTelemetry.ts](src/features/telemetry/useLiveTelemetry.ts)) fetches from `/api/telemetry` or generates mock data
- **Environment-driven behavior**: Uses `VITE_MOCK`, `VITE_API_URL`, `VITE_TELEMETRY_POLL_INTERVAL_MS` for configuration
- **Data shape**: All telemetry flows through [TelemetryData interface](src/features/telemetry/types.ts) with power/energy (kW/kWh), water discharge (cms), and valve states
- **Polling pattern**: Uses `setInterval` (default 1000ms) to fetch fresh telemetry—passed directly to components without state management

### Component Structure
- **Feature modules** ([src/features/](src/features/)) contain domain logic: `home/` (main layout), `telemetry/` (data fetching)
- **Reusable components** ([src/components/](src/components/)) organized by domain: `kpi/` (metric cards), `valves/` (SVG visualization), `nav/`, `ui/` (primitives)
- **Page container**: [HomeScreen.tsx](src/features/home/HomeScreen.tsx) orchestrates the dashboard—uses `useLiveTelemetry` hook and passes data to `KpiCard` and `ValveStatusMap`

### SVG Valve Visualization Pattern
- **Raw SVG import**: [valvestatusmap.svg](src/assets/icons/valvestatusmap.svg) imported as `?raw` string
- **SvgRenderer component**: Injects raw SVG into DOM via `innerHTML` and provides insertion callback
- **ValveAPI** ([src/components/valves/ValveAPI.js](src/components/valves/ValveAPI.js)): Imperative DOM manipulation API
  - `binary(id, open, root)`: Toggles SVG group classes (`open`/`closed`), rotates disc 0°/270°, changes body fill (#06E2F4 open / #FE0C0C closed)
  - `ControlDN1350(data, root)`: Handles variable aperture valve (percent: 0–100%)
- **ValveStatusMap component**: Queries inserted SVG and calls `ValveAPI` methods on every `valves` prop change

## Build & Development

### Commands
```bash
npm run dev        # Vite HMR on localhost:5173
npm run build      # tsc -b && vite build (outputs dist/)
npm run lint       # ESLint validation
npm run preview    # Serve production build locally
```

### Path Resolution
- Alias `@` resolves to `src/` ([vite.config.ts](vite.config.ts))
- Use `@/features/...`, `@/components/...` in all imports

### Styling
- **Tailwind CSS v4** with vite plugin ([tailwind.config.js](tailwind.config.js))
- **Design tokens** ([src/design-tokens/tokens.json](src/design-tokens/tokens.json)): Custom colors (`brandSubtitle` #346ADE) and typography
- **Component library**: [shadcn/ui](src/components/ui/card.tsx) Card primitive
- **CSS modules**: Valve-specific styles in [valveStyles.css](src/components/valves/valveStyles.css)

## Key Conventions

### Environment Variables (`.env`)
```
VITE_MOCK=0              # Set to "1" to use mock data instead of API
VITE_API_URL=/api/telemetry  # Endpoint for telemetry polling
VITE_TELEMETRY_POLL_INTERVAL_MS=1000  # Poll frequency in milliseconds
```
Mock mode cycles valve states per second and generates random power/water values.

### Telemetry Data Type
All numeric values are optional (use `??` fallback). Valve states:
```typescript
dn800, dn900, dn1400, dn1400D: { open: boolean }
dn1350: { open: boolean; percent?: number }  // Variable aperture (0-100%)
```

### SVG Element Naming Convention
All SVG elements must follow `valve-{id}` ID pattern (e.g., `#valve-dn800`, `#valve-dn1350`). Child elements use class names: `.valve-body` (fill color), `.valve-disc` (rotation target).

### Color Scheme
- **Open valves**: `#06E2F4` (cyan)
- **Closed valves**: `#FE0C0C` (red)
- **Backgrounds**: Black (`bg-black`), white overlays with opacity (`bg-white/15`)

## Dependency Notes
- **React Router**: Ready for multi-page routing (not currently used beyond `BrowserRouter` wrapper)
- **Three.js + React Three Fiber**: Imported but unused—available for 3D valve visualizations
- **TypeScript strict**: ESLint + TSC enforce type safety

## Common Workflows
1. **Add new KPI card**: Create in [HomeScreen.tsx](src/features/home/HomeScreen.tsx), use `KpiCard` component with data from `useLiveTelemetry`
2. **Modify valve appearance**: Update `ValveAPI` methods or valve SVG classes in [valveStyles.css](src/components/valves/valveStyles.css)
3. **Add API endpoint**: Update `VITE_API_URL` env variable or modify `useLiveTelemetry` fetch logic
4. **Use mock data locally**: Set `VITE_MOCK=1` to test without live API
