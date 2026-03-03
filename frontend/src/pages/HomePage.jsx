import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../components/ToastContext'
import Lightbox from '../components/Lightbox'
import BASE_URL from '../utils/api'

/* ─── Gear SVG path (reused) ─── */
const GEAR_PATH = "M43.3 5.6l-3 10.5a35 35 0 00-8.5 3.5l-10-4.7-9.3 9.3 4.7 10a35 35 0 00-3.5 8.5L3.2 46l0 13.1 10.5 3a35 35 0 003.5 8.5l-4.7 10 9.3 9.3 10-4.7a35 35 0 008.5 3.5l3 10.5 13.1 0 3-10.5a35 35 0 008.5-3.5l10 4.7 9.3-9.3-4.7-10a35 35 0 003.5-8.5l10.5-3 0-13.1-10.5-3a35 35 0 00-3.5-8.5l4.7-10-9.3-9.3-10 4.7a35 35 0 00-8.5-3.5l-3-10.5ZM50 32a18 18 0 110 36 18 18 0 010-36Z"

const STATUS_MSGS = ['Booting robotics module…', 'Calibrating power systems…', 'Scanning agri sensors…', 'Connecting IoT nodes…', 'Charging EV model…']
const DONE_MSGS = ['✓ Robotics online', '✓ Power systems ready', '✓ AgriTech live', '✓ IoT connected', '✓ EV model active']
const PROJECTS = [
    { icon: '🤖', name: 'Robotics' },
    { icon: '⚡', name: 'Smart Grid' },
    { icon: '🌱', name: 'Agri-Tech' },
    { icon: '🛰️', name: 'IoT Sensor' },
    { icon: '🔋', name: 'EV Model' },
]
const PARTICLES = [
    { clr: '#7c3aed', size: 5, dur: '3.2s', delay: '.5s', tx: -150, ty: -90 },
    { clr: '#06b6d4', size: 4, dur: '2.8s', delay: '1.1s', tx: 120, ty: -120 },
    { clr: '#10b981', size: 6, dur: '3.5s', delay: '.3s', tx: 160, ty: 70 },
    { clr: '#f59e0b', size: 4, dur: '2.6s', delay: '1.5s', tx: -110, ty: 110 },
    { clr: '#7c3aed', size: 3, dur: '3s', delay: '.8s', tx: 70, ty: -160 },
    { clr: '#06b6d4', size: 5, dur: '2.9s', delay: '2s', tx: -170, ty: 40 },
    { clr: '#f59e0b', size: 3, dur: '3.8s', delay: '1.3s', tx: 90, ty: 150 },
    { clr: '#10b981', size: 4, dur: '2.5s', delay: '.6s', tx: -60, ty: -170 },
]

