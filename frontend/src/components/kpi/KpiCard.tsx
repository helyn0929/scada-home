import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  icon?: ReactNode
  label: string
  value: string | number
  unit?: string
  className?: string
}

export default function KpiCard({ icon, label, value, unit, className = "" }: Props) {
  return (
    <Card className={`w-full h-[96px] rounded-[24px] border border-black bg-white/15 shadow-[0_4px_4px_rgba(0,0,0,0.25)] text-white ${className}`}>
      {/* FLEX ROW: icon + text side by side, aligned vertically center */}
      <CardContent className="h-full p-4 flex items-center gap-4">
        
        {/* ICON (fixed size, no shrink) */}
        <div
          className="flex items-center justify-center h-10 w-10 shrink-0"
          aria-hidden
        >
          {icon ?? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-400">
              <path d="M13 2L3 14h6v8l10-12h-6z" fill="currentColor" />
            </svg>
          )}
        </div>

        {/* TEXTS */}
        <div className="flex flex-col justify-center flex-1">
          <div className="font-[600] text-[14px] leading-[17px] text-white/90 whitespace-nowrap">
            {label}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-[600] text-[32px] leading-[38px] tracking-tight tabular-nums inline-block w-[96px] text-right">
              {typeof value === "number"
                ? new Intl.NumberFormat(undefined).format(value)
                : value}
            </div>
            {unit ? (
              <div className="text-[16px] leading-[19px] text-white/80">
                {unit}
              </div>
            ) : null}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

