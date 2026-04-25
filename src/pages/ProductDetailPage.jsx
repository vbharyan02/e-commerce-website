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

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse w-full max-w-2xl px-4 space-y-4">
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-8 bg-slate-200 rounded w-3/4" />
        <div className="h-6 bg-slate-200 rounded w-1/4" />
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-700 transition-colors">← Back to Shop</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 tracking-tight">ShopApp</Link>
          <div className="flex items-center gap-4 text-sm">
            {session && <Link to="/cart" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">Cart</Link>}
            <Link to="/" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">← Shop</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-600" />
          <div className="p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{product.name}</h1>
                {product.category && (
                  <span className="inline-block bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full mt-2 font-medium">
                    {product.category}
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold text-indigo-600">${parseFloat(product.price).toFixed(2)}</p>
            </div>

            {product.description && (
              <p className="text-slate-600 mt-5 leading-relaxed">{product.description}</p>
            )}

            <div className="mt-5">
              <span className={`inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {product.stock > 0 ? `✓ ${product.stock} in stock` : '✕ Out of stock'}
              </span>
            </div>

            {product.stock > 0 && (
              <div className="flex items-center gap-3 mt-6">
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-3 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                  >−</button>
                  <span className="px-4 py-2.5 text-sm font-semibold border-x border-slate-200 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="px-3 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                  >+</button>
                </div>
                <button
                  onClick={addToCart}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Add to Cart
                </button>
              </div>
            )}

            {message && (
              <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <p className="text-emerald-700 text-sm font-medium">{message}</p>
                {session && <Link to="/cart" className="text-emerald-700 underline text-sm font-medium">View Cart →</Link>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
