import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

export default function CartPage({ session }) {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [productsMap, setProductsMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')

  useEffect(() => { fetchCart() }, [])

  async function fetchCart() {
    setIsLoading(true)
    setError(null)
    try {
      const { data: items, error: err } = await supabase
        .from('cart_items').select('*').eq('user_id', session.user.id)
      if (err) throw err
      if (items.length > 0) {
        const ids = [...new Set(items.map(i => i.product_id))]
        const { data: prods, error: prodErr } = await supabase.from('products').select('*').in('id', ids)
        if (prodErr) throw prodErr
        const map = {}
        prods.forEach(p => { map[p.id] = p })
        setProductsMap(map)
      }
      setCartItems(items)
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function removeItem(id) {
    const { error } = await supabase.from('cart_items').delete().eq('id', id)
    if (!error) setCartItems(prev => prev.filter(i => i.id !== id))
  }

  async function checkout() {
    setCheckingOut(true)
    setError(null)
    try {
      const total = cartItems.reduce((sum, item) => {
        const p = productsMap[item.product_id]
        return sum + (p ? parseFloat(p.price) * item.quantity : 0)
      }, 0)
      const { data: order, error: orderErr } = await supabase.from('orders')
        .insert({ user_id: session.user.id, total_amount: total, status: 'pending', delivery_date: deliveryDate || null })
        .select().single()
      if (orderErr) throw orderErr
      const orderItems = cartItems.map(item => ({
        user_id: session.user.id,
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: parseFloat(productsMap[item.product_id]?.price || 0)
      }))
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr
      await supabase.from('cart_items').delete().eq('user_id', session.user.id)
      navigate('/orders')
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckingOut(false)
    }
  }

  const total = cartItems.reduce((sum, item) => {
    const p = productsMap[item.product_id]
    return sum + (p ? parseFloat(p.price) * item.quantity : 0)
  }, 0)

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 tracking-tight">ShopApp</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">← Shop</Link>
            <button
              onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Cart</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-lg font-semibold text-slate-700">Your cart is empty</p>
            <p className="text-sm text-slate-400 mt-1">Add some products to get started</p>
            <Link to="/" className="inline-block mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map(item => {
                const p = productsMap[item.product_id]
                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p?.name || 'Unknown product'}</p>
                      <p className="text-sm text-slate-500 mt-0.5">Qty: {item.quantity} × ${parseFloat(p?.price || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-800">${(parseFloat(p?.price || 0) * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors"
                      >Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
                <h2 className="font-bold text-slate-800 text-lg mb-4">Order Summary</h2>
                <div className="space-y-2 text-sm text-slate-600 mb-5">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-emerald-600 font-medium">Free</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between font-bold text-slate-800 text-base">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery Date <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <button
                  onClick={checkout}
                  disabled={checkingOut}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {checkingOut ? 'Placing Order...' : 'Checkout →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
