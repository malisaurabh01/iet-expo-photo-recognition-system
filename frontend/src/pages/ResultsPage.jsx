import { useState, useRef } from 'react'
import { useToast } from '../components/ToastContext'
import Lightbox from '../components/Lightbox'
import BASE_URL from '../utils/api'

export default function ResultsPage() {
    const showToast = useToast()
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [matches, setMatches] = useState([])
    const [noResults, setNoResults] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const fileInputRef = useRef(null)
    const dropRef = useRef(null)

    const handleFile = (f) => {
        if (!f) return
        if (f.size > 10 * 1024 * 1024) { showToast('File too large. Max 10MB.', 'error'); return }
        setFile(f)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(f)
    }

    const handleDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
    const handleDragLeave = () => dropRef.current?.classList.remove('drag-over')
    const handleDrop = (e) => {
        e.preventDefault()
        dropRef.current?.classList.remove('drag-over')
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
    }

    const resetUpload = () => {
        setFile(null); setPreview(null); setError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const newSearch = () => { resetUpload(); setMatches([]); setNoResults(false) }

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
        a.download = filename
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
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
                a.href = url; a.download = 'IET_Expo_My_Photos.zip'
                document.body.appendChild(a); a.click(); document.body.removeChild(a)
                setTimeout(() => window.URL.revokeObjectURL(url), 1000)
                showToast('Download started! 📦', 'success')
            }
        } catch { showToast('Download failed', 'error') }
        setDownloading(false)
    }

    return (
        <>
            <Lightbox />
            <div className="page-container">
                <h1 className="page-title">
                    <span className="gradient-text">Find Yourself</span>
                </h1>
                <p className="page-desc">Upload a clear selfie and we'll find all your photos from the expo</p>

                {/* Upload Section */}
                {!loading && matches.length === 0 && !noResults && (
                    <div id="uploadSection">
                        {!preview ? (
                            <div
                                ref={dropRef}
                                className="upload-zone"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span className="upload-zone-icon">🤳</span>
                                <h3>Upload Your Selfie</h3>
                                <p>Drag &amp; drop your selfie here, or click to browse</p>
                                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                    Supports: JPG, PNG, WEBP • Max 10MB
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleFile(e.target.files[0])}
                                />
                            </div>
                        ) : (
                            <div className="preview-container active">
                                <img className="preview-image" src={preview} alt="Your selfie" />
                                <p className="preview-name">{file?.name}</p>
                                <div className="text-center">
                                    <button className="btn btn-primary" onClick={findPhotos}>
                                        <span className="btn-icon">🔍</span> Find My Photos
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

                {/* Loading */}
                {loading && (
                    <div className="loader-container active">
                        <div className="loader" />
                        <p className="loader-text">Analyzing your face and searching photos...</p>
                        <p className="loader-subtext">This may take a moment for large galleries</p>
                    </div>
                )}

                {/* Results Grid */}
                {matches.length > 0 && (
                    <div className="results-section active">
                        <div className="results-header">
                            <div>
                                <h2 style={{ fontSize: 24, marginBottom: 4 }}>Your Photos</h2>
                                <p className="results-count">Found <span>{matches.length}</span> photos</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button className="btn btn-primary btn-sm" onClick={downloadAll} disabled={downloading}>
                                    <span className="btn-icon">{downloading ? '⏳' : '⬇️'}</span>
                                    {downloading ? 'Zipping...' : 'Download All'}
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={newSearch}>
                                    <span className="btn-icon">🔄</span> New Search
                                </button>
                            </div>
                        </div>
                        <div className="results-grid">
                            {matches.map((m, i) => (
                                <div key={i} className="result-card">
                                    <img
                                        src={`${BASE_URL}/uploads/${m.filename}`}
                                        alt="Matched photo"
                                        loading="lazy"
                                        onClick={() => window.__openLightbox?.(`${BASE_URL}/uploads/${m.filename}`)}
                                    />
                                    <div className="result-overlay">
                                        <button
                                            className="result-download-btn"
                                            onClick={e => { e.stopPropagation(); downloadOne(m.filename) }}
                                        >
                                            ⬇ Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Results */}
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
            </div>
        </>
    )
}
