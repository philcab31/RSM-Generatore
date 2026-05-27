'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Lock, User, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Redirect to dashboard on success
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Identifiant ou mot de passe incorrect.')
      }
    } catch (err) {
      setError('Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4 dark:bg-slate-950">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-[20%] h-[600px] w-[600px] rounded-full bg-cyan-200/30 blur-[120px] dark:bg-cyan-900/10" />
        <div className="absolute -bottom-[30%] right-[20%] h-[600px] w-[600px] rounded-full bg-blue-200/30 blur-[120px] dark:bg-blue-900/10" />
      </div>

      <Card className="w-full max-w-[420px] border-slate-100/80 bg-white/80 shadow-2xl shadow-slate-100 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-slate-100 dark:text-slate-950 dark:shadow-none">
            <Sparkles className="h-5 w-5 animate-pulse text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            RSMedium Generatore
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Accès sécurisé au studio de génération
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Identifiant
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-white/50 focus:border-slate-900 focus:bg-white focus:ring-0 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:border-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-white/50 focus:border-slate-900 focus:bg-white focus:ring-0 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:border-slate-100"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-slate-900 font-semibold text-white hover:bg-slate-800 focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
