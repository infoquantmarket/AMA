'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Download, X } from 'lucide-react'

export default function QRButton({ propiedadId, propiedadName }: { propiedadId: string; propiedadName: string }) {
  const [open, setOpen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://project-i8q9f.vercel.app'}/chat?id=${propiedadId}`

  const handleDownload = async () => {
    const svg = svgRef.current
    if (!svg) return

    // Load Montserrat font before drawing
    const font = new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.woff2)')
    await font.load().catch(() => null)
    document.fonts.add(font)
    await document.fonts.ready

    const W = 600
    const H = 760
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Franja superior dorada
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(0, 0, W, 8)

    // Cargar logo y QR en paralelo
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)

    const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const [svgImg, logo] = await Promise.all([
      loadImg('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))),
      loadImg('/AMAlogo_nb.png'),
    ])

    // Logo grande centrado arriba
    const logoW = 380
    const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW
    const logoX = (W - logoW) / 2
    const logoY = 32
    ctx.drawImage(logo, logoX, logoY, logoW, logoH)

    // QR centrado debajo del logo
    const qrSize = 360
    const qrX = (W - qrSize) / 2
    const qrY = logoY + logoH + 28
    ctx.drawImage(svgImg, qrX, qrY, qrSize, qrSize)

    // Separador
    const sepY = qrY + qrSize + 28
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, sepY)
    ctx.lineTo(W - 48, sepY)
    ctx.stroke()

    // Nombre de la propiedad — Montserrat Bold
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 22px Montserrat, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(propiedadName, W / 2, sepY + 38)

    // Tagline — Montserrat regular
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px Montserrat, sans-serif'
    ctx.fillText('Escanea para acceder a tu concierge virtual', W / 2, sepY + 64)

    const link = document.createElement('a')
    link.download = `ama-qr-${propiedadId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        <QrCode className="w-4 h-4" />
        Generar QR
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#1a1f2e] rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold">QR de la propiedad</h2>
                <p className="text-gray-400 text-xs mt-0.5">{propiedadName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl p-5 flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/AMAlogo_nb.png" alt="AMA logo" className="w-full max-w-[200px] object-contain" />
              <QRCodeSVG
                ref={svgRef}
                value={url}
                size={220}
                level="H"
                includeMargin={false}
              />
              <p className="text-gray-800 text-sm font-bold text-center font-[Montserrat,sans-serif]">{propiedadName}</p>
            </div>

            <p className="text-gray-500 text-xs text-center mt-3 break-all">{url}</p>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black font-semibold py-2.5 rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar PNG
              </button>
              <p className="text-gray-500 text-xs text-center">
                El QR no vence. Si desactivas la propiedad, AMA responde en modo genérico.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
