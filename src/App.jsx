import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import supabase from './lib/supabase'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MainPage from './pages/MainPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-slate-400 text-sm mt-3">Loading...</p>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={session ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/" element={<MainPage session={session} />} />
        <Route path="/product/:id" element={<ProductDetailPage session={session} />} />
        <Route path="/cart" element={session ? <CartPage session={session} /> : <Navigate to="/login" />} />
        <Route path="/orders" element={session ? <OrdersPage session={session} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
