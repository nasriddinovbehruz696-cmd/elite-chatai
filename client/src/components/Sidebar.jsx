export default function Sidebar({ chats, activeId, onSelect, onCreate, onDelete }) {
  return (
    <div className="w-64 bg-base-200 border-r border-base-300 flex flex-col h-full">
      <div className="p-3">
        <button className="btn btn-primary btn-sm w-full" onClick={onCreate}>
          + Новый чат
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {chats.length === 0 && (
          <p className="text-xs text-base-content/40 text-center mt-4">Нет чатов</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
              chat.id === activeId ? 'bg-primary text-primary-content' : 'hover:bg-base-300'
            }`}
          >
            <span className="truncate">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(chat.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-xs ml-2 shrink-0"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
