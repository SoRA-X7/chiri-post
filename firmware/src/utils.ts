import { GPIOPort } from "node-web-gpio";

export const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

export const waitFor = (port: GPIOPort, value: 0 | 1): Promise<void> => {
  return new Promise((resolve) => {
    port.onchange = (e: any) => {
      if (e.value === value) {
        port.onchange = undefined;
        console.log("onchange detected");
        resolve();
      }
    };
  });
};

export type GPIOButton = {
  press: () => Promise<void>;
  longPress: () => Promise<void>;
};

export const button = async (
  port: GPIOPort,
  inverted = false
): Promise<GPIOButton> => {
  const on = inverted ? 0 : 1;
  const off = inverted ? 1 : 0;

  async function press(time: number) {
    port.write(on);
    await sleep(time);
    port.write(off);
  }

  await port.export("out");
  await port.write(off);

  return {
    press: () => press(100),
    longPress: () => press(3000),
  };
};
