import { requestI2CAccess } from "node-web-i2c";
import { GPIOPort, requestGPIOAccess } from "node-web-gpio";
import PCA9685 from "@chirimen/pca9685";
import { sleep, waitFor } from "./utils";

const PWM_MIN = 0.95e-3;
const PWM_MAX = 2.1e-3;

const SPEED = 20;

main();

async function main() {
  console.log("Initializing...");

  const i2cAccess = await requestI2CAccess();
  const pca9685 = new PCA9685(i2cAccess.ports.get(1)!, 0x40);
  await pca9685.init(PWM_MIN, PWM_MAX, 100);

  const gpioAccess = await requestGPIOAccess();
  const irObstacle = gpioAccess.ports.get(17)!;
  await irObstacle.export("in");

  console.log("Ready");

  for (;;) {
    // Wait for paper insert
    await waitFor(irObstacle, 0);

    // Start scan
    pca9685.setServo(0, SPEED);
    await sleep(5000);
    pca9685.setServo(0, 0);
  }
}
