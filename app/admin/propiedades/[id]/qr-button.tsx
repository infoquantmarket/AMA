'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Download, X } from 'lucide-react'

export default function QRButton({ propiedadId, propiedadName }: { propiedadId: string; propiedadName: string }) {
  const [open, setOpen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://project-i8q9f.vercel.app'}/chat?id=${propiedadId}`

  const handleDownload = () => {
    const svg = svgRef.current
    if (!svg) return

    const W = 460
    const H = 580
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const svgImg = new Image()

    svgImg.onload = () => {
      // Fondo blanco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)

      // Franja superior dorada
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(0, 0, W, 6)

      // QR centrado
      const qrSize = 300
      const qrX = (W - qrSize) / 2
      const qrY = 40
      ctx.drawImage(svgImg, qrX, qrY, qrSize, qrSize)

      // Cargar logo
      const logo = new Image()
      logo.onload = () => {
        // Logo proporcionado (ancho máx 180px)
        const logoW = 180
        const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW
        const logoX = (W - logoW) / 2
        const logoY = qrY + qrSize + 24

        ctx.drawImage(logo, logoX, logoY, logoW, logoH)

        // "Ask Me Anything · Virtual VIP Concierge"
        ctx.fillStyle = '#92400e'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Ask Me Anything · Virtual VIP Concierge', W / 2, logoY + logoH + 20)

        // Nombre de la propiedad
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 15px sans-serif'
        ctx.fillText(propiedadName, W / 2, logoY + logoH + 42)

        // Separador
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(40, logoY + logoH + 56)
        ctx.lineTo(W - 40, logoY + logoH + 56)
        ctx.stroke()

        // Instrucción
        ctx.fillStyle = '#6b7280'
        ctx.font = '11px sans-serif'
        ctx.fillText('Escanea para acceder a tu concierge personal', W / 2, logoY + logoH + 74)

        const link = document.createElement('a')
        link.download = `ama-qr-${propiedadId}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      logo.src = '/AMAlogo_nb.png'
    }

    svgImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
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

            {/* Preview del QR en el modal */}
            <div className="bg-white rounded-xl p-5 flex flex-col items-center gap-3">
              <QRCodeSVG
                ref={svgRef}
                value={url}
                size={220}
                level="H"
                includeMargin={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/AMAlogo_nb.png" alt="AMA logo" className="h-8 object-contain" />
              <p className="text-gray-800 text-xs font-semibold text-center">{propiedadName}</p>
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
                El QR no vence. Si desactivas la propiedad, AMA responde en modo genérico de ciudad.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
