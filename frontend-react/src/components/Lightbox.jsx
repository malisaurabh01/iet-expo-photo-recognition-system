import { useState, useEffect, useCallback } from 'react'

export default function Lightbox() {
    const [src, setSrc] = useState('')
    const [active, setActive] = useState(false)

    const open = useCallback((imgSrc) => {
        setSrc(imgSrc)
        setActive(true)
        document.body.style.overflow = 'hidden'
    }, [])

    const close = useCallback(() => {
        setActive(false)
        document.body.style.overflow = ''
    }, [])

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') close() }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [close])

    // Expose open function globally for easy access
    useEffect(() => {
        window.__openLightbox = open
        return () => { delete window.__openLightbox }
    }, [open])

    if (!active) return null

    return (
        <div className="lightbox active" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
            <div className="lightbox-close" onClick={close}>✕</div>
            <img src={src} alt="Photo" />
        </div>
    )
}
