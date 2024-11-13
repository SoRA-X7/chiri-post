import { generate } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { googleAI, gemini15Flash } from "@genkit-ai/googleai";
import { z } from "zod";

configureGenkit({ plugins: [googleAI()] });

const VisionResult = z.object({
  type: z.string(),
  content: z.string(),
  importance: z.number(),
});

export async function vision(
  data: ArrayBufferLike
): Promise<z.infer<typeof VisionResult> | null> {
  const base64Data = Buffer.from(data).toString("base64");
  const base64Str = `data:image/jpeg;base64,${base64Data}`;

  const result = await generate({
    model: gemini15Flash,
    prompt: [
      {
        media: {
          url: base64Str,
        },
      },
      {
        text: "画像にはなんらかの郵便物が写っています。郵便物の種類と内容と重要度を特定してください。\n種類は次の中から選んでください: [手紙, はがき, 封筒, 小包, チラシ, その他]\n重要度は1から5の間で選んでください。\n種類を`type`、内容を`content`、重要度を`importance`としてJSON形式で出力してください。",
      },
    ],
    output: {
      schema: VisionResult,
    },
  });

  return result.output();
}
