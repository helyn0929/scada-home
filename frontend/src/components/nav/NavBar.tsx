export default function NavBar() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 rounded-[14px] bg-[#D9D9D9]/20 px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] cursor-pointer hover:bg-[#D9D9D9]/30 transition-colors">
      <img src="/assets/icons/database.svg" alt="" className="h-5 w-5 opacity-80" />
      <span className="text-[10px] font-semibold leading-tight tracking-wide whitespace-nowrap text-white/70 text-center">
        即時數據 /<br />歷史查詢
      </span>
    </div>
  );
}
