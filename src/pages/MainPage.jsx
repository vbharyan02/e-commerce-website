import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabase'

export default function MainPage({ session }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [formError, setFormError] = useState(null)
  const [cartMsg, setCartMsg] = useState(null)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('schema cache') || error.message.includes('relation')) {
          setError('Something went wrong. Please try again later.')
        } else {
          setError(error.message)
        }
        return
      }
      setProducts(data)
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) { setFormError('Name is required'); return }
    if (!price || isNaN(price) || parseFloat(price) < 0) { setFormError('Valid price is required'); return }
    if (!stock || isNaN(stock) || parseInt(stock) < 0) { setFormError('Valid stock is required'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('products')
      .insert({ user_id: user.id, name: name.trim(), price: parseFloat(price), stock: parseInt(stock) })
      .select().single()
    if (error) { setFormError(error.message); return }
    setProducts(prev => [data, ...prev])
    setName(''); setPrice(''); setStock('')
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function addToCart(product) {
    if (!session) { navigate('/login'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('cart_items')
      .select('*').eq('user_id', user.id).eq('product_id', product.id).maybeSingle()
    if (existing) {
      await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: product.id, quantity: 1 })
    }
    setCartMsg('Added to cart!')
    setTimeout(() => setCartMsg(null), 2000)
  }

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shop</h1>
        <div className="flex gap-3 items-center text-sm">
          {cartMsg && <span className="text-green-600">{cartMsg}</span>}
          {session ? (
            <>
              <Link to="/cart" className="text-blue-600">Cart</Link>
              <Link to="/orders" className="text-blue-600">Orders</Link>
              <button onClick={() => supabase.auth.signOut().then(() => navigate('/login'))} className="text-gray-500 hover:text-gray-700">Logout</button>
            </>
          ) : (
            <Link to="/login" className="bg-blue-600 text-white px-3 py-1 rounded">Login</Link>
          )}
        </div>
      </div>

      {session && (
        <form onSubmit={handleCreate} className="mb-6 p-4 border rounded space-y-2 bg-gray-50">
          <h2 className="font-semibold text-sm text-gray-700">List a Product</h2>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name"
            className="border rounded px-3 py-2 w-full" />
          <div className="flex gap-2">
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price"
              className="border rounded px-3 py-2 w-full" type="number" step="0.01" min="0" />
            <input value={stock} onChange={e => setStock(e.target.value)} placeholder="Stock qty"
              className="border rounded px-3 py-2 w-full" type="number" min="0" />
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Add Product</button>
        </form>
      )}

      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No products yet. Be the first to list one!</div>
      ) : (
        <ul className="space-y-3">
          {products.map(product => (
            <li key={product.id} className="flex justify-between items-center border rounded p-3">
              <div>
                <Link to={`/product/${product.id}`} className="font-medium hover:text-blue-600">{product.name}</Link>
                <p className="text-sm text-gray-500">${parseFloat(product.price).toFixed(2)} · Stock: {product.stock}</p>
                {product.category && <p className="text-xs text-gray-400">{product.category}</p>}
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => addToCart(product)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Add to Cart</button>
                {session && product.user_id === session.user.id && (
                  <button onClick={() => handleDelete(product.id)}
                    className="text-red-500 text-sm hover:underline">Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
