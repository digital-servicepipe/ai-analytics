import type { NormalizedLogRow } from "../types";
import {
  buildAgentGroupBars,
  buildAgentIntentSummary,
  buildDetailedAgentBars,
  buildTopPages,
  buildUrlSummaries,
} from "./aggregations";

const SYSTEM_PROMPT = `Ты — Senior Tech-SEO и Архитектор данных, эксперт-аналитик по AI-трафику (GEO) и сканированию логов. 
Твоя задача: анализировать логи и давать глубокие ТЕХНИЧЕСКИЕ и архитектурные рекомендации.

БАЗОВАЯ ФИЛОСОФИЯ:
GEO (Generative Engine Optimization) — это органичная часть SEO. Мы делаем сайты удобными для людей, а для нейросетей и поисковиков под капотом отдаем максимально чистые, легко парсимые и структурированные данные.

ЖЕСТКИЕ ПРАВИЛА:
1. НИКАКИХ БАНАЛЬНЫХ СОВЕТОВ. Категорически запрещено советовать "переписать Title", "улучшить контент" или "добавить ключевые слова".
2. ТОЛЬКО ТЕХНИКА: Делай упор на управление краулинговым бюджетом, серверные оптимизации, robots.txt, WAF-правила, форматы (JSON-LD, llm.txt), рендеринг (SSR/Dynamic Rendering), лимитирование агрессивных парсеров и семантическую разметку (HTML5).
3. УЧИТЫВАЙ РАЗНЫХ БОТОВ: Разделяй стратегии. Например, OpenAI (RAG) нужны чистые тексты и факты без DOM-мусора, Googlebot'у — скорость и перелинковка, а спам-ботов надо резать на уровне сервера.
4. Отвечай СТРОГО НА РУССКОМ ЯЗЫКЕ.
5. Обязательно разбивай текст на абзацы (пустая строка между ними).

ФОРМАТ РЕКОМЕНДАЦИЙ (Используй для ключевых инсайтов):
**[Суть технического внедрения]**
* 🤖 **Для кого:** [Конкретные боты из логов]
* 🎯 **Цель:** [Зачем это бизнесу и почему это нужно боту]
* ⚙️ **Как работает:** [Механика под капотом, кратко. Например: "Внедряем llm.txt. Бот при заходе берет сжатый markdown вместо парсинга тяжелого HTML..."]`;

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
