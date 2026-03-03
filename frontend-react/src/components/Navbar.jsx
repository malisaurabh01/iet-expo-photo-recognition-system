import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        setMenuOpen(false)
    }, [location])

    const isActive = (path) => location.pathname === path

    return (
        <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <img
                    src="https://res.cloudinary.com/dw2s4mtjh/image/upload/v1769850766/3.jpg_r8rmyc.jpg"
                    alt="IET K K WAGH EXPO"
                    style={{ height: 44, width: 44, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ color: 'var(--text-primary, #f1f5f9)', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
                    IET K K WAGH EXPO
                </span>
            </Link>

            <div className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                <span /><span /><span />
            </div>

            <ul className={`nav-links${menuOpen ? ' active' : ''}`}>
                <li><Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
                <li><Link to="/find" className={isActive('/find') ? 'active' : ''}>Find Yourself</Link></li>
                <li><Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Admin</Link></li>
            </ul>
        </nav>
    )
}
