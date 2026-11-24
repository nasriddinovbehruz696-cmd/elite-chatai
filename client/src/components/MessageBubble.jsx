import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ role, text, image }) {
  const [copied, setCopied] = useState(false)

  if (role === 'system') {
    return <div className="text-center text-sm text-base-content/50 my-2">{text}</div>
  }

  const isUser = role === 'user'
  const aiAvatar = !isUser ? localStorage.getItem('gemini_ai_avatar') : null

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'} group`}>
      {!isUser && (
        <div className="chat-image avatar">
          <div className="w-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {aiAvatar ? (
              <img src={aiAvatar} alt="AI" className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm">🤖</span>
            )}
          </div>
        </div>
      )}
      <div
        className={`chat-bubble relative ${
          isUser ? 'chat-bubble-primary whitespace-pre-wrap' : 'bg-base-200 text-base-content'
        }`}
      >
        {image && (
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt="attachment"
            className="rounded-lg max-w-[240px] max-h-[240px] object-cover mb-2"
          />
        )}
        {isUser ? (
          text
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 btn btn-circle btn-xs bg-base-300 border-none"
          title="Копировать"
        >
          {copied ? '✓' : '⧉'}
        </button>
      </div>
    </div>
  )
}
