import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import bot from "../bot";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Only POST allowed");

  const message = req.body.message?.text;
  const chatId = req.body.message?.chat.id;

  if (!message || !chatId) return res.status(200).send("No message");

  try {
    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: message }],
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      }
    );

    const reply = aiResponse.data.choices[0].message.content;

    await bot.sendMessage(chatId, reply);

    res.status(200).send("Message handled");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error");
  }
}
