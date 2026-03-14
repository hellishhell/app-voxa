'use client'

import { useState, useEffect } from 'react'
import Login from '@/components/Login'
import ProfileSetup from '@/components/ProfileSetup'
import Chat from '@/components/Chat'

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState(false)

  // На клиенте проверяем, есть ли сохранённый ключ (чтобы сразу попытаться войти)
  useEffect(() => {
    // Ничего не делаем, Login сам обработает localStorage
  }, [])

  if (!userId) {
    return <Login onLogin={(id) => setUserId(id)} />
  }

  if (!profileComplete) {
    return <ProfileSetup userId={userId} onComplete={() => setProfileComplete(true)} />
  }

  return <Chat userId={userId} />
}