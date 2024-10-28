import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";
import PCA9685 from "@chirimen/pca9685";

const min = 0.9e-3;
const max = 2.1e-3;

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

main();

async function main() {
  const i2cAccess = await requestI2CAccess();
  const port = i2cAccess.ports.get(1);
  const pca9685 = new PCA9685(port, 0x40);
  // servo setting for ft90r
  // Servo PWM pulse: min=0.0009[sec], max=0.0021[sec] angle=+-100[%]
  await pca9685.init(min, max, 100);
  for (;;) {
    await pca9685.setServo(0, -5);
    console.log("-5%");
    await sleep(1000);
    await pca9685.setServo(0, 100);
    console.log("100%");
    await sleep(1000);
    await pca9685.setServo(0, 0);
    console.log("0%");
    await sleep(1000);
  }
}
