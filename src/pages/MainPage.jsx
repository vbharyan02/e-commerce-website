import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabase'

const GRADIENTS = [
  'from-indigo-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-blue-400 to-cyan-500',
  'from-violet-400 to-fuchsia-500',
  'from-amber-400 to-orange-500',
]

function ProductSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden animate-pulse">
      <div className="h-24 bg-slate-200 dark:bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-8 bg-slate-200 dark:bg-gray-700 rounded mt-4" />
      </div>
    </div>
  )
}

export default function MainPage({ session, darkMode, toggleDarkMode }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [listingDate, setListingDate] = useState('')
  const [formError, setFormError] = useState(null)
  const [cartMsg, setCartMsg] = useState(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    fetchProducts()
    if (session) fetchCartCount()
  }, [session])

  async function fetchCartCount() {
    const { count } = await supabase
      .from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id)
    setCartCount(count || 0)
  }

  async function fetchProducts() {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (error) {
        setError(error.message.includes('does not exist') || error.message.includes('schema cache') || error.message.includes('relation')
          ? 'Something went wrong. Please try again later.' : error.message)
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
      .insert({ user_id: user.id, name: name.trim(), price: parseFloat(price), stock: parseInt(stock), listing_date: listingDate || null })
      .select().single()
    if (error) { setFormError(error.message); return }
    setProducts(prev => [data, ...prev])
    setName(''); setPrice(''); setStock(''); setListingDate('')
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
    setCartCount(prev => prev + 1)
    setCartMsg('Added to cart!')
    setTimeout(() => setCartMsg(null), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600 tracking-tight">ShopApp</span>
          <div className="flex items-center gap-5 text-sm">
            {cartMsg && <span className="text-emerald-600 font-medium">{cartMsg}</span>}
            {session ? (
              <>
                <Link to="/cart" className="relative text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
                  Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Orders</Link>
                <button
                  onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >Logout</button>
              </>
            ) : (
              <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm">
                Sign In
              </Link>
            )}
            <button
              onClick={toggleDarkMode}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-lg"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-widest mb-2">Welcome to ShopApp</p>
          <h2 className="text-3xl font-extrabold">Discover Amazing Products</h2>
          <p className="text-indigo-100 mt-2 text-lg">Browse our curated collection of quality items</p>
          {!session && (
            <Link to="/login" className="inline-block mt-5 bg-white text-indigo-600 font-semibold px-6 py-2.5 rounded-full hover:bg-indigo-50 transition-all duration-200 shadow-sm">
              Shop Now →
            </Link>
          )}
        </div>

        {session && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4">List a New Product</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={name} onChange={e => setName(e.target.value)} placeholder="Product name"
                className="w-full border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-400 rounded-lg px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
              <div className="flex gap-3">
                <input
                  value={price} onChange={e => setPrice(e.target.value)} placeholder="Price ($)"
                  type="number" step="0.01" min="0"
                  className="flex-1 border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-400 rounded-lg px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                <input
                  value={stock} onChange={e => setStock(e.target.value)} placeholder="Stock qty"
                  type="number" min="0"
                  className="flex-1 border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-400 rounded-lg px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <input
                value={listingDate} onChange={e => setListingDate(e.target.value)}
                type="date"
                className="border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 rounded-lg px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 w-full"
              />
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm">
                Add Product
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-center py-8 rounded-2xl">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-lg font-semibold text-slate-700 dark:text-gray-200">No products yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Be the first to list one above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
                <div className={`h-24 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
                <div className="p-4">
                  <Link to={`/product/${product.id}`} className="font-semibold text-slate-800 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 block">
                    {product.name}
                  </Link>
                  {product.category && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{product.category}</p>}
                  <p className="text-xl font-bold text-indigo-600 mt-2">${parseFloat(product.price).toFixed(2)}</p>
                  <p className={`text-xs mt-1 font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </p>
                  {product.listing_date && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Listed: {product.listing_date}</p>
                  )}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      Add to Cart
                    </button>
                    {session && product.user_id === session.user.id && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                      >✕</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">© 2025 ShopApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
