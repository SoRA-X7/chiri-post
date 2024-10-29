declare module "@chirimen/pca9685" {
  import { I2CPort } from "node-web-i2c";
  export default class PCA9685 {
    private i2cPort;
    private i2cSlave;
    private pwmFreq;
    private pwmMin;
    private pwmMax;
    constructor(i2cPort: I2CPort, address: number);
    init(pwmMin: number, pwmMax: number, pwmFreq: number): Promise<void>;
    setServo(channel: number, pulse: number): void;
  }
}
