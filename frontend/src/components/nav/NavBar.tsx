import React from "react";

export default function NavBar() {

  const navItems = [
    { icon: "/assets/icons/homescreen.svg", label: "SCADA Home" },
    { icon: "/assets/icons/database.svg", label: "Dashboard" },
    { icon: "/assets/icons/alarm.svg", label: "Alarms" },
    { icon: "/assets/icons/device.svg", label: "Devices" },
    { icon: "/assets/icons/loginout.svg", label: "Logins" },
  ];

  // ⭐ 預留未來接 router / microfrontend / window.open
  const handleClick = (label: string) => {
    console.log(`Clicked: ${label}`);

    // ================================
    // TODO: 將來在這裡切換到同事的 SCADA 主系統
    // 例如：
    // window.location.href = "http://your-main-host/dashboard";
    // 或 React Router: navigate("/dashboard")
    // 或 microfrontend: eventBus.emit("open-dashboard")
    // ================================

  };

  return (
    // Floating NavBar container
    <div className="fixed top-12 right-12 bg-white/15 backdrop-blur-md rounded-full px-8 py-8 flex flex-col items-center space-y-10 transform origin-top-right scale-50">
      {navItems.map((item, index) => (
        <React.Fragment key={item.label}>

      {/* icon */}
      <img
        src={item.icon}
        alt={item.label}
        className="h-12 w-12 cursor-pointer hover:scale-110 transition"
        onClick={handleClick(item.label)}
      />


        </React.Fragment>
      ))}
    </div>
  );
}
