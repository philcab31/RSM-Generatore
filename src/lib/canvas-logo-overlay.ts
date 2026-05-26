import type { LogoPosition } from './brand-identity'

export async function applyLogoOverlay(
  imageUrl: string,
  logoBase64: string,
  position: LogoPosition,
  sizePercent: number,
  opacityPercent: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D not supported'))
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const logo = new Image()
      logo.onload = () => {
        const logoW = (canvas.width * sizePercent) / 100
        const ratio = logo.height / logo.width
        const logoH = logoW * ratio

        const padding = Math.max(8, canvas.width * 0.02)

        let x = 0
        let y = 0

        switch (position) {
          case 'top-left':
            x = padding
            y = padding
            break
          case 'top-right':
            x = canvas.width - logoW - padding
            y = padding
            break
          case 'bottom-left':
            x = padding
            y = canvas.height - logoH - padding
            break
          case 'bottom-right':
            x = canvas.width - logoW - padding
            y = canvas.height - logoH - padding
            break
          case 'center':
            x = (canvas.width - logoW) / 2
            y = (canvas.height - logoH) / 2
            break
        }

        ctx.globalAlpha = opacityPercent / 100
        ctx.drawImage(logo, x, y, logoW, logoH)
        ctx.globalAlpha = 1.0

        resolve(canvas.toDataURL('image/png'))
      }

      logo.onerror = () => {
        // If logo fails, return original image
        resolve(imageUrl)
      }

      logo.src = logoBase64
    }

    img.onerror = () => {
      // If image fails (e.g. CORS), reject so caller can fallback
      reject(new Error('Failed to load image for logo overlay'))
    }

    img.src = imageUrl
  })
}

export function hasLogoConfigured(logoBase64?: string): boolean {
  return typeof logoBase64 === 'string' && logoBase64.length > 0
}
