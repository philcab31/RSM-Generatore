'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  type BrandIdentity,
  defaultBrandIdentity,
  sanitizeBrandIdentity,
} from '@/lib/brand-identity'

interface BrandIdentityContextType {
  brand: BrandIdentity
  updateBrand: (updates: Partial<BrandIdentity>) => void
  forceSave: (fullBrand: BrandIdentity) => Promise<void>
  resetBrand: () => void
  isLoading: boolean
  isSaving: boolean
}

const BrandIdentityContext = createContext<BrandIdentityContextType | undefined>(undefined)

const STORAGE_KEY = 'brand_identity'

function loadFromLocalStorage(): BrandIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitizeBrandIdentity(JSON.parse(raw))
  } catch {
    // ignore
  }
  return null
}

function saveToLocalStorage(brand: BrandIdentity): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brand))
}

export function BrandIdentityProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandIdentity>(() => {
    return loadFromLocalStorage() ?? defaultBrandIdentity
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from server on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/ai/brand')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.brand) {
            const sanitized = sanitizeBrandIdentity(data.brand)
            setBrand(sanitized)
            saveToLocalStorage(sanitized)
          }
        }
      } catch {
        // ignore: fallback to localStorage already loaded
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const syncToServer = useCallback(async (nextBrand: BrandIdentity) => {
    setIsSaving(true)
    try {
      await fetch('/api/ai/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextBrand),
      })
    } catch (err) {
      console.error('Failed to sync brand identity to server:', err)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const updateBrand = useCallback(
    (updates: Partial<BrandIdentity>) => {
      setBrand((prev) => {
        const next = { ...prev, ...updates }
        saveToLocalStorage(next)
        // Debounced server sync
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          syncToServer(next)
        }, 800)
        return next
      })
    },
    [syncToServer]
  )

  const forceSave = useCallback(
    async (fullBrand: BrandIdentity) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setBrand(fullBrand)
      saveToLocalStorage(fullBrand)
      await syncToServer(fullBrand)
    },
    [syncToServer]
  )

  const resetBrand = useCallback(() => {
    setBrand(defaultBrandIdentity)
    saveToLocalStorage(defaultBrandIdentity)
    syncToServer(defaultBrandIdentity)
  }, [syncToServer])

  return (
    <BrandIdentityContext.Provider value={{ brand, updateBrand, forceSave, resetBrand, isLoading, isSaving }}>
      {children}
    </BrandIdentityContext.Provider>
  )
}

export function useBrandIdentity() {
  const context = useContext(BrandIdentityContext)
  if (!context) {
    throw new Error('useBrandIdentity must be used within a BrandIdentityProvider')
  }
  return context
}
