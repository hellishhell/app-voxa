'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, Send, LogOut, Moon, Sun, Check, CheckCheck, 
  User, MessageCircle, Loader2 
} from 'lucide-react'

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  is_online: boolean
  last_seen: string
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ChatProps {
  userId: string
}

export default function Chat({ userId }: ChatProps) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [contacts, setContacts] = useState<Profile[]>([])
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setCurrentUser(data)
    }
    loadUser()
  }, [userId])

  useEffect(() => {
    const loadContacts = async () => {
      const { data: sent } = await supabase
        .from('messages')
        .select('recipient_id')
        .eq('sender_id', userId)

      const { data: received } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', userId)

      const contactIds = new Set<string>()
      sent?.forEach(m => contactIds.add(m.recipient_id))
      received?.forEach(m => contactIds.add(m.sender_id))

      if (contactIds.size === 0) return

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(contactIds))

      setContacts(profiles || [])
    }
    loadContacts()
  }, [userId])

  useEffect(() => {
    if (!selectedContact) return

    const channel = supabase
      .channel(`chat:${userId}:${selectedContact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${selectedContact.id},recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', newMsg.id)
            .then()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId},recipient_id=eq.${selectedContact.id}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
        }
      )
      .subscribe()

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true })

      setMessages(data || [])
    }
    loadMessages()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, selectedContact])

  useEffect(() => {
    if (!selectedContact) return

    const typingChannel = supabase.channel(`typing:${userId}:${selectedContact.id}`)
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedContact.id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.add(payload.userId)
            setTimeout(() => {
              setTypingUsers(cur => {
                const next = new Set(cur)
                next.delete(payload.userId)
                return next
              })
            }, 2000)
            return newSet
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(typingChannel)
    }
  }, [userId, selectedContact])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', searchQuery.trim().toLowerCase())
      .neq('id', userId)

    if (error) {
      console.error(error)
      setSearchResults([])
    } else {
      setSearchResults(data || [])
    }
    setIsSearching(false)
  }

  const startChatWith = (contact: Profile) => {
    setSelectedContact(contact)
    setSearchQuery('')
    setSearchResults([])
    if (!contacts.some(c => c.id === contact.id)) {
      setContacts(prev => [...prev, contact])
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return

    const message = {
      sender_id: userId,
      recipient_id: selectedContact.id,
      content: newMessage.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMessage('')
    }
  }

  const handleTyping = () => {
    if (!selectedContact) return
    const typingChannel = supabase.channel(`typing:${selectedContact.id}:${userId}`)
    typingChannel.send({ type: 'broadcast', event: 'typing', payload: { userId } })
    supabase.removeChannel(typingChannel)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      // nothing
    }, 3000)
  }

  const logout = async () => {
    await supabase
      .from('profiles')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', userId)
    localStorage.removeItem('voxa_access_key')
    window.location.reload()
  }

  const toggleDark = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <User size={20} className="text-indigo-600 dark:text-indigo-300" />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">@{currentUser.username}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your profile</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleDark} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={logout} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search @username..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-indigo-600" size={18} />}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => startChatWith(user)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <User size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">@{user.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.is_online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <MessageCircle className="mx-auto mb-2" size={40} />
              <p>No conversations yet</p>
              <p className="text-sm">Search for users to start</p>
            </div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <div className="relative">
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <User size={24} className="text-gray-500" />
                    </div>
                  )}
                  {contact.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">@{contact.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {contact.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {selectedContact ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3">
              <div className="relative">
                {selectedContact.avatar_url ? (
                  <img src={selectedContact.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <User size={20} className="text-gray-500" />
                  </div>
                )}
                {selectedContact.is_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">@{selectedContact.username}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {typingUsers.has(selectedContact.id) ? 'Typing...' : (selectedContact.is_online ? 'Online' : 'Offline')}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.sender_id === userId
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        isMine
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${
                        isMine ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <MessageCircle size={60} className="mx-auto mb-4" />
              <p className="text-xl">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}