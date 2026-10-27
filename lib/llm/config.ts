'use client';

/**
 * LLM 配置（存 localStorage）+ OpenAI 兼容流式调用
 * 适配 LM Studio / Ollama / 任意 OpenAI 兼容本地或云端接口
 */

export interface LlmConfig {
  /** OpenAI 兼容 base URL，如 http://localhost:1234/v1 */
  endpoint: string;
  /** 模型名 */
  model: string;
  /** API Key（本地服务可留空） */
  apiKey: string;
}

const KEY_ENDPOINT = 'ziwei_llm_endpoint';
const KEY_MODEL = 'ziwei_llm_model';
const KEY_APIKEY = 'ziwei_llm_apikey';

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  endpoint: 'http://localhost:1234/v1',
  model: 'qwen3.8-27b-mlx',
  apiKey: '',
};

export function loadLlmConfig(): LlmConfig {
  if (typeof window === 'undefined') return DEFAULT_LLM_CONFIG;
  return {
    endpoint: localStorage.getItem(KEY_ENDPOINT) || DEFAULT_LLM_CONFIG.endpoint,
    model: localStorage.getItem(KEY_MODEL) || DEFAULT_LLM_CONFIG.model,
    apiKey: localStorage.getItem(KEY_APIKEY) || '',
  };
}

export function saveLlmConfig(cfg: LlmConfig) {
  localStorage.setItem(KEY_ENDPOINT, cfg.endpoint.replace(/\/+$/, ''));
  localStorage.setItem(KEY_MODEL, cfg.model);
  if (cfg.apiKey) localStorage.setItem(KEY_APIKEY, cfg.apiKey);
  else localStorage.removeItem(KEY_APIKEY);
}

/**
 * 流式对话。onDelta 逐段回调增量文本（只含正文，思考内容被跳过）。
 * 返回完整正文。
 */
export async function streamChatCompletion(
  cfg: LlmConfig,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onDelta: (delta: string) => void,
  opts?: { maxTokens?: number; temperature?: number; signal?: AbortSignal },
): Promise<string> {
  const base = cfg.endpoint.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      max_tokens: opts?.maxTokens ?? 2000,
      temperature: opts?.temperature ?? 0.7,
    }),
    signal: opts?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error('无响应流');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // 末行可能不完整，留到下一轮

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        // OpenAI 格式取 content；LM Studio 思考模型可能给 reasoning_content，跳过
        const text = typeof delta.content === 'string' ? delta.content : '';
        if (text) {
          full += text;
          onDelta(text);
        }
      } catch { /* 非完整 JSON，跳过 */ }
    }
  }
  return full;
}

/** 测试连接：列出模型 */
export async function testConnection(cfg: LlmConfig): Promise<string[]> {
  const base = cfg.endpoint.replace(/\/+$/, '');
  const res = await fetch(`${base}/models`, {
    headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.data ?? []).map((m: { id: string }) => m.id);
}
