export default function NavBar() {
  const HISTORY_URL = import.meta.env.VITE_HISTORY_URL ?? "http://localhost:8050";

  return (
    <div className="fixed top-12 right-12">
      <div className="relative group">
        <div
          onClick={() => window.open(HISTORY_URL, "_blank")}
          className="bg-white/15 backdrop-blur-md rounded-2xl px-5 py-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white/25 transition"
        >
          <img
            src="/assets/icons/database.svg"
            alt="歷史查詢"
            className="h-8 w-8"
          />
          <span className="text-white text-sm font-semibold tracking-wide">
            即時數據/歷史查詢
          </span>
        </div>
      </div>
    </div>
  );
}
