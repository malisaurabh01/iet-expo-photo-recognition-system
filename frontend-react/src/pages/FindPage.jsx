import { useState, useRef, useEffect } from 'react'
import { useToast } from '../components/ToastContext'
import Lightbox from '../components/Lightbox'
import BASE_URL from '../utils/api'

export default function FindPage() {
    const showToast = useToast()
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [matches, setMatches] = useState([])
    const [noResults, setNoResults] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const dropRef = useRef(null)
    const fileInputRef = useRef(null)

    /* Background particles & stars */
    const particles = useRef(null)
    const stars = useRef(null)
    if (!particles.current) {
        const colors = ['#00d4ff', '#7c3aed', '#34d399', '#f472b6', '#fb923c']
        particles.current = Array.from({ length: 30 }, (_, i) => {
            const sz = Math.random() * 4 + 1
            const clr = colors[Math.floor(Math.random() * colors.length)]
            return {
                key: i, sz, clr, left: Math.random() * 100, top: Math.random() * 100,
                fx: (Math.random() * 60 - 30).toFixed(0), fy: (Math.random() * 60 - 30).toFixed(0),
                dur: (Math.random() * 8 + 6).toFixed(1), delay: (Math.random() * 5).toFixed(1)
            }
        })
    }
    if (!stars.current) {
        stars.current = Array.from({ length: 100 }, (_, i) => {
            const sz = Math.random() * 2.5 + 0.5
            return {
                key: i, sz, left: Math.random() * 100, top: Math.random() * 100,
                t: (Math.random() * 3 + 1).toFixed(1), op: (Math.random() * 0.7 + 0.3).toFixed(2),
                delay: (Math.random() * 3).toFixed(2)
            }
        })
    }

    const handleDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
    const handleDragLeave = () => { dropRef.current?.classList.remove('drag-over') }
    const handleDrop = (e) => {
        e.preventDefault(); dropRef.current?.classList.remove('drag-over')
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
    }
    const handleFile = (f) => {
        if (!f) return
        if (f.size > 10 * 1024 * 1024) { showToast('File too large. Max 10MB allowed.', 'error'); return }
        setFile(f)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(f)
    }
    const resetUpload = () => { setFile(null); setPreview(null); setError(''); if (fileInputRef.current) fileInputRef.current.value = '' }
    const resetAndSearch = () => { resetUpload(); setMatches([]); setNoResults(false) }

    const findMyPhotos = async () => {
        if (!file) { showToast('Please select a selfie first', 'error'); return }
        const formData = new FormData()
        formData.append('selfie', file)
        setLoading(true); setError(''); setMatches([]); setNoResults(false)
        try {
            const res = await fetch(BASE_URL + '/api/find-matches', { method: 'POST', body: formData })
            const data = await res.json()
            setLoading(false)
            if (!res.ok) { setError(data.error || 'An error occurred'); showToast(data.error || 'Failed', 'error'); return }
            if (data.matches && data.matches.length > 0) {
                setMatches(data.matches)
                showToast(`Found ${data.count} photos! 🎉`, 'success')
            } else {
                setNoResults(true)
                showToast('No matching photos found', 'info')
            }
        } catch {
            setLoading(false)
            setError('Network error. Please check if the server is running.')
            showToast('Connection error', 'error')
        }
    }

    const downloadSingle = (filename) => {
        const a = document.createElement('a'); a.href = BASE_URL + '/api/download/' + filename; a.download = filename; a.click()
        showToast('Downloading photo...', 'success')
    }

    const downloadAll = async () => {
        if (!matches.length) return
        setDownloading(true)
        try {
            const resp = await fetch(BASE_URL + '/api/download-zip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames: matches.map(m => m.filename) }),
            })
            if (resp.ok) {
                const blob = await resp.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'IET_Expo_My_Photos.zip'; a.click()
                window.URL.revokeObjectURL(url)
                showToast('Download started! 📦', 'success')
            } else showToast('Failed to create ZIP', 'error')
        } catch { showToast('Download failed', 'error') }
        setDownloading(false)
    }

    return (
        <>
            <Lightbox />
            <div className="bg-animation" />
            <div className="admin-bg-particles">
                {particles.current.map(p => (
                    <div key={p.key} className="admin-particle" style={{
                        width: p.sz, height: p.sz, left: p.left + '%', top: p.top + '%',
                        background: p.clr, boxShadow: `0 0 ${p.sz * 3}px ${p.clr}`,
                        '--fx': p.fx + 'px', '--fy': p.fy + 'px',
                        animationDuration: p.dur + 's', animationDelay: p.delay + 's',
                    }} />
                ))}
                <div className="hero-stars">
                    {stars.current.map(s => (
                        <div key={s.key} className="hero-star-dot" style={{
                            width: s.sz, height: s.sz, left: s.left + '%', top: s.top + '%',
                            '--t': s.t + 's', '--op': s.op, animationDelay: s.delay + 's',
                        }} />
                    ))}
                </div>
            </div>

            <div className="page-container">
                <h1 className="page-title"><span className="gradient-text">Find Yourself</span></h1>
                <p className="page-desc">Upload a clear selfie and we'll find all your photos from the expo</p>

                {/* Upload */}
                {!loading && matches.length === 0 && !noResults && (
                    <div>
                        {!preview ? (
                            <div ref={dropRef} className="upload-zone" onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                                onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                <span className="upload-zone-icon">🤳</span>
                                <h3>Upload Your Selfie</h3>
                                <p>Drag & drop your selfie here, or click to browse</p>
                                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Supports: JPG, PNG, WEBP • Max 10MB</p>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} />
                            </div>
                        ) : (
                            <div className="preview-container active">
                                <img className="preview-image" src={preview} alt="Your selfie" />
                                <p className="preview-name">{file?.name}</p>
                                <div className="text-center">
                                    <button className="btn btn-primary" onClick={findMyPhotos}><span className="btn-icon">🔍</span> Find My Photos</button>
                                    <button className="btn btn-secondary btn-sm" onClick={resetUpload} style={{ marginLeft: 12 }}>Change Photo</button>
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

                {/* Results */}
                {matches.length > 0 && (
                    <div className="results-section active">
                        <div className="results-header">
                            <div>
                                <h2 style={{ fontSize: 24, marginBottom: 4 }}>Your Photos</h2>
                                <p className="results-count">Found <span>{matches.length}</span> photos</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button className="btn btn-primary btn-sm" onClick={downloadAll} disabled={downloading}>
                                    <span className="btn-icon">{downloading ? '⏳' : '⬇️'}</span> {downloading ? 'Zipping...' : 'Download All'}
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={resetAndSearch}><span className="btn-icon">🔄</span> New Search</button>
                            </div>
                        </div>
                        <div className="results-grid">
                            {matches.map((m, i) => (
                                <div key={i} className="result-card">
                                    <img src={`${BASE_URL}/uploads/${m.filename}`} alt="Matched photo" loading="lazy"
                                        onClick={() => window.__openLightbox?.(`${BASE_URL}/uploads/${m.filename}`)} />
                                    <div className="result-overlay">
                                        <button className="result-download-btn" onClick={e => { e.stopPropagation(); downloadSingle(m.filename) }}>⬇ Download</button>
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
                        <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={resetAndSearch}><span className="btn-icon">🔄</span> Try Again</button>
                    </div>
                )}
            </div>
        </>
    )
}
