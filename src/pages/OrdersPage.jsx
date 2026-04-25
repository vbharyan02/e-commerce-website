import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const STATUS_COLOR = {
  pending: 'text-yellow-600',
  confirmed: 'text-blue-600',
  shipped: 'text-purple-600',
  delivered: 'text-green-600',
  cancelled: 'text-red-500'
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
        if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
          setError('Something went wrong. Please try again later.')
        } else {
          setError(error.message)
        }
        return
      }
      setOrders(data)
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Orders</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/cart" className="text-blue-600">Cart</Link>
          <Link to="/" className="text-blue-600">Shop</Link>
          <button onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
            className="text-gray-500 hover:text-gray-700">Logout</button>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No orders yet. <Link to="/" className="text-blue-600">Start shopping</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map(order => (
            <li key={order.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="font-medium mt-1">${parseFloat(order.total_amount).toFixed(2)}</p>
                  {order.shipping_address && <p className="text-sm text-gray-500 mt-1">{order.shipping_address}</p>}
                </div>
                <span className={`text-sm font-medium capitalize ${STATUS_COLOR[order.status] || 'text-gray-600'}`}>
                  {order.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
