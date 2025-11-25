import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  icon?: ReactNode
  label: string
  value: string | number
  unit?: string
}

export default function KpiCard({ icon, label, value, unit }: Props) {
  return (
    <Card className="w-[270px] h-[106px] rounded-[28px] border border-black bg-white/15 shadow-[0_4px_4px_rgba(0,0,0,0.25)] text-white">
      {/* FLEX ROW: icon + text side by side, aligned vertically center */}
      <CardContent className="h-full p-4 flex items-center gap-4">
        
        {/* ICON */}
        <div className="flex items-center justify-center h-10 w-10" aria-hidden>
          {icon ?? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-400">
              <path d="M13 2L3 14h6v8l10-12h-6z" fill="currentColor" />
            </svg>
          )}
        </div>

        {/* TEXTS */}
        <div className="flex flex-col justify-center">
          <div className="font-[600] text-[16px] leading-[19px] text-white/90">
            {label}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-[600] text-[40px] leading-[48px] tracking-tight tabular-nums">
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

