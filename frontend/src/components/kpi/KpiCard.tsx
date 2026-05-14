import { ReactNode } from "react"

type Props = {
  icon?: ReactNode
  label: string
  value: string | number
  unit?: string
}

export default function KpiCard({ icon, label, value, unit }: Props) {
  return (
    <div className="w-[240px] h-[96px] rounded-[24px] border border-black bg-white/15 shadow-[0_4px_4px_rgba(0,0,0,0.25)] text-white flex items-center justify-start gap-4 px-4">

      {/* Icon */}
      <div className="flex items-center justify-center h-10 w-10 shrink-0" aria-hidden>
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-400">
            <path d="M13 2L3 14h6v8l10-12h-6z" fill="currentColor" />
          </svg>
        )}
      </div>

      {/* Label + value */}
      <div className="flex flex-col items-center justify-center">
        <div className="text-[13px] font-semibold leading-none text-white/80 whitespace-nowrap text-center">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <div className="font-[700] text-[28px] leading-none tracking-tight tabular-nums">
            {typeof value === "number"
              ? new Intl.NumberFormat(undefined).format(value)
              : value}
          </div>
          {unit ? (
            <div className="text-[15px] leading-none text-white/80">{unit}</div>
          ) : null}
        </div>
      </div>

    </div>
  )
}
