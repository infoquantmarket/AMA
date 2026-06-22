'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

const MAX_CHARS = 150

function ChatUI() {
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('id') ?? ''
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')

  // Transport configurado con propertyId en el body de cada request
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { propertyId },
      }),
    [propertyId]
  )

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: () => {
      setTimeout(() => inputRef.current?.focus(), 100)
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInput('')
  }

  if (!propertyId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">¡Hola! 👋</p>
          <p className="text-sm text-gray-400">Escanea el código QR de tu propiedad para comenzar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0d1117] text-white max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
          A
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">AMA Concierge</p>
          <p className="text-[11px] text-emerald-400">● En línea</p>
        </div>
      </header>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#1e2433] px-4 py-3 text-sm leading-relaxed text-gray-200">
              ¡Hola! Soy AMA, tu concierge digital. 🏡<br />
              ¿En qué puedo ayudarte hoy?
            </div>
          </div>
        )}

        {messages.map((m) => {
          // En AI SDK v6, el texto está en m.parts
          const textContent = m.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('')

          if (!textContent && m.role !== 'user') return null

          return (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-black rounded-br-sm font-medium'
                    : 'bg-[#1e2433] text-gray-200 rounded-tl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdownLinks(textContent) }}
              />
            </div>
          )
        })}

        {/* Indicador de escritura */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1e2433] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-red-400">
            Error al conectar. Intenta de nuevo.
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 bg-[#1a1f2e] border-t border-white/10 shrink-0"
      >
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setInput(e.target.value)
            }}
            placeholder="Escribe tu pregunta..."
            maxLength={MAX_CHARS}
            disabled={isLoading}
            autoComplete="off"
            className="w-full bg-[#0d1117] text-white placeholder-gray-500 rounded-full px-4 py-2.5 text-sm outline-none border border-white/10 focus:border-amber-500/50 transition-colors pr-12 disabled:opacity-50"
          />
          {input.length > 100 && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${
                input.length >= MAX_CHARS ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              {MAX_CHARS - input.length}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-black animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-black" />
          )}
        </button>
      </form>
    </div>
  )
}

// Convierte [texto](url) markdown a <a> HTML seguro
function renderMarkdownLinks(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-amber-400 font-medium">$1</a>'
    )
    .replace(/\n/g, '<br/>')
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      }
    >
      <ChatUI />
    </Suspense>
  )
}
