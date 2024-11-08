import { requestI2CAccess } from "node-web-i2c";
import * as util from "util";
import * as child_process from "child_process";
import * as fs from "fs";
import { GPIOPort, requestGPIOAccess } from "node-web-gpio";
import PCA9685 from "@chirimen/pca9685";
import { button, sleep, waitFor } from "./utils";
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getStorage,
  ref,
  StorageReference,
  uploadBytes,
} from "firebase/storage";
import { nanoid } from "nanoid";

const exec = util.promisify(child_process.exec);

const PWM_MIN = 0.95e-3;
const PWM_MAX = 2.1e-3;

const SPEED = 20;

const USER = "post-user";

main();

function firebaseInit(): FirebaseApp {
  const firebaseConfig = {
    apiKey: "AIzaSyDVNbUxVMUjE3eb_PpPxq9FDSczdak4ZcU",
    authDomain: "reco-post.firebaseapp.com",
    projectId: "reco-post",
    storageBucket: "reco-post.firebasestorage.app",
    messagingSenderId: "735886984420",
    appId: "1:735886984420:web:f4807f20056e5d612358f1",
    measurementId: "G-9336CD1QMK",
  };
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  return app;
}

async function uploadImage(userRef: StorageReference, image: Blob) {
  const id = nanoid();
  const file = ref(userRef, `${id}.jpg`);
  uploadBytes(file, image);
  console.log("Uploaded", file.fullPath);
}

async function loadImageAndSave(userRef: StorageReference) {
  try {
    console.log("mount usb");
    await exec("mount /dev/sda1 /mnt/usb");

    console.log("read usb");
    const path = fs.readdirSync("/mnt/usb").sort().at(-1);
    if (path) {
      console.log("file found, reading", path);
      const buffer = fs.readFileSync(`/mnt/usb/${path}`);
      const blob = new Blob([buffer]);
      console.log("uploading");
      await uploadImage(userRef, blob);
      console.log("uploaded");
    }
  } finally {
    console.log("unmount usb");
    await exec("umount /mnt/usb");
  }
  console.log("done");
}

async function main() {
  console.log("Initializing...");

  const app = firebaseInit();
  const storage = getStorage(app);
  const storageRef = ref(storage, "images");
  const userRef = ref(storageRef, USER);

  const i2cAccess = await requestI2CAccess();
  const pca9685 = new PCA9685(i2cAccess.ports.get(1)!, 0x40);
  await pca9685.init(PWM_MIN, PWM_MAX, 100);

  const gpioAccess = await requestGPIOAccess();
  const irObstacle = gpioAccess.ports.get(17)!;
  await irObstacle.export("in");

  const scanBtn = await button(gpioAccess.ports.get(4)!);

  console.log("Ready");

  while (true) {
    // Wait for paper insert
    await waitFor(irObstacle, 0);
    console.log("Paper detected");

    // Start scan
    await scanBtn.longPress(); // power on
    await sleep(1000);
    await scanBtn.press(); // start scan

    pca9685.setServo(0, SPEED);
    await sleep(5000);
    pca9685.setServo(0, 0);

    await scanBtn.press(); // stop scan
    console.log("Scan done");
    await sleep(1000);

    await loadImageAndSave(userRef);
    await sleep(1000);

    await scanBtn.longPress(); // power off
  }
}
