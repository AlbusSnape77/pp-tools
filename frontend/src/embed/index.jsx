import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import EmbeddedToolCenter from "./EmbeddedToolCenter";
import "./embed.css";

const mountedControllers = new WeakMap();

export function mountToolCenter(container, initialOptions = {}) {
  if (!(container instanceof Element)) {
    throw new TypeError("A valid container element is required.");
  }

  mountedControllers.get(container)?.unmount();
  const root = createRoot(container);
  let options = { ...initialOptions };
  let active = true;

  const render = () => {
    flushSync(() => root.render(<EmbeddedToolCenter {...options} />));
  };

  const controller = {
    update(nextOptions = {}) {
      if (!active) return;
      options = { ...options, ...nextOptions };
      render();
    },
    unmount() {
      if (!active) return;
      active = false;
      flushSync(() => root.unmount());
      mountedControllers.delete(container);
    },
  };

  mountedControllers.set(container, controller);
  render();
  return controller;
}
