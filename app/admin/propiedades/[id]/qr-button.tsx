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
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 480)
      ctx.drawImage(img, 40, 40, 320, 320)
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('AMA · Ask Me Anything', 200, 400)
      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#555555'
      ctx.fillText(propiedadName, 200, 425)
      const link = document.createElement('a')
      link.download = `ama-qr-${propiedadId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
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

            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
              <QRCodeSVG
                ref={svgRef}
                value={url}
                size={240}
                level="H"
                includeMargin={false}
              />
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
