import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-main">
                {/* About */}
                <div className="footer-col" style={{ paddingRight: 20 }}>
                    <div className="footer-about-logo">IET KKWAGH EXPO</div>
                    <p className="footer-about-desc">
                        Working Model Contest — Showcasing Ideas of the Future. An elite platform for engineering students
                        to demonstrate innovative solutions and working models.
                    </p>
                    <div className="social-icons">
                        <a href="https://whatsapp.com/channel/0029Vb6wbfCEawdhmOJG3c3b" target="_blank" rel="noreferrer" className="social-icon" title="WhatsApp Channel">
                            <svg viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.927 3.149.929 3.178 0 5.765-2.587 5.767-5.766.002-3.181-2.587-5.769-5.767-5.769m3.158 8.169c-.161.455-.951.89-1.319.925-.371.036-.763.125-2.527-.565-2.132-.834-3.488-3.003-3.593-3.144-.106-.142-.857-1.144-.857-2.182 0-1.038.539-1.549.729-1.758.191-.209.414-.262.553-.262.138 0 .276.007.399.013.129.006.302-.047.472.361.176.425.602 1.474.656 1.585.056.113.093.245.023.385-.069.141-.106.226-.213.351-.106.126-.226.269-.319.351-.106.101-.22.213-.102.417.118.204.526.868 1.127 1.402.775.688 1.419.902 1.625 1.006.206.104.327.086.448-.053.121-.139.521-.607.66-.816.138-.209.277-.174.464-.105.187.069 1.189.561 1.393.663.204.103.34.156.39.243.048.087.048.503-.113.957" /></svg>
                        </a>
                        <a href="https://www.instagram.com/iet.kkwagh.expo" target="_blank" rel="noreferrer" className="social-icon" title="Instagram">
                            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        </a>
                        <a href="https://youtube.com/@ietkkwaghexpo" target="_blank" rel="noreferrer" className="social-icon" title="YouTube">
                            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.083 0 12 0 12s0 3.917.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.917 24 12 24 12s0-3.917-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                        </a>
                        <a href="https://www.linkedin.com/in/ietexpo" target="_blank" rel="noreferrer" className="social-icon" title="LinkedIn">
                            <svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                        </a>
                    </div>
                </div>

                {/* Get in Touch */}
                <div className="footer-col">
                    <h3>Get in Touch</h3>
                    <div className="footer-contact-item">
                        <span className="icon">🏢</span>
                        <div>
                            <strong>Venue Address</strong><br />
                            K. K. Wagh Institute of Engineering Education and Research,<br />
                            Hirabai Haridas Vidyanagari, Mumbai Agra Road, Amrutdham,<br />
                            Panchavati, Nashik, Maharashtra – 422003
                        </div>
                    </div>
                    <a href="https://maps.app.goo.gl/tRV8KzvawSPEq2WA9" target="_blank" rel="noreferrer" className="footer-directions-btn">
                        🌍 Get Directions
                    </a>
                </div>

                {/* Contact Details */}
                <div className="footer-col">
                    <h3>Contact Details</h3>
                    <div className="footer-contact-item">
                        <span className="icon">📞</span>
                        <div><strong>Harshada Chawande</strong> (President) : <a href="tel:+917498216909">+91 74982 16909</a></div>
                    </div>
                    <div className="footer-contact-item">
                        <span className="icon">📞</span>
                        <div><strong>Yugant Nandre</strong> (Vice President) : <a href="tel:+918793221203">+91 87932 21203</a></div>
                    </div>
                    <div className="footer-contact-item">
                        <span className="icon">✉️</span>
                        <div><a href="mailto:ietkexpo@kkwagh.expo.com">ietkexpo@kkwagh.expo.com</a></div>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="footer-copyright">© 2026 IET K. K. Wagh EXPO. All Rights Reserved.</div>
                <div className="footer-credit">Designed & Developed for <Link to="/">IET KKWAGH EXPO 2026</Link></div>
            </div>
        </footer>
    )
}
