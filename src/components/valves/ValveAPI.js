//components

import { GTAOBlendShader } from "three/examples/jsm/Addons.js";
import { Controller } from "three/examples/jsm/libs/lil-gui.module.min.js";

export const ValveAPI = {

    //on off status
    binary(id, open, root) {
      const group = root instanceof Element ? root.querySelector(`#valve-${id}`) : document.getElementById(`valve-${id}`);
        if (!group) return;

        group.classList.toggle("open", !!open);
        group.classList.toggle("closed", !open);

        const body = group.querySelector(".valve-body");
        if (body) {
          body.setAttribute("fill", open ? "#06E2F4" : "#FE0C0C");
        }
    },

    //DN1350***future
    ControlDN1350(data, root) {
      if (!data) return;

        const group = root instanceof Element ? root.querySelector(`#valve-dn1350`) : document.getElementById("valve-dn1350");
        if (!group) return;
        const percent = Math.max(0, Math.min(100, Number(data.percent || 0)));

        //body color 0% = red, >0% = blue
        const body = group.querySelector(".valve-body");
        if (body) {
            body.setAttribute("fill", percent > 0 ? "#06E2F4" : "#FE0C0C");
        }
        //disc rotation based on percent open
        const disc = group.querySelector(".valve-disc");
        if (disc) {
          const rotation = (percent / 100) * 90;
          disc.style.transform = `rotate(${rotation}deg)`;
        }

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

      flow.classList.toggle("active", !!active);
    },
};
