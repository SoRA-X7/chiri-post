import { GPIOPort } from "node-web-gpio";

export const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

export const waitFor = (port: GPIOPort, value: 0 | 1): Promise<void> => {
  return new Promise((resolve) => {
    port.onchange = (e) => {
      if (e.value === value) {
        port.onchange = undefined;
        console.log("onchange detected");
        resolve();
      }
    };
  });
};
