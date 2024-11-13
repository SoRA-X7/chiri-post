import { requestI2CAccess } from "node-web-i2c";
import * as child_process from "child_process";
import * as fs from "fs";
import { requestGPIOAccess } from "node-web-gpio";
import PCA9685 from "@chirimen/pca9685";
import { button, sleep, waitFor } from "./utils.js";
import { FirebaseApp, initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  StorageReference,
  uploadBytes,
} from "firebase/storage";
import { nanoid } from "nanoid";

const PWM_MIN = 0.95e-3;
const PWM_MAX = 2.1e-3;

const SPEED = -40;
const GUIDE_MUL = 1.4;

const USER = "user_001";

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
  return app;
}

async function uploadImage(userRef: StorageReference, image: Blob) {
  const id = nanoid();
  const file = ref(userRef, `${id}.jpg`);
  uploadBytes(file, image, {
    contentType: "image/jpeg",
  });
  console.log("Uploaded", file.fullPath);
}

async function loadImageAndSave(userRef: StorageReference) {
  try {
    console.log("mount usb");
    try {
      child_process.execSync("mount /dev/sda1 /mnt/usb");
    } catch (e) {
      console.log("mount failed", e);
      return;
    }

    console.log("read usb");
    const path = fs.readdirSync("/mnt/usb/DCIM/100MEDIA/").sort().at(-1);
    if (path) {
      console.log("file found, reading", path);
      const buffer = fs.readFileSync(`/mnt/usb/DCIM/100MEDIA/${path}`);
      const blob = new Blob([buffer]);
      console.log("uploading");
      await uploadImage(userRef, blob);
      console.log("uploaded");
    }
  } finally {
    console.log("unmount usb");
    try {
      child_process.execSync("umount /mnt/usb");
    } catch (e) {
      console.log("umount failed", e);
    }
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
  const irObstacle = gpioAccess.ports.get(24)!;
  await irObstacle.export("in");

  const scanBtn = await button(gpioAccess.ports.get(26)!, false);

  const usbConnect = gpioAccess.ports.get(21)!;
  usbConnect.export("out");

  await sleep(1000);
  await usbConnect.write(1);

  console.log("Ready");

  async function scanAndSend() {
    await scanBtn.press(); // start scan

    pca9685.setServo(14, SPEED);
    pca9685.setServo(15, SPEED * GUIDE_MUL);
    await sleep(3500);
    pca9685.setServo(14, 0);
    pca9685.setServo(15, 0);

    await scanBtn.press(); // stop scan
    console.log("Scan done");
    await sleep(1000);

    await usbConnect.write(0); // connect USB

    console.log("Waiting for USB connection");
    await sleep(5000);

    await loadImageAndSave(userRef);
    await sleep(1000);

    await usbConnect.write(1); // disconnect USB

    await sleep(5000);
  }

  while (true) {
    // Wait for paper insert
    await waitFor(irObstacle, 0, true);
    console.log("Paper detected");

    // Start scan
    await scanBtn.longPress(); // power on

    while ((await irObstacle.read()) === 0) {
      await scanAndSend();
    }

    await sleep(1000);

    await scanBtn.longPress(); // power off
    console.log("Power off");
  }
}
