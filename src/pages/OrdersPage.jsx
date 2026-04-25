import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-600 border border-amber-200',
  confirmed: 'bg-blue-50 text-blue-600 border border-blue-200',
  shipped:   'bg-purple-50 text-purple-600 border border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  cancelled: 'bg-red-50 text-red-500 border border-red-200',
}

export default function OrdersPage({ session }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('orders').select('*')
        .eq('user_id', session.user.id).order('created_at', { ascending: false })
      if (error) {
        setError(error.message.includes('does not exist') || error.message.includes('schema cache')
          ? 'Something went wrong. Please try again later.' : error.message)
        return
      }
      setOrders(data)
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 tracking-tight">ShopApp</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/cart" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">Cart</Link>
            <Link to="/" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">Shop</Link>
            <button
              onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Orders</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-lg font-semibold text-slate-700">No orders yet</p>
            <p className="text-sm text-slate-400 mt-1">Your orders will appear here</p>
            <Link to="/" className="inline-block mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                      Order #{String(orders.length - i).padStart(3, '0')}
                    </p>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">${parseFloat(order.total_amount).toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {order.shipping_address && (
                      <p className="text-sm text-slate-400 mt-1">📍 {order.shipping_address}</p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">Delivery:</span>{' '}
                      {order.delivery_date
                        ? new Date(order.delivery_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : <span className="text-slate-400">Not scheduled</span>
                      }
                    </p>
                  </div>
                  <span className={`text-xs font-semibold capitalize px-3 py-1.5 rounded-full flex-shrink-0 ${STATUS_STYLES[order.status] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
