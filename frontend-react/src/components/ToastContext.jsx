import { createContext, useContext, useCallback, useState } from 'react'

const ToastContext = createContext()

export function useToast() {
    return useContext(ToastContext)
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map((t) => {
                    const icons = { success: '✅', error: '❌', info: 'ℹ️' }
                    return (
                        <div key={t.id} className={`toast ${t.type}`}>
                            <span>{icons[t.type] || icons.info}</span>
                            <span>{t.message}</span>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}
