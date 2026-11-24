import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

export function useChats() {
  const [chats, setChats] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [loadingChat, setLoadingChat] = useState(false)

  const refreshList = useCallback(async () => {
    const list = await api.getChats()
    setChats(list)
    return list
  }, [])

  useEffect(() => {
    refreshList()
  }, [refreshList])

  useEffect(() => {
    if (!activeId) {
      setActiveChat(null)
      return
    }
    setLoadingChat(true)
    api
      .getChat(activeId)
      .then(setActiveChat)
      .finally(() => setLoadingChat(false))
  }, [activeId])

  async function createChat() {
    const chat = await api.createChat()
    setActiveChat(chat)
    setActiveId(chat.id)
  }

  async function deleteChat(id) {
    await api.deleteChat(id)
    const list = await refreshList()
    if (activeId === id) {
      setActiveId(list[0]?.id || null)
    }
  }

  async function sendMessage(text, image) {
    if (!activeChat) return
    const chatId = activeChat.id
    const userMsg = { role: 'user', text }
    if (image) userMsg.image = image
    setActiveChat((c) => ({ ...c, messages: [...c.messages, userMsg] }))
    try {
      const { reply } = await api.sendMessage(chatId, text, image)
      setActiveChat((c) => ({ ...c, messages: [...c.messages, { role: 'ai', text: reply }] }))
      refreshList()
    } catch (err) {
      setActiveChat((c) => ({
        ...c,
        messages: [...c.messages, { role: 'system', text: 'Ошибка: ' + err.message }],
      }))
      refreshList()
    }
  }

  return {
    chats,
    activeId,
    setActiveId,
    activeChat,
    loadingChat,
    createChat,
    deleteChat,
    sendMessage,
  }
}