export default function HomePage() {
    const showToast = useToast()

    /* ─── Loader state ─── */
    const [loaderVisible, setLoaderVisible] = useState(true)
    const [loaderHiding, setLoaderHiding] = useState(false)
    const [pageReady, setPageReady] = useState(false)
    const [heroActive, setHeroActive] = useState(false)
    const [pct, setPct] = useState(0)
    const [statusText, setStatusText] = useState('Initializing systems…')
    const [cards, setCards] = useState(PROJECTS.map(() => ({ state: 'queued', fill: 0, label: 'QUEUED' })))

    /* ─── Upload / Results state ─── */
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [matches, setMatches] = useState([])
    const [noResults, setNoResults] = useState(false)
    const [downloading, setDownloading] = useState(false)

    const dropRef = useRef(null)
    const fileInputRef = useRef(null)

    /* ─── Loader animation ─── */
    useEffect(() => {
        let cancelled = false
        const animateCard = (idx) => {
            if (cancelled || idx >= 5) return
            setCards(prev => {
                const next = [...prev]
                next[idx] = { ...next[idx], state: 'active', label: 'LOADING' }
                return next
            })
            setStatusText(STATUS_MSGS[idx])

            let p = 0
            const interval = setInterval(() => {
                if (cancelled) { clearInterval(interval); return }
                p = Math.min(p + Math.random() * 14 + 6, 100)
                const globalPct = Math.min((idx / 5 * 100) + (p / 5), 100)
                setPct(Math.floor(globalPct))

                setCards(prev => {
                    const next = [...prev]
                    next[idx] = { ...next[idx], fill: p }
                    return next
                })

                if (p >= 100) {
                    clearInterval(interval)
                    setCards(prev => {
                        const next = [...prev]
                        next[idx] = { state: 'done', fill: 100, label: '✓ DONE' }
                        return next
                    })
                    setStatusText(DONE_MSGS[idx])
                    if (idx < 4) {
                        setTimeout(() => animateCard(idx + 1), 120)
                    } else {
                        setPct(100)
                        setStatusText('⚡ All systems ready — launching…')
                        setTimeout(() => {
                            setLoaderHiding(true)
                            window.scrollTo(0, 0)
                            setTimeout(() => {
                                setLoaderVisible(false)
                                setPageReady(true)
                                setTimeout(() => setHeroActive(true), 100)
                            }, 1000)
                        }, 800)
                    }
                }
            }, 45)
        }
        setTimeout(() => animateCard(0), 1400)
        return () => { cancelled = true }
    }, [])

    /* ─── Stars for loader ─── */
    const loaderStars = useRef(null)
    if (!loaderStars.current) {
        loaderStars.current = Array.from({ length: 80 }, (_, i) => {
            const sz = Math.random() * 2 + 0.5
            return {
                key: i, sz,
                top: Math.random() * 100, left: Math.random() * 100,
                t: (Math.random() * 3 + 1.5).toFixed(1),
                op: (Math.random() * 0.6 + 0.3).toFixed(2),
                delay: (Math.random() * 3).toFixed(2),
            }
        })
    }

    /* ─── Hero particles & stars ─── */
    const heroParticles = useRef(null)
    const heroStars = useRef(null)
    if (!heroParticles.current) {
        const colors = ['#00d4ff', '#7c3aed', '#34d399', '#f472b6', '#fb923c']
        heroParticles.current = Array.from({ length: 40 }, (_, i) => {
            const sz = Math.random() * 4 + 1
            const clr = colors[Math.floor(Math.random() * colors.length)]
            return {
                key: i, sz, clr,
                left: Math.random() * 100, top: Math.random() * 100,
                fx: (Math.random() * 60 - 30).toFixed(0),
                fy: (Math.random() * 60 - 30).toFixed(0),
                dur: (Math.random() * 6 + 4).toFixed(1),
                delay: (Math.random() * 4).toFixed(1),
            }
        })
    }
    if (!heroStars.current) {
        heroStars.current = Array.from({ length: 120 }, (_, i) => {
            const sz = Math.random() * 2.5 + 0.5
            return {
                key: i, sz,
                left: Math.random() * 100, top: Math.random() * 100,
                t: (Math.random() * 3 + 1).toFixed(1),
                op: (Math.random() * 0.7 + 0.3).toFixed(2),
                delay: (Math.random() * 3).toFixed(2),
            }
        })
    }

    /* ─── Drag & Drop ─── */
    const handleDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
    const handleDragLeave = () => { dropRef.current?.classList.remove('drag-over') }
    const handleDrop = (e) => {
        e.preventDefault()
        dropRef.current?.classList.remove('drag-over')
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
    }

    const handleFile = (f) => {
        if (!f) return
        if (f.size > 10 * 1024 * 1024) { showToast('File too large. Max 10MB.', 'error'); return }
        setFile(f)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(f)
    }

    const resetUpload = () => {
        setFile(null); setPreview(null); setError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const newSearch = () => {
        resetUpload(); setMatches([]); setNoResults(false)
    }

    /* ─── Find photos ─── */
    const findPhotos = async () => {
        if (!file) { showToast('Please select a selfie first', 'error'); return }
        const formData = new FormData()
        formData.append('selfie', file)
        setLoading(true); setError(''); setMatches([]); setNoResults(false)

        try {
            const res = await fetch(BASE_URL + '/api/find-matches', { method: 'POST', body: formData })
            const data = await res.json()
            setLoading(false)
            if (!res.ok) {
                setError(data.error || 'An error occurred')
                showToast(data.error || 'Failed to process selfie', 'error')
                return
            }
            if (data.matches && data.matches.length > 0) {
                setMatches(data.matches)
                showToast(`Found ${data.count} photos! 🎉`, 'success')
            } else {
                setNoResults(true)
                showToast('No matching photos found', 'info')
            }
        } catch {
            setLoading(false)
            setError('Network error. Is the server running?')
            showToast('Connection error', 'error')
        }
    }

    const downloadOne = (filename) => {
        const a = document.createElement('a')
        a.href = BASE_URL + '/api/download/' + filename
        a.download = filename; a.click()
        showToast('Downloading...', 'success')
    }

    const downloadAll = async () => {
        if (!matches.length) return
        setDownloading(true)
        try {
            const resp = await fetch(BASE_URL + '/api/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames: matches.map(m => m.filename) }),
            })
            if (resp.ok) {
                const blob = await resp.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'IET_Expo_My_Photos.zip'; a.click()
                window.URL.revokeObjectURL(url)
                showToast('Download started! 📦', 'success')
            }
        } catch { showToast('Download failed', 'error') }
        setDownloading(false)
    }

    return (
        <>
            <Lightbox />

            {/* ═══ LOADER ═══ */}
            {loaderVisible && (
                <div id="loader-page" className={loaderHiding ? 'hidden' : ''}>
                    <div className="stars-container">
                        {loaderStars.current.map(s => (
                            <div key={s.key} className="star-dot" style={{
                                width: s.sz, height: s.sz, top: s.top + '%', left: s.left + '%',
                                '--t': s.t + 's', '--op': s.op, animationDelay: s.delay + 's',
                            }} />
                        ))}
                    </div>
                    <div className="grid-bg" />
                    <div className="orbit-ring ring1" />
                    <div className="orbit-ring ring2" />
                    <div className="orbit-ring ring3" />
                    <div className="orbit-ring ring4" />

                    {/* Gears */}
                    {[
                        { cls: 'gear1', w: 120, fill: 'rgba(124,58,237,1)' },
                        { cls: 'gear2', w: 80, fill: 'rgba(6,182,212,1)' },
                        { cls: 'gear3', w: 60, fill: 'rgba(16,185,129,1)' },
                        { cls: 'gear4', w: 70, fill: 'rgba(245,158,11,1)' },
                    ].map(g => (
                        <div key={g.cls} className={`gear ${g.cls}`}>
                            <svg width={g.w} height={g.w} viewBox="0 0 100 100" fill={g.fill}><path d={GEAR_PATH} /></svg>
                        </div>
                    ))}

                    <div className="rocket">🚀</div>

                    {PARTICLES.map((p, i) => (
                        <div key={i} className="particle" style={{
                            '--clr': p.clr, '--size': p.size + 'px', '--dur': p.dur,
                            '--delay': p.delay, '--tx': p.tx + 'px', '--ty': p.ty + 'px',
                        }} />
                    ))}

                    <div className="loader-center">
                        <div className="label-iet">IET</div>
                        <div className="label-wagh">K K WAGH</div>
                        <div className="expo-word">
                            {['E', 'X', 'P', 'O'].map(l => <span key={l} className="expo-letter">{l}</span>)}
                        </div>
                        <div className="label-wmc">Working Model Contest</div>
                        <div className="sep" />
                        <div className="tagline">Showcasing Ideas of Future</div>

                        <div className="project-strip">
                            {cards.map((c, i) => (
                                <div key={i} className={`proj-card${c.state === 'active' ? ' active' : ''}${c.state === 'done' ? ' done' : ''}`}>
                                    <span className="proj-icon">{PROJECTS[i].icon}</span>
                                    <div className="proj-name">{PROJECTS[i].name}</div>
                                    <div className="proj-bar"><div className="proj-bar-fill" style={{ width: c.fill + '%' }} /></div>
                                    <div className="proj-status">{c.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="progress-wrap">
                            <div className="progress-label-row">
                                <span className="progress-label">SYSTEM BOOT</span>
                                <span className="pct">{pct}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: pct + '%' }} />
                            </div>
                            <div className="status-text">{statusText}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PAGE CONTENT ═══ */}
            <div style={{ opacity: pageReady ? 1 : 0, visibility: pageReady ? 'visible' : 'hidden', transition: 'opacity 0.8s ease, visibility 0.8s ease' }}>

                {/* Hero */}
                <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-12" style={{ position: 'relative', zIndex: 5 }}>
                    <div className="hero-bg-effects">
                        <div className="hero-stars" id="heroStars">
                            {heroActive && heroStars.current.map(s => (
                                <div key={s.key} className="hero-star-dot" style={{
                                    width: s.sz, height: s.sz, left: s.left + '%', top: s.top + '%',
                                    '--t': s.t + 's', '--op': s.op, animationDelay: s.delay + 's',
                                }} />
                            ))}
                        </div>
                        <div className="hero-blob hero-blob-1" />
                        <div className="hero-blob hero-blob-2" />
                        <div className="hero-blob hero-blob-3" />
                        <div className="hero-orbit hero-orbit-1" />
                        <div className="hero-orbit hero-orbit-2" />
                        <div className="hero-orbit hero-orbit-3" />
                        <div className="hero-aurora" />
                        <div className="hero-scan-line" />
                        {[20, 50, 75, 35].map((l, i) => (
                            <div key={i} className="hero-meteor" style={{ '--meteor-left': l + '%', '--meteor-delay': (i * 3 + 1) + 's' }} />
                        ))}
                        <div className="hero-grid-overlay" />
                        <div className="hero-floating-particles">
                            {heroActive && heroParticles.current.map(p => (
                                <div key={p.key} className="hero-particle-dot" style={{
                                    width: p.sz, height: p.sz, left: p.left + '%', top: p.top + '%',
                                    background: p.clr, boxShadow: `0 0 ${p.sz * 3}px ${p.clr}`,
                                    '--float-x': p.fx + 'px', '--float-y': p.fy + 'px',
                                    animationDuration: p.dur + 's', animationDelay: p.delay + 's',
                                }} />
                            ))}
                        </div>
                    </div>

                    <div className={`hero-anim${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.1s' }}>
                        <div className="hero-badge"><span className="hero-badge-dot" /> Photo Recognition System</div>
                    </div>
                    <h1 className={`hero-anim text-5xl md:text-7xl font-bold mt-4 mb-2${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.25s', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
                        <span className="gradient-text">IET K K WAGH</span><br />EXPO
                    </h1>
                    <div className={`hero-anim text-xl md:text-2xl mb-1${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.4s' }}>
                        <span className="subtitle-glow">Working Model Contest</span>
                    </div>
                    <p className={`hero-anim text-text-secondary text-base mb-1${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.55s' }}>Showcasing Ideas of the Future</p>
                    <p className={`hero-anim text-text-muted text-sm mb-6${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.65s' }}>(Formerly known as IET Karmveer Expo)</p>
                    <div className={`hero-anim flex gap-4 flex-wrap justify-center${heroActive ? ' hero-anim-active' : ''}`} style={{ '--anim-delay': '0.8s' }}>
                        <a href="#upload-section" className="btn btn-hero-primary"><span className="btn-icon">📸</span> Find Yourself</a>
                        <a href="/admin" className="btn btn-hero-secondary"><span className="btn-icon">⬆️</span> Drop Photos</a>
                    </div>
                </section>

                {/* Upload Section */}
                <section id="upload-section" className="relative z-10 pt-8 pb-12 px-6">
                    <div className="max-w-xl mx-auto">
                        {/* Upload area */}
                        {!loading && matches.length === 0 && !noResults && (
                            <div>
                                {!preview ? (
                                    <div
                                        ref={dropRef}
                                        className="upload-zone fade-in"
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="upload-zone-icon" style={{ fontSize: 32, marginBottom: 5 }}>🤳</span>
                                        <h3 style={{ fontSize: 18 }}>Drop Your Selfie Here</h3>
                                        <p style={{ fontSize: 14, marginBottom: 0 }}>or click to browse files</p>
                                        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted, #64748b)' }}>Supports: JPG, PNG, WEBP</p>
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} />
                                    </div>
                                ) : (
                                    <div className="preview-container active">
                                        <img className="preview-image" src={preview} alt="Your selfie" />
                                        <p className="preview-name">{file?.name}</p>
                                        <div className="text-center">
                                            <button className="btn btn-primary" onClick={findPhotos}>
                                                <span className="btn-icon">🔍</span> Find Yourself
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={resetUpload} style={{ marginLeft: 12 }}>
                                                Change Photo
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {error && <div className="error-message active">{error}</div>}
                            </div>
                        )}

                        {/* Loader */}
                        {loading && (
                            <div className="loader-container active">
                                <div className="loader" />
                                <p className="loader-text">Analyzing your face and searching photos...</p>
                                <p className="loader-subtext">This may take a moment for large galleries</p>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {matches.length > 0 && (
                        <div className="results-section active" style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <div className="results-header">
                                <div>
                                    <h2 style={{ fontSize: 22, marginBottom: 4 }}>Your Photos</h2>
                                    <p className="results-count">Found <span>{matches.length}</span> photos</p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-sm" onClick={downloadAll} disabled={downloading}>
                                        <span className="btn-icon">{downloading ? '⏳' : '⬇️'}</span> {downloading ? 'Zipping...' : 'Download All'}
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={newSearch}>
                                        <span className="btn-icon">🔄</span> New Search
                                    </button>
                                </div>
                            </div>
                            <div className="results-grid">
                                {matches.map((m, i) => (
                                    <div key={i} className="result-card">
                                        <img src={`${BASE_URL}/uploads/${m.filename}`} alt="Photo" loading="lazy"
                                            onClick={() => window.__openLightbox?.(`${BASE_URL}/uploads/${m.filename}`)} />
                                        <div className="result-overlay">
                                            <button className="result-download-btn" onClick={(e) => { e.stopPropagation(); downloadOne(m.filename) }}>⬇ Download</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No results */}
                    {noResults && (
                        <div className="no-results">
                            <span className="no-results-icon">😔</span>
                            <h3 style={{ marginBottom: 8 }}>No Matches Found</h3>
                            <p>We couldn't find your face in the event photos. Try with a different, clearer selfie.</p>
                            <button className="btn btn-secondary mt-5" onClick={newSearch}>
                                <span className="btn-icon">🔄</span> Try Again
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </>
    )
}
