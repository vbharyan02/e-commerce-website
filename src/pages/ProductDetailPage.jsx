import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

export default function ProductDetailPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState(null)

  useEffect(() => { fetchProduct() }, [id])

  async function fetchProduct() {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) throw error
      setProduct(data)
    } catch {
      setError('Product not found.')
    } finally {
      setIsLoading(false)
    }
  }

  async function addToCart() {
    if (!session) { navigate('/login'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('cart_items')
      .select('*').eq('user_id', user.id).eq('product_id', id).maybeSingle()
    if (existing) {
      await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: id, quantity })
    }
    setMessage('Added to cart!')
  }

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
      <Link to="/" className="text-blue-600 text-sm">← Back to Shop</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{product.name}</h1>
      {product.description && <p className="text-gray-600 mb-4">{product.description}</p>}
      {product.category && <p className="text-xs text-gray-400 mb-2">{product.category}</p>}
      <p className="text-2xl font-semibold mb-1">${parseFloat(product.price).toFixed(2)}</p>
      <p className="text-sm text-gray-500 mb-6">In stock: {product.stock}</p>
      {product.stock > 0 ? (
        <div className="flex items-center gap-3">
          <input type="number" min="1" max={product.stock} value={quantity}
            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="border rounded px-3 py-2 w-20" />
          <button onClick={addToCart} className="bg-blue-600 text-white px-6 py-2 rounded">
            Add to Cart
          </button>
        </div>
      ) : (
        <p className="text-red-500">Out of stock</p>
      )}
      {message && <p className="mt-3 text-green-600 text-sm">{message}</p>}
      {session && (
        <Link to="/cart" className="block mt-4 text-blue-600 text-sm">View Cart →</Link>
      )}
    </div>
  )
}
