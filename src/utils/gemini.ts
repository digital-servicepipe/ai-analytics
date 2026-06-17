import type { NormalizedLogRow } from "../types";
import {
  buildAgentGroupBars,
  buildAgentIntentSummary,
  buildDetailedAgentBars,
  buildTopPages,
  buildUrlSummaries,
} from "./aggregations";

const SYSTEM_PROMPT = `Ты — Senior Tech-SEO и Архитектор данных, аналитик по AI-трафику (GEO) и логам. 

БАЗОВАЯ ФИЛОСОФИЯ:
GEO — это часть SEO. Мы делаем сайты удобными для людей, а для нейросетей отдаем чистые, структурированные данные под капотом.

ТВОИ ПРАВИЛА:
1. ОТТАЛКИВАЙСЯ ОТ ДАННЫХ: Твои ответы должны строго опираться на переданные тебе данные логов. Называй конкретных ботов из логов, указывай конкретные разделы (path), которые они сканируют.
2. ТЕХНИЧЕСКИЙ УПОР: Избегай банальностей вроде "перепишите title". Говори про управление краулинговым бюджетом, WAF-правила, форматы (JSON-LD, llm.txt), рендеринг (SSR), лимитирование парсеров.
3. УЧИТЫВАЙ РАЗНЫХ БОТОВ: RAG-ботам (OpenAI) нужны факты и данные без DOM-мусора, поисковикам (Google) — скорость и перелинковка.
4. Отвечай СТРОГО НА РУССКОМ ЯЗЫКЕ. Разделяй текст на абзацы (пустая строка).

ФОРМАТ АНАЛИЗА:
Отвечай в свободной, но структурированной форме. Если просят дать рекомендации или сделать первичный анализ, старайся использовать такой наглядный формат для ключевых пунктов:
**[Суть внедрения]**
* 🤖 **Для кого:** [Боты из логов]
* 🎯 **Цель:** [Зачем это бизнесу]
* ⚙️ **Как работает:** [Краткая механика]`;

export type ChatMessagePayload = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function buildContextPrompt(rows: NormalizedLogRow[]): string {
  const total = rows.length;
  const groups = buildAgentGroupBars(rows).slice(0, 5);
  const details = buildDetailedAgentBars(rows).slice(0, 10);
  const paths = buildTopPages(rows, 10);
  const intents = buildAgentIntentSummary(rows, 5);
  const urls = buildUrlSummaries(rows).slice(0, 15);

  const context = {
    summary: { total_requests: total },
    top_groups: groups,
    top_agents: details,
    top_paths: paths,
    bot_intents: intents,
    url_details: urls.map((u) => ({
      path: u.path,
      title: u.title,
      total: u.total,
      top_bot: u.topGroup,
    })),
  };

  return JSON.stringify(context, null, 2);
}

export async function sendChatMessage(
  apiKey: string,
  messages: ChatMessagePayload[],
  rows: NormalizedLogRow[] // Добавили rows сюда
): Promise<string> {
  if (!apiKey) throw new Error("API ключ не настроен");

  try {
    const modelId = "deepseek/deepseek-v4-flash";
    
    // Всегда генерируем контекст по логам
    const dataContext = buildContextPrompt(rows);

    const fullMessages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n=== ТЕКУЩИЕ ДАННЫЕ ЛОГОВ ===\n${dataContext}` },
      ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "NeraLens Analytics",
      },
      body: JSON.stringify({
        model: modelId,
        messages: fullMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `Ошибка сервера: ${response.status}`);
    }

    const result = await response.json();
    const text = result.choices[0]?.message?.content;

    if (!text) throw new Error("ИИ вернул пустой ответ");

    return text;
  } catch (error: any) {
    console.error("OpenRouter AI Error:", error);
    throw new Error(`Не удалось получить ответ: ${error.message}`);
  }
}
