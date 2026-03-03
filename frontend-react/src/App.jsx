import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import FindPage from './pages/FindPage'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ToastProvider } from './components/ToastContext'

export default function App() {
    return (
        <ToastProvider>
            <div className="bg-animation" />
            <Navbar />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/find" element={<FindPage />} />
                <Route path="/admin" element={<AdminPage />} />
            </Routes>
            <Footer />
        </ToastProvider>
    )
}
