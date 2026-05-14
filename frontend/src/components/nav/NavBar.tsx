export default function NavBar() {
  const HISTORY_URL = import.meta.env.VITE_HISTORY_URL ?? "http://localhost:8050";

  return (
    <div className="h-full flex items-stretch">
      <div
        onClick={() => window.open(HISTORY_URL, "_blank")}
        className="bg-white/15 backdrop-blur-md rounded-2xl px-5 py-2 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/25 transition"
      >
        <img
          src="/assets/icons/database.svg"
          alt="歷史查詢"
          className="h-7 w-7"
        />
        <span className="text-white text-xs font-semibold tracking-wide whitespace-nowrap">
          即時數據/歷史查詢
        </span>
      </div>
    </div>
  );
}
