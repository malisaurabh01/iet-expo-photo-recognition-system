import { useState, useRef } from 'react'
import { useToast } from '../components/ToastContext'
import BASE_URL from '../utils/api'

const ADMIN_PASSWORD = 'ietexpo2026'

export default function AdminPage() {
    const showToast = useToast()
    const [loggedIn, setLoggedIn] = useState(false)
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState(false)

    /* Stats */
    const [stats, setStats] = useState({ total_photos: 0, total_faces: 0, total_searches: 0, total_matched: 0 })
    const [recentUploads, setRecentUploads] = useState([])

    /* Upload */
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadText, setUploadText] = useState('')
    const [showProgress, setShowProgress] = useState(false)
    const fileInputRef = useRef(null)
    const dropRef = useRef(null)

    /* Download */
    const [downloadStatus, setDownloadStatus] = useState('')
    const [downloadingAll, setDownloadingAll] = useState(false)

    /* Background particles & stars */
    const particles = useRef(null)
    const starsDots = useRef(null)
    if (!particles.current) {
        const colors = ['#00d4ff', '#7c3aed', '#34d399', '#f472b6', '#fb923c']
        particles.current = Array.from({ length: 30 }, (_, i) => {
            const sz = Math.random() * 4 + 1; const clr = colors[Math.floor(Math.random() * colors.length)]
            return {
                key: i, sz, clr, left: Math.random() * 100, top: Math.random() * 100,
                fx: (Math.random() * 60 - 30).toFixed(0), fy: (Math.random() * 60 - 30).toFixed(0),
                dur: (Math.random() * 8 + 6).toFixed(1), delay: (Math.random() * 5).toFixed(1)
            }
        })
    }
    if (!starsDots.current) {
        starsDots.current = Array.from({ length: 100 }, (_, i) => {
            const sz = Math.random() * 2.5 + 0.5
            return {
                key: i, sz, left: Math.random() * 100, top: Math.random() * 100,
                t: (Math.random() * 3 + 1).toFixed(1), op: (Math.random() * 0.7 + 0.3).toFixed(2),
                delay: (Math.random() * 3).toFixed(2)
            }
        })
    }

    const adminLogin = () => {
        if (password === ADMIN_PASSWORD) {
            setLoggedIn(true); setLoginError(false); loadStats()
            showToast('Welcome, Admin! 🎉', 'success')
        } else {
            setLoginError(true); showToast('Incorrect password', 'error')
        }
    }

    const adminLogout = () => { setLoggedIn(false); setPassword(''); setLoginError(false) }

    const loadStats = async () => {
        try {
            const res = await fetch(BASE_URL + '/api/stats')
            const data = await res.json()
            setStats({
                total_photos: data.total_photos, total_faces: data.total_faces,
                total_searches: data.total_searches, total_matched: data.total_matched
            })
            setRecentUploads(data.recent_uploads || [])
        } catch { showToast('Failed to load stats', 'error') }
    }

    /* Drag & Drop */
    const handleDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
    const handleDragLeave = () => { dropRef.current?.classList.remove('drag-over') }
    const handleDrop = (e) => {
        e.preventDefault(); dropRef.current?.classList.remove('drag-over')
        if (e.dataTransfer.files.length) {
            setSelectedFiles(Array.from(e.dataTransfer.files))
        }
    }

    const handleEventUpload = (e) => {
        setSelectedFiles(Array.from(e.target.files))
    }

    const startUpload = async () => {
        if (!selectedFiles.length) { showToast('Select photos first', 'error'); return }
        setUploading(true); setShowProgress(true); setUploadProgress(0)
        const batchSize = 5
        const totalBatches = Math.ceil(selectedFiles.length / batchSize)
        let totalProcessed = 0, totalFaces = 0
        try {
            for (let i = 0; i < totalBatches; i++) {
                const batch = selectedFiles.slice(i * batchSize, (i + 1) * batchSize)
                const formData = new FormData()
                batch.forEach(f => formData.append('photos', f))
                const res = await fetch(BASE_URL + '/api/upload-event', { method: 'POST', body: formData })
                const data = await res.json()
                totalProcessed += data.photos_processed || 0
                totalFaces += data.faces_detected || 0
                const progress = Math.round(((i + 1) / totalBatches) * 100)
                setUploadProgress(progress)
                setUploadText(`Processing batch ${i + 1}/${totalBatches} — ${totalProcessed} photos, ${totalFaces} faces`)
            }
            showToast(`Uploaded ${totalProcessed} photos, ${totalFaces} faces detected! 🎉`, 'success')
            setUploadText(`✅ Done! ${totalProcessed} photos uploaded, ${totalFaces} faces found.`)
            setSelectedFiles([])
            if (fileInputRef.current) fileInputRef.current.value = ''
            loadStats()
        } catch (err) {
            showToast('Upload failed: ' + err.message, 'error')
            setUploadText('❌ Upload failed. Please try again.')
        }
        setUploading(false)
        setTimeout(() => setShowProgress(false), 5000)
    }

    const downloadAllPhotos = async () => {
        setDownloadingAll(true); setDownloadStatus('Fetching photo list...')
        try {
            const statsResp = await fetch(BASE_URL + '/api/stats')
            const statsData = await statsResp.json()
            if (!statsData.recent_uploads || statsData.recent_uploads.length === 0) {
                showToast('No photos to download', 'info'); setDownloadStatus('No photos available.')
                setDownloadingAll(false); return
            }
            const filenames = statsData.recent_uploads.map(u => u.filename)
            setDownloadStatus(`Zipping ${filenames.length} photos...`)
            const resp = await fetch(BASE_URL + '/api/download-zip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames }),
            })
            if (resp.ok) {
                const blob = await resp.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'IET_Expo_All_Photos.zip'; a.click()
                window.URL.revokeObjectURL(url)
                showToast('Download started! 📦', 'success')
                setDownloadStatus('✅ ZIP download started!')
            } else {
                showToast('Download failed', 'error'); setDownloadStatus('❌ Download failed. Try again.')
            }
        } catch (err) {
            showToast('Download error: ' + err.message, 'error'); setDownloadStatus('❌ Error: ' + err.message)
        }
        setDownloadingAll(false)
    }

    const deleteAllData = async () => {
        if (!window.confirm('⚠️ Are you sure? This will permanently delete ALL photos and data!')) return
        if (!window.confirm('This action CANNOT be undone. Continue?')) return
        const pwd = window.prompt('Enter admin password to proceed:')
        if (pwd === null) return
        try {
            const res = await fetch(BASE_URL + '/api/delete-all', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd }),
            })
            if (res.ok) { showToast('All data deleted successfully', 'success'); loadStats() }
            else if (res.status === 401) showToast('Unauthorized: wrong password', 'error')
            else showToast('Failed to delete data', 'error')
        } catch { showToast('Delete failed', 'error') }
    }

    return (
        <>
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
                    {starsDots.current.map(s => (
                        <div key={s.key} className="hero-star-dot" style={{
                            width: s.sz, height: s.sz, left: s.left + '%', top: s.top + '%',
                            '--t': s.t + 's', '--op': s.op, animationDelay: s.delay + 's',
                        }} />
                    ))}
                </div>
            </div>

            {/* Login Gate */}
            {!loggedIn && (
                <div className="page-container">
                    <div className="login-gate">
                        <div className="login-card">
                            <span className="login-icon">🔐</span>
                            <h2>Admin Access</h2>
                            <p>Enter the admin password to access the dashboard</p>
                            <div className="form-group">
                                <label htmlFor="adminPassword">Password</label>
                                <input type="password" id="adminPassword" className="form-input" placeholder="Enter admin password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') adminLogin() }} />
                            </div>
                            <button className="btn btn-primary" onClick={adminLogin} style={{ width: '100%', justifyContent: 'center' }}>
                                <span className="btn-icon">🔓</span> Login
                            </button>
                            {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 16 }}>Incorrect password. Try again.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard */}
            {loggedIn && (
                <div className="page-container admin-page">
                    <h1 className="page-title"><span className="gradient-text">Admin Dashboard</span></h1>
                    <p className="page-desc">Manage photos, view analytics, and control the system</p>

                    {/* Stats */}
                    <div className="stats-grid">
                        {[
                            { icon: '📷', value: stats.total_photos, label: 'Total Photos' },
                            { icon: '👤', value: stats.total_faces, label: 'Faces Detected' },
                            { icon: '🔍', value: stats.total_searches, label: 'Total Searches' },
                            { icon: '✅', value: stats.total_matched, label: 'Photos Matched' },
                        ].map((s, i) => (
                            <div key={i} className="stat-card">
                                <span className="stat-icon">{s.icon}</span>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Upload */}
                    <div className="admin-section">
                        <h3>📤 Upload Event Photos</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                            Upload photos taken at the expo. The system will automatically detect faces and create encodings for matching.
                        </p>
                        <div ref={dropRef} className="upload-zone" onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                            onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                            <span className="upload-zone-icon">📁</span>
                            <h3>Drop Event Photos Here</h3>
                            <p>Upload multiple photos at once • JPG, PNG, WEBP</p>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleEventUpload} />
                        </div>
                        {showProgress && (
                            <div className="progress-bar-container active">
                                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: uploadProgress + '%' }} /></div>
                                <p className="progress-text">{uploadText}</p>
                            </div>
                        )}
                        {selectedFiles.length > 0 && !uploading && (
                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                                <p style={{ color: '#94a3b8', fontSize: 14 }}>{selectedFiles.length} photo(s) selected</p>
                                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={startUpload} disabled={uploading}>
                                    <span className="btn-icon">{uploading ? '⏳' : '🚀'}</span> {uploading ? 'Processing...' : 'Upload & Process'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Recent Uploads */}
                    <div className="admin-section">
                        <h3>📋 Recent Uploads</h3>
                        <table className="uploads-table">
                            <thead>
                                <tr><th>Thumbnail</th><th>Filename</th><th>Upload Time</th></tr>
                            </thead>
                            <tbody>
                                {recentUploads.length === 0 ? (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No photos uploaded yet</td></tr>
                                ) : recentUploads.map((u, i) => (
                                    <tr key={i}>
                                        <td><img src={`${BASE_URL}/uploads/${u.filename}`} alt={u.original_name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} /></td>
                                        <td>{u.original_name || u.filename}</td>
                                        <td>{u.upload_time || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Download */}
                    <div className="admin-section">
                        <h3>📥 Download Photos</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Download all uploaded event photos as a ZIP archive.</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary btn-sm" onClick={downloadAllPhotos} disabled={downloadingAll}>
                                <span className="btn-icon">{downloadingAll ? '⏳' : '⬇️'}</span> {downloadingAll ? 'Preparing ZIP...' : 'Download All Photos'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={loadStats}><span className="btn-icon">🔄</span> Refresh List</button>
                        </div>
                        {downloadStatus && <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>{downloadStatus}</p>}
                    </div>

                    {/* Danger Zone */}
                    <div className="admin-section" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <h3>⚠️ Danger Zone</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
                            This will permanently delete all photos, face data, and match logs.
                        </p>
                        <button className="btn btn-danger btn-sm" onClick={deleteAllData}>
                            <span className="btn-icon">🗑️</span> Delete All Data
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="text-center" style={{ marginTop: 32 }}>
                        <button className="btn btn-secondary btn-sm" onClick={loadStats}><span className="btn-icon">🔄</span> Refresh Stats</button>
                        <button className="btn btn-secondary btn-sm" onClick={adminLogout} style={{ marginLeft: 12 }}>
                            <span className="btn-icon">🚪</span> Logout
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
