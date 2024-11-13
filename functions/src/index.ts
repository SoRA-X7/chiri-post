/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/storage";
import { getStorage } from "firebase-admin/storage";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { vision } from "./gemini";
import { initializeApp } from "firebase-admin/app";
import { onDocumentCreated } from "firebase-functions/firestore";
import { getMessaging, TokenMessage } from "firebase-admin/messaging";
import { credential } from "firebase-admin";

initializeApp({
  credential: credential.applicationDefault(),
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(
  { maxInstances: 1 },
  (request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
  }
);

export const onImageUploaded = onObjectFinalized(async (ev) => {
  console.log(ev.data.name);

  if (
    !ev.data.name.startsWith("images/") ||
    !ev.data.contentType?.startsWith("image/")
  ) {
    logger.info("Not an image");
    return;
  }
  const user = ev.data.name.split("/")[1];
  const bucket = getStorage().bucket(ev.data.bucket);
  const downloadResponse = await bucket.file(ev.data.name).download();

  const visionResult = await vision(downloadResponse[0]);
  console.log("Vision result: ", visionResult);

  if (visionResult) {
    const doc = {
      user,
      image: ev.data.name,
      type: visionResult.type,
      title: visionResult.title,
      description: visionResult.description,
      importance: visionResult.importance,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await getFirestore().collection("images").add(doc);
    console.log("Document written with ID: ", ref.id);
  }
});

export const onImageAnalyzed = onDocumentCreated(
  "images/{imageId}",
  async (ev) => {
    const data = ev.data?.data();
    if (data) {
      const tokenData = await getFirestore()
        .collection("fcmTokens")
        .doc(data.user)
        .get();
      const token = tokenData.data()?.token;

      const message: TokenMessage = {
        notification: {
          title: "郵便物が届きました！",
          body: data.title,
        },
        data: {
          id: ev.params.imageId,
          type: data.type,
          title: data.title,
          description: data.description,
          importance: data.importance.toString(),
        },
        token,
      };

      await getMessaging().send(message);
      logger.info("Notification sent for image analysis");
    }
  }
);
