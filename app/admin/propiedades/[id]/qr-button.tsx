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

    const W = 560
    const canvas = document.createElement('canvas')
    const ctx_temp = document.createElement('canvas').getContext('2d')!

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

    // Calcular alturas reales para canvas justo
    const logoW = 340
    const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW)
    const qrSize = 340
    const PAD = 32       // padding lateral
    const GAP_TOP = 28   // espacio sobre logo
    const GAP_MID = 20   // logo → QR
    const GAP_BOT = 24   // QR → texto
    const TEXT_H = 72    // nombre + tagline + padding inferior
    const H = GAP_TOP + logoH + GAP_MID + qrSize + GAP_BOT + TEXT_H

    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    void ctx_temp // silence unused

    // Fondo crema cálido
    ctx.fillStyle = '#fffdf7'
    ctx.fillRect(0, 0, W, H)

    // Banda dorada superior
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, '#f59e0b')
    grad.addColorStop(1, '#d97706')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 7)

    // Logo centrado
    const logoX = (W - logoW) / 2
    const logoY = GAP_TOP
    ctx.drawImage(logo, logoX, logoY, logoW, logoH)

    // Línea separadora sutil
    const line1Y = logoY + logoH + GAP_MID / 2 - 2
    ctx.strokeStyle = '#f3e8d0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD + 40, line1Y)
    ctx.lineTo(W - PAD - 40, line1Y)
    ctx.stroke()

    // QR con borde redondeado simulado (rect blanco de fondo)
    const qrX = (W - qrSize) / 2
    const qrY = logoY + logoH + GAP_MID
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
    ctx.fill()
    ctx.drawImage(svgImg, qrX, qrY, qrSize, qrSize)

    // Sombra sutil del QR (dibujada antes — aquí la simulamos con borde)
    ctx.strokeStyle = '#f0e8d8'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Nombre de la propiedad — Montserrat Bold
    const textY = qrY + qrSize + GAP_BOT
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 20px Montserrat, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(propiedadName, W / 2, textY + 22)

    // Tagline
    ctx.fillStyle = '#b08030'
    ctx.font = '12px Montserrat, sans-serif'
    ctx.letterSpacing = '1px'
    ctx.fillText('ASK ME ANYTHING · VIRTUAL VIP CONCIERGE', W / 2, textY + 44)

    // Banda dorada inferior
    ctx.fillStyle = grad
    ctx.fillRect(0, H - 5, W, 5)

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
