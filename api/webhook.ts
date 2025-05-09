import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OpenAI } from "openai";
import { Redis } from "@upstash/redis";
import bot from "../bot";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
});
const redis = Redis.fromEnv();

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Only POST allowed");

  const message = req.body?.message?.text;
  const chatId = req.body?.message?.chat.id;
  const userId = req.body?.message?.from?.id;

  if (!message || !chatId) return res.status(200).send("No message");

  const history: any = (await redis.get(userId)) || [];

  const messages = [
    {
      role: "system",
      content:
        "Mày là một trợ lý thân thiện, xưng hô mày tao với người dùng. Trả lời ngắn gọn, tự nhiên, giữ ngữ cảnh cuộc trò chuyện.",
    },
    ...history,
    { role: "user", content: message },
  ];

  try {
    bot.sendChatAction(chatId, "typing");

    const response = await openai.chat.completions.create({
      model: process.env.MODEL || "google/gemini-2.0-flash-exp:free",
      messages,
    });

    const reply =
      response?.choices?.[0]?.message.content || "Something went wrong";

    await bot.sendMessage(chatId, reply);

    const updatedHistory = [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ];

    await redis.set(userId, updatedHistory.slice(-15));

    res.status(200).send("Message handled");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error");
  }
}
