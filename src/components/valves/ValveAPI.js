//components

import { GTAOBlendShader } from "three/examples/jsm/Addons.js";
import { Controller } from "three/examples/jsm/libs/lil-gui.module.min.js";

export const ValveAPI = {

    // on/off status for all valves (dn800, dn900, dn1350, dn1400, dn1400D)
    binary(id, open, root) {
      const group =
        root instanceof Element
          ? root.querySelector(`#valve-${id}`)
          : document.getElementById(`valve-${id}`);
      if (!group) return;

      const isOpen = !!open;
      const color = isOpen ? "#06E2F4" : "#FE0C0C";

      // mark state on the valve group
      group.classList.toggle("open", isOpen);
      group.classList.toggle("closed", !isOpen);

      // disc: rotate and color (override child fills)
      const disc = group.querySelector(".valve-disc");
      if (disc) {
        // Some disks are drawn rotated in the SVG, so "open/closed" angles invert.
        const invertAngle = id === "dn800" || id === "dn1350";
        // default: open=0°, closed=90°
        // inverted: open=90°, closed=0°
        const openAngle = invertAngle ? 90 : 0;
        const closedAngle = invertAngle ? 0 : 90;
        const angle = isOpen ? openAngle : closedAngle;
        disc.style.transform = `rotate(${angle}deg)`;
        disc.style.transformOrigin = "50% 50%";

        try {
          disc.setAttribute("fill", color);
        } catch {}
        disc.style.fill = color;
        disc.querySelectorAll("*").forEach((el) => {
          try {
            el.setAttribute("fill", color);
          } catch {}
          el.style.fill = color;
        });
      }
    },

    //DN1350***future
    ControlDN1350(data, root) {
      if (!data) return;

        const group = root instanceof Element ? root.querySelector(`#valve-dn1350`) : document.getElementById("valve-dn1350");
        if (!group) return;
        const percent = Math.max(0, Math.min(100, Number(data.percent || 0)));

        //percent text
        const text = root instanceof Element ? root.querySelector(`#dn1350-text`) : document.getElementById("dn1350-text");
        if (text) {
            text.textContent = `${percent}%`;
        }
      },

    //flow visibility not includ interlock
    flow(id, active, root) {
      const flow = root instanceof Element ? root.querySelector(`#${id}`) : document.getElementById(id);
      if (!flow) return;

      const on = !!active;
      flow.classList.toggle("active", on);
      // show/hide the whole flow group so water "appears" or "disappears"
      flow.style.opacity = on ? "1" : "0";
    },
};
