import { GPIOPort, requestGPIOAccess } from "node-web-gpio";
import { sleep, waitFor } from "./utils";

main();

async function main() {
  console.log("Initializing...");

  const gpioAccess = await requestGPIOAccess();

  const input = gpioAccess.ports.get(4)!;
  await input.export("out");
  const output = gpioAccess.ports.get(17)!;
  await output.export("in");

  console.log("Ready");

  for (;;) {
    // Wait for paper insert
    await Promise.all([waitFor(output, 1), input.write(1)]);
    console.log("HIGH");
    await sleep(1000);
    await input.write(0);
    console.log("LOW");
    await sleep(1000);
  }
}
