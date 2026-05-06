// Background timer worker — survives tab blur / JS engine throttling
let timerId = null;

self.onmessage = function (e) {
  if (e.data.type === "START") {
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(() => self.postMessage({ type: "TICK" }), 1000);
  } else if (e.data.type === "STOP") {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
