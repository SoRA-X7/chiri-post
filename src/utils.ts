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

export type GPIOButton = {
  press: () => Promise<void>;
  longPress: () => Promise<void>;
};

export const button = async (port: GPIOPort): Promise<GPIOButton> => {
  async function press(time: number) {
    port.write(1);
    await sleep(time);
    port.write(0);
  }

  await port.export("out");
  await port.write(0);

  return {
    press: () => press(100),
    longPress: () => press(3000),
  };
};
