'use client';

/**
 * LLM 接口设置：齿轮按钮 + 弹出配置（接口地址 / 模型 / Key），含连接测试
 * 配置保存在 localStorage，两处面板共用
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadLlmConfig, saveLlmConfig, testConnection, type LlmConfig } from '@/lib/llm/config';

export function LlmSettingsButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<LlmConfig>({ endpoint: '', model: '', apiKey: '' });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setCfg(loadLlmConfig());
      setResult(null);
    }
  }, [open]);

  const handleSave = () => {
    saveLlmConfig(cfg);
    setOpen(false);
    // 让面板重新挂载读取新配置
    window.dispatchEvent(new Event('ziwei-llm-config-changed'));
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const models = await testConnection(cfg);
      setResult({
        ok: true,
        text: `连接成功，可用模型：${models.slice(0, 6).join('、')}${models.length > 6 ? ' 等' : ''}`,
      });
    } catch (e) {
      setResult({ ok: false, text: `连接失败：${e instanceof Error ? e.message : '未知错误'}。请确认本地服务已启动，且 LM Studio 的 Server 设置里开启了 CORS（跨域）。` });
    } finally {
      setTesting(false);
    }
  };

  const inputStyle = {
    background: 'var(--t-card)',
    border: '1px solid var(--t-border)',
    color: 'var(--t-text)',
  } as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="AI 接口设置"
        className="rounded-lg transition-all hover:opacity-80"
        style={{
          padding: compact ? '2px 6px' : '4px 8px',
          border: '1px solid var(--t-border)',
          color: 'var(--t-faint)',
          fontSize: compact ? '10px' : '11px',
        }}
      >
        ⚙ 接口
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-[92%] max-w-md rounded-2xl p-5"
              style={{ background: 'var(--t-bg, #16130d)', border: '1px solid var(--t-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--t-gold)' }}>AI 接口设置</h3>
                <button onClick={() => setOpen(false)} style={{ color: 'var(--t-faint)' }}>✕</button>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-[10px]" style={{ color: 'var(--t-faint)' }}>接口地址（OpenAI 兼容 base URL）</span>
                  <input
                    value={cfg.endpoint}
                    onChange={e => setCfg({ ...cfg, endpoint: e.target.value })}
                    placeholder="http://localhost:1234/v1"
                    className="w-full rounded-lg px-3 py-2 mt-1 text-xs focus:outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px]" style={{ color: 'var(--t-faint)' }}>模型名称</span>
                  <input
                    value={cfg.model}
                    onChange={e => setCfg({ ...cfg, model: e.target.value })}
                    placeholder="qwen3.8-27b-mlx"
                    className="w-full rounded-lg px-3 py-2 mt-1 text-xs focus:outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px]" style={{ color: 'var(--t-faint)' }}>API Key（本地服务可留空）</span>
                  <input
                    type="password"
                    value={cfg.apiKey}
                    onChange={e => setCfg({ ...cfg, apiKey: e.target.value })}
                    placeholder="可留空"
                    className="w-full rounded-lg px-3 py-2 mt-1 text-xs focus:outline-none"
                    style={inputStyle}
                  />
                </label>

                {result && (
                  <div
                    className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
                    style={{
                      border: `1px solid ${result.ok ? 'rgba(80,180,100,0.4)' : 'rgba(220,90,70,0.4)'}`,
                      color: result.ok ? '#6fce85' : '#e08070',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {result.text}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleTest}
                    disabled={testing || !cfg.endpoint}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}
                  >
                    {testing ? '测试中…' : '测试连接'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: 'rgba(212,168,67,0.15)',
                      border: '1px solid rgba(212,168,67,0.3)',
                      color: 'var(--t-gold)',
                    }}
                  >
                    保存
                  </button>
                </div>

                <p className="text-[9px] leading-relaxed" style={{ color: 'var(--t-faint)' }}>
                  提示：本地 LM Studio 默认地址 http://localhost:1234/v1；Ollama 为 http://localhost:11434/v1。
                  从线上页面调用本地模型需在 LM Studio「Server 设置」中开启 CORS。
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
