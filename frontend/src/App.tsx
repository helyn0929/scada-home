import HomeScreen from "@/features/home/HomeScreen";
import { MobileGate } from "@/features/mobile/MobileShell";

export default function App() {
  // 手機寬度（< 768px）改由 MobileShell 顯示；其他情況維持桌面首頁
  return (
    <MobileGate>
      <HomeScreen />
    </MobileGate>
  );
}
