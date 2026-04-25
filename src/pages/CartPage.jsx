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
        .insert({ user_id: session.user.id, total_amount: total, status: 'pending' })
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

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <Link to="/" className="text-blue-600 text-sm">← Back to Shop</Link>
      </div>
      {cartItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Your cart is empty. <Link to="/" className="text-blue-600">Start shopping</Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3 mb-6">
            {cartItems.map(item => {
              const p = productsMap[item.product_id]
              return (
                <li key={item.id} className="flex justify-between items-center border rounded p-3">
                  <div>
                    <p className="font-medium">{p?.name || 'Unknown product'}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity} × ${parseFloat(p?.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium">${(parseFloat(p?.price || 0) * item.quantity).toFixed(2)}</p>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm hover:underline">Remove</button>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex justify-between items-center border-t pt-4">
            <p className="text-xl font-bold">Total: ${total.toFixed(2)}</p>
            <button onClick={checkout} disabled={checkingOut}
              className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">
              {checkingOut ? 'Placing Order...' : 'Checkout'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
