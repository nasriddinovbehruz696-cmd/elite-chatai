import { useState, useRef, useEffect } from 'react'
import { useChats } from '../hooks/useChats.js'
import Sidebar from '../components/Sidebar.jsx'
import MessageBubble from '../components/MessageBubble.jsx'

function fileToImagePayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const data = result.split(',')[1]
      resolve({ mimeType: file.type, data })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Chat() {
  const { chats, activeId, setActiveId, activeChat, loadingChat, createChat, deleteChat, sendMessage } =
    useChats()
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages])

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const payload = await fileToImagePayload(file)
    setPendingImage({ ...payload, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
  }

  async function handlePaste(e) {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    const payload = await fileToImagePayload(file)
    setPendingImage({ ...payload, previewUrl: URL.createObjectURL(file) })
  }

  async function handleSend() {
    const text = input.trim()
    if ((!text && !pendingImage) || sending) return
    setInput('')
    const image = pendingImage ? { mimeType: pendingImage.mimeType, data: pendingImage.data } : null
    setPendingImage(null)
    setSending(true)
    try {
      await sendMessage(text, image)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        chats={chats}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createChat}
        onDelete={deleteChat}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingChat && <p className="text-center text-base-content/40 text-sm">Загрузка...</p>}
          {!loadingChat && !activeChat && (
            <p className="text-center text-base-content/40 text-sm mt-10">
              Создай новый чат, чтобы начать
            </p>
          )}
          {activeChat?.messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} image={m.image} />
          ))}
          {sending && <MessageBubble role="system" text="Думаю..." />}
          <div ref={bottomRef} />
        </div>

        {pendingImage && (
          <div className="px-4 pt-2">
            <div className="relative inline-block">
              <img src={pendingImage.previewUrl} alt="preview" className="h-16 rounded-lg" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 btn btn-circle btn-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-base-300 flex gap-2 items-end">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            className="btn btn-circle btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeChat}
            title="Прикрепить картинку"
          >
            +
          </button>
          <textarea
            className="textarea textarea-bordered flex-1 resize-none"
            rows={1}
            placeholder="Напиши сообщение или вставь картинку (Ctrl+V)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={!activeChat}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !activeChat}>
            Отправить
          </button>
        </div>
      </div>
    </div>
  )
}
