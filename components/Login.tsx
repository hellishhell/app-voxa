'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Key, Loader2 } from 'lucide-react'

interface LoginProps {
  onLogin: (userId: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [accessKey, setAccessKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Проверяем localStorage только на клиенте
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('voxa_access_key')
      if (storedKey) {
        setAccessKey(storedKey)
        handleLoginWithKey(storedKey)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateAccessKey = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const key = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    setAccessKey(key)
  }

  const handleLoginWithKey = async (key: string) => {
    if (!key.trim()) return
    setIsLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('access_key', key)
      .single()

    if (error || !data) {
      setError('Invalid access key. Please generate a new one.')
      setIsLoading(false)
      return
    }

    // Store valid key
    localStorage.setItem('voxa_access_key', key)

    // Update online status
    await supabase
      .from('profiles')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', data.id)

    onLogin(data.id)
    setIsLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLoginWithKey(accessKey)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Voxa</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Private & secure messenger</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={generateAccessKey}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <Key size={20} />
            Generate Access Key
          </button>

          {accessKey && (
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-sm font-mono break-all text-gray-800 dark:text-gray-200">{accessKey}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Save this key. It will not be shown again.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enter your access key
              </label>
              <input
                type="text"
                id="accessKey"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Paste your 32-character key"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !accessKey}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Enter Voxa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}