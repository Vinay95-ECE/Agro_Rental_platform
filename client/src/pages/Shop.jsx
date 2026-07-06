import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { ShoppingCart, Tag, Filter, Check, ShoppingBag, ShieldAlert, Award } from 'lucide-react';
import { updateGamification } from '../store/authSlice';
import { useToast } from '../context/ToastContext';


const Shop = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const toast = useToast();

  // Shop catalogs
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All', 'Seed', 'Fertilizer'
  const [category, setCategory] = useState('All');

  // Shopping Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const typeParam = filterType !== 'All' ? `&type=${filterType}` : '';
      const catParam = category !== 'All' ? `&category=${category}` : '';
      const searchParam = search ? `&search=${search}` : '';
      const response = await axios.get(`/api/products?${typeParam}${catParam}${searchParam}`);
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error('Error fetching shop items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterType, category, search]);

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.warning(`Only ${product.stock} units available in stock.`, 'Stock Limit');
        return;
      }
      setCart(cart.map(item =>
        item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart!`, 'Added to Cart');
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const updateQuantity = (id, amount) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const newQty = Math.max(1, item.quantity + amount);
        if (newQty > item.stock) {
          toast.warning(`Only ${item.stock} units available.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };


  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      toast.error('Please provide a shipping address.', 'Address Required');
      return;
    }
    setCheckoutLoading(true);
    try {
      const orderItems = cart.map(item => ({ productId: item._id, quantity: item.quantity }));
      const orderRes = await axios.post('/api/products/order', {
        items: orderItems, shippingAddress
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (orderRes.data.success) {
        const { order, razorpayOrderId } = orderRes.data;
        const verifyRes = await axios.post('/api/products/order/verify', {
          orderId: order._id, razorpayOrderId
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (verifyRes.data.success) {
          toast.success(
            `Order placed! Earned ${verifyRes.data.coinsEarned} Agri Coins ☁ XP rewards applied.`,
            'Order Confirmed ✅'
          );
          if (user) {
            dispatch(updateGamification({
              xp: user.xp + (verifyRes.data.coinsEarned * 5),
              coins: user.coins + verifyRes.data.coinsEarned,
              badge: user.badge
            }));
          }
          setCart([]);
          setShippingAddress('');
          setIsCartOpen(false);
          fetchProducts();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };


  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Seed & Fertilizer Marketplace</h1>
          <p className="text-slate-400 text-xs mt-1">Acquire certified high-yield seeds and premium soil inputs from local verified shops.</p>
        </div>
        
        {/* Shopping Cart Button */}
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/15 transition-all text-xs"
        >
          <ShoppingCart size={18} />
          Cart Catalog ({cart.reduce((acc, item) => acc + item.quantity, 0)})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Filters */}
        <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter size={16} className="text-emerald-400" /> Search Filters
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search Keyword</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Basmati, NPK..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-bold">Product Type</label>
              <div className="flex flex-col gap-2">
                {['All', 'Seed', 'Fertilizer'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`w-full text-left py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      filterType === t
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-750'
                    }`}
                  >
                    {t === 'All' ? 'All Products' : t === 'Seed' ? 'High-Yield Seeds' : 'Organic Fertilizers'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="text-center py-24 text-slate-500">Loading catalog items...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 text-slate-500">No seeds or fertilizers matched your query.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product._id} className="glass-card overflow-hidden rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="relative">
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&q=80&w=400'}
                      alt={product.name}
                      className="h-44 w-full object-cover"
                    />
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                      {product.type}
                    </span>
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white leading-tight">{product.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-xs">
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Price per bag</p>
                          <p className="text-emerald-400 font-extrabold mt-0.5">₹{product.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">In Stock</p>
                          <p className={`font-bold mt-0.5 ${product.stock > 10 ? 'text-slate-300' : 'text-amber-500'}`}>
                            {product.stock} bags
                          </p>
                        </div>
                      </div>

                      {product.stock > 0 ? (
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag size={14} /> Add to Cart
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-slate-800 text-slate-500 border border-slate-850 py-2.5 rounded-xl text-xs font-semibold cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cart Slider Drawer overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-8 overflow-y-auto space-y-8 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="text-emerald-400" size={22} /> Shopping Cart
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-xs px-2.5 py-1 bg-slate-950/40 rounded-lg border border-slate-850"
                >
                  Close
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs">
                  Your cart is empty. Add high-yield seeds or compost fertilizers from our listings.
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item._id} className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-emerald-400 font-bold">₹{item.price} each</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item._id, -1)}
                          className="bg-slate-800 text-white font-bold w-6 h-6 flex items-center justify-center rounded text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs text-white font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, 1)}
                          className="bg-slate-800 text-white font-bold w-6 h-6 flex items-center justify-center rounded text-xs"
                        >
                          +
                        </button>
                        
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-red-400 hover:text-red-300 font-bold text-xs ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-6 border-t border-slate-800 pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400">Products Subtotal:</span>
                    <span className="text-white">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Coins Rewards:</span>
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <Award size={14} /> +{Math.round(cartTotal / 100)} Agri Coins
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Shipping Address</label>
                    <textarea
                      required
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Enter full shipping details..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-700 resize-none"
                    ></textarea>
                  </div>

                  {token ? (
                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      {checkoutLoading ? 'Processing Sandbox Payment...' : 'Checkout & Pay via Razorpay'}
                    </button>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2">
                      <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                      <p>You must be logged in to verify transactions and place orders.</p>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
