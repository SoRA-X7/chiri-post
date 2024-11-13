import { generate } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { googleAI, gemini15Flash } from "@genkit-ai/googleai";
import { z } from "zod";

configureGenkit({ plugins: [googleAI()] });

const VisionResult = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string(),
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
        text:
          "画像にはなんらかの郵便物が写っています。郵便物の種類と内容と重要度を特定してください。\n" +
          "種類は次の中から選んでください: [手紙, はがき, 封筒, 小包, チラシ, その他]\n" +
          "重要度は、利用者に対するその郵便物の重要性を、低い方から1から5の間で選んでください。\n" +
          "内容は簡単なタイトルと詳細な説明に分けてください。\n" +
          "種類を`type`、簡単なタイトルを`title`、詳細な説明を`description`、重要度を`importance`としてJSON形式で出力してください。\n" +
          "郵便物は裏返っている場合があるので、内容を推測する際には注意してください。",
      },
    ],
    output: {
      schema: VisionResult,
    },
  });

  return result.output();
}
