import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js"; // WebGPIO を使えるようにするためのライブラリをインポート
const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec)); // sleep 関数を定義

async function blink() {
  const gpioAccess = await requestGPIOAccess(); // GPIO を操作する
  const port = gpioAccess.ports.get(26); // 26 番ポートを操作する

  await port.export("out"); // ポートを出力モードに設定

  // 無限ループ
  for (;;) {
    // 1秒間隔で LED が点滅します
    await port.write(1); // LEDを点灯
    console.log("1");
    await sleep(1000); // 1000 ms (1秒) 待機
    await port.write(0); // LEDを消灯
    console.log("0");
    await sleep(1000); // 1000 ms (1秒) 待機
  }
}

blink();
