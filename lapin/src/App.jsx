import { useEffect, useMemo, useState } from 'react'
import { categories, products, storeConfig } from './catalog.js'
import {
  addShopifyCartLine,
  fetchShopifyCart,
  fetchShopifyCollections,
  fetchShopifyProducts,
  removeShopifyCartLine,
  shopifyAccountUrl,
  shopifyEnabled,
  updateShopifyCartLine,
} from './services/shopify.js'

const moneyFormatters = new Map()
function formatMoney(amount, currency = storeConfig.currency) {
  if (!moneyFormatters.has(currency)) {
    moneyFormatters.set(currency, new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }))
  }
  return moneyFormatters.get(currency).format(amount)
}

function formatProductPrice(product) {
  if (!product.variants?.length) return formatMoney(product.price)
  const prices = product.variants.map((variant) => variant.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const currency = product.variants[0].currencyCode
  return minPrice === maxPrice
    ? formatMoney(minPrice, currency)
    : `FROM ${formatMoney(minPrice, currency)}`
}

const campaignImage = 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2200&q=90'

function Icon({ name, size = 19 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
  if (name === 'bag') return <svg {...common}><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
  if (name === 'heart') return <svg {...common}><path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.2 4.2 0 0 1 11 6.5l1 1.2 1-1.2a4.2 4.2 0 0 1 7.8 2.2Z" /></svg>
  if (name === 'menu') return <svg {...common}><path d="M3 7h18M3 12h18M3 17h18" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'arrow') return <svg {...common}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
  return null
}

function LapinMark({ size = 38 }) {
  return (
    <svg className="lapin-mark" width={size} height={size} viewBox="0 0 48 52" fill="none" aria-hidden="true">
      <path d="M8 3 20.5 16.5 23 25 18.5 31 10 23Z" fill="currentColor" />
      <path d="M39 3 26.5 15.5 20.5 27.5 31.5 39 32.5 30.5 26 24.5Z" fill="currentColor" />
      <path d="m18.5 28 8.5-8.5 8 13.5v10.5L25 50l-9.5-6.5c-3.3-2.3-4.3-6.8-2.3-10.2L18.5 28Z" fill="currentColor" />
      <path d="m28 27 5.8-10.5-10.1 9.9 8.8 9.1v-4.1L28 27Z" fill="var(--mark-cutout, #f1e9dc)" />
    </svg>
  )
}

function BrandLockup({ compact = false }) {
  return (
    <span className={compact ? 'brand-lockup brand-lockup-compact' : 'brand-lockup'}>
      <LapinMark size={compact ? 29 : 38} />
      <span className="brand-word">LAPIN</span>
    </span>
  )
}

function readSavedProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem('lapin-saved') || '[]')
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
  } catch (error) {
    console.error('Could not load saved LAPIN products.', error)
    return []
  }
}

function loadCart() {
  try {
    const value = JSON.parse(localStorage.getItem('lapin-cart') || '[]')
    return Array.isArray(value) ? value : []
  } catch (error) {
    console.error('Could not load the saved LAPIN cart.', error)
    return []
  }
}

function App() {
  const [cart, setCart] = useState(loadCart)
  const [shopifyCart, setShopifyCart] = useState(null)
  const [shopifyCartReady, setShopifyCartReady] = useState(!shopifyEnabled)
  const [catalogProducts, setCatalogProducts] = useState(shopifyEnabled ? [] : products)
  const [shopCollections, setShopCollections] = useState([])
  const [storeLoading, setStoreLoading] = useState(shopifyEnabled)
  const [storeError, setStoreError] = useState('')
  const [cartError, setCartError] = useState('')
  const [cartBusy, setCartBusy] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [sizeError, setSizeError] = useState('')
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [wishlist, setWishlist] = useState(readSavedProducts)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState('featured')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [introVisible, setIntroVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountPage, setAccountPage] = useState('')

  useEffect(() => {
    if (!shopifyEnabled) return undefined
    let cancelled = false
    setStoreLoading(true)
    setStoreError('')

    async function loadShopifyStore() {
      try {
        const [remoteProducts, remoteCollections] = await Promise.all([
          fetchShopifyProducts(),
          fetchShopifyCollections(),
        ])
        const savedCartId = localStorage.getItem('lapin-shopify-cart')
        const remoteCart = savedCartId ? await fetchShopifyCart(savedCartId) : null
        if (cancelled) return
        setCatalogProducts(remoteProducts)
        setShopCollections(remoteCollections.filter((collection) => collection.productsCount.count > 0))
        setShopifyCart(remoteCart)
        setShopifyCartReady(true)
        if (savedCartId && !remoteCart) localStorage.removeItem('lapin-shopify-cart')
      } catch (error) {
        console.error('Could not load the LAPIN Shopify storefront.', error)
        if (!cancelled) {
          setCatalogProducts([])
          setStoreError(error instanceof Error ? error.message : 'Shopify storefront could not be loaded.')
        }
      } finally {
        if (!cancelled) setStoreLoading(false)
      }
    }

    loadShopifyStore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (shopifyEnabled) return
    try {
      localStorage.setItem('lapin-cart', JSON.stringify(cart))
    } catch (error) {
      console.error('Could not save the LAPIN cart.', error)
    }
  }, [cart])

  useEffect(() => {
    if (!shopifyEnabled || !shopifyCartReady) return
    try {
      if (shopifyCart?.id) localStorage.setItem('lapin-shopify-cart', shopifyCart.id)
      else localStorage.removeItem('lapin-shopify-cart')
    } catch (error) {
      console.error('Could not persist the LAPIN Shopify cart reference.', error)
      setCartError('Your cart is available for this visit but could not be saved in this browser.')
    }
  }, [shopifyCart, shopifyCartReady])

  useEffect(() => {
    try {
      localStorage.setItem('lapin-saved', JSON.stringify(wishlist))
    } catch (error) {
      console.error('Could not save LAPIN favourites.', error)
    }
  }, [wishlist])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || sessionStorage.getItem('lapin-intro-seen')) return undefined
    setIntroVisible(true)
    const duration = 4000
    const timer = window.setTimeout(() => {
      setIntroVisible(false)
      sessionStorage.setItem('lapin-intro-seen', 'true')
    }, duration)
    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll(
      '.section-heading, .product-card, .category-index-intro, .category-card, .editorial-image, .editorial-copy, .newsletter > div, .newsletter form, .footer-column',
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('motion-reveal', 'motion-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('motion-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' })

    elements.forEach((element, index) => {
      element.classList.add('motion-reveal')
      element.style.setProperty('--motion-delay', `${Math.min(index % 5, 4) * 65}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [activeCategory, searchTerm, showSavedOnly, sortOrder, wishlist])

  useEffect(() => {
    const hasOverlay = cartOpen || searchOpen || selectedProduct || mobileMenuOpen || introVisible || accountPage
    document.body.classList.toggle('no-scroll', Boolean(hasOverlay))
    return () => document.body.classList.remove('no-scroll')
  }, [cartOpen, searchOpen, selectedProduct, mobileMenuOpen, introVisible, accountPage])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setCartOpen(false)
        setSearchOpen(false)
        setSelectedProduct(null)
        setMobileMenuOpen(false)
        setSizeGuideOpen(false)
        setAccountPage('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const visibleProducts = useMemo(() => {
    const filtered = catalogProducts.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory
        || product.collections?.some((collection) => collection.title === activeCategory)
      const matchesSearch = !searchTerm || `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSaved = !showSavedOnly || wishlist.includes(product.id)
      return matchesCategory && matchesSearch && matchesSaved
    })
    if (sortOrder === 'price-asc') return filtered.sort((a, b) => a.price - b.price)
    if (sortOrder === 'price-desc') return filtered.sort((a, b) => b.price - a.price)
    if (sortOrder === 'name') return filtered.sort((a, b) => a.name.localeCompare(b.name))
    return filtered
  }, [activeCategory, catalogProducts, searchTerm, showSavedOnly, sortOrder, wishlist])

  const searchResults = useMemo(() => catalogProducts.filter((product) =>
    !searchTerm || `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [catalogProducts, searchTerm])

  const categoryCards = shopifyEnabled
    ? shopCollections.map((collection) => {
      const featuredProduct = catalogProducts.find((product) => product.collections?.some((item) => item.handle === collection.handle))
      return {
        name: collection.title,
        filter: collection.title,
        image: featuredProduct?.image || collection.image?.url || '',
        alt: featuredProduct?.alt || collection.image?.altText || collection.title,
        comingSoon: false,
        featuredProduct,
        productCount: collection.productsCount.count,
      }
    })
    : categories.map((category) => {
      const categoryProducts = catalogProducts.filter((product) => product.category === category.filter)
      return {
        ...category,
        featuredProduct: categoryProducts[0],
        productCount: categoryProducts.length,
      }
    })

  const cartLines = shopifyEnabled ? shopifyCart?.lines || [] : cart
  const itemCount = shopifyEnabled
    ? shopifyCart?.totalQuantity || 0
    : cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = shopifyEnabled
    ? shopifyCart?.subtotal || 0
    : cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const selectedVariant = selectedProduct?.variants?.find((variant) => variant.id === selectedVariantId)

  function openProduct(product) {
    setSelectedProduct(product)
    setSelectedSize('')
    setSelectedVariantId('')
    setSelectedQuantity(1)
    setSizeError('')
    setSizeGuideOpen(false)
  }

  function toggleSaved(productId) {
    setWishlist((saved) => saved.includes(productId)
      ? saved.filter((id) => id !== productId)
      : [...saved, productId])
  }

  async function addToCart(product, size, quantity) {
    if (!size) {
      setSizeError('Choose a size to continue.')
      return
    }
    if (shopifyEnabled) {
      const variant = product.variants.find((item) => item.id === selectedVariantId)
      if (!variant?.available) {
        setSizeError('That option is unavailable. Choose another variant.')
        return
      }
      setCartBusy(true)
      setCartError('')
      try {
        setShopifyCart(await addShopifyCartLine(shopifyCart?.id, variant.id, quantity))
        setSelectedProduct(null)
        setCartOpen(true)
        setSizeError('')
      } catch (error) {
        console.error('Could not add the product to the Shopify cart.', error)
        setSizeError(error instanceof Error ? error.message : 'Could not add this item. Please try again.')
      } finally {
        setCartBusy(false)
      }
      return
    }
    setCart((items) => {
      const found = items.find((item) => item.id === product.id && item.size === size)
      return found
        ? items.map((item) => item.id === product.id && item.size === size ? { ...item, quantity: item.quantity + quantity } : item)
        : [...items, { ...product, size, quantity }]
    })
    setSelectedProduct(null)
    setCartOpen(true)
    setSizeError('')
  }

  async function updateQuantity(id, size, amount) {
    if (shopifyEnabled) {
      const line = shopifyCart?.lines.find((item) => item.id === id)
      if (!line) return
      const quantity = line.quantity + amount
      setCartBusy(true)
      setCartError('')
      try {
        setShopifyCart(quantity > 0
          ? await updateShopifyCartLine(shopifyCart.id, id, quantity)
          : await removeShopifyCartLine(shopifyCart.id, id))
      } catch (error) {
        console.error('Could not update the Shopify cart.', error)
        setCartError(error instanceof Error ? error.message : 'Could not update your cart. Please try again.')
      } finally {
        setCartBusy(false)
      }
      return
    }
    setCart((items) => items
      .map((item) => item.id === id && item.size === size ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0))
  }

  async function submitNewsletter(event) {
    event.preventDefault()
    if (!newsletterEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      setNewsletterMessage('Enter a valid email address.')
      return
    }
    if (!newsletterConsent) {
      setNewsletterMessage('Please confirm you would like to receive LAPIN updates.')
      return
    }
    if (!storeConfig.newsletterEndpoint) {
      setNewsletterMessage('Newsletter signup is not connected yet. Your email has not been submitted.')
      return
    }
    setNewsletterSubmitting(true)
    setNewsletterMessage('')
    try {
      const response = await fetch(storeConfig.newsletterEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, consent: newsletterConsent }),
      })
      if (!response.ok) throw new Error(`Newsletter request failed with status ${response.status}`)
      setNewsletterMessage('You’re on the list. Keep your eyes open.')
      setNewsletterEmail('')
      setNewsletterConsent(false)
    } catch (error) {
      console.error('LAPIN newsletter signup failed.', error)
      setNewsletterMessage('Signup did not go through. Please try again later.')
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  function openAccountPage(page) {
    setAccountPage(page)
    setMobileMenuOpen(false)
  }

  function goToProducts(category = '') {
    setActiveCategory(category)
    setSearchTerm('')
    setShowSavedOnly(false)
    setMobileMenuOpen(false)
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
  }

  function goToCategories() {
    setMobileMenuOpen(false)
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {introVisible && <div className="intro" role="status" aria-label="LAPIN">
        <div className="intro-lockup"><LapinMark size={44} /><span>LAPIN</span></div>
      </div>}
      <div className="announcement">{storeConfig.announcement}</div>
      <header className="header">
        <button className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
        <a className="brand" href="#home" aria-label="LAPIN home"><BrandLockup compact /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button onClick={() => goToProducts()}>SHOP</button>
          <button onClick={goToCategories}>CATEGORIES</button>
          <a href="#story">FIELD NOTES</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search products"><Icon name="search" /></button>
          <button className="saved-trigger" onClick={() => { setShowSavedOnly(true); setActiveCategory(''); setSearchTerm(''); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }) }} aria-label={`Show saved products, ${wishlist.length} saved`}><Icon name="heart" /><span>{wishlist.length}</span></button>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${itemCount} items`}><Icon name="bag" /><span>BAG ({itemCount})</span></button>
          <button className="account-link" onClick={() => openAccountPage('signin')}>SIGN IN</button>
        </div>
      </header>
      {mobileMenuOpen && <div className="mobile-menu">
        <button className="icon-button overlay-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
        <button onClick={() => goToProducts()}>SHOP THE DROP</button>
        <button onClick={goToCategories}>CATEGORIES</button>
        <a href="#story" onClick={() => setMobileMenuOpen(false)}>FIELD NOTES</a>
        <button onClick={() => openAccountPage('signin')}>SIGN IN</button>
        <button onClick={() => openAccountPage('signup')}>CREATE ACCOUNT</button>
      </div>}

      <main>
        <section className="hero" id="home">
          <div className="hero-copy-panel">
            <div className="hero-edition"><span>INDEPENDENT STREETWEAR</span><span>LAPIN / 001</span></div>
            <p className="eyebrow"><span className="eyebrow-dot" /> MADE FOR YOUR OWN LANE</p>
            <h1>Wear<br />your <em>own</em><br />story.</h1>
            <p className="hero-copy">Retro roots. New-age attitude.<br />Find your own kind of uniform.</p>
            <div className="hero-actions">
              <button className="button button-light" onClick={goToCategories}>SHOP THE COLLECTION <Icon name="arrow" /></button>
              <span className="hero-caption">CLOTHES FOR YOUR EVERYDAY REBELLION</span>
            </div>
            <span className="hero-mark-watermark"><LapinMark size={330} /></span>
          </div>
          <div className="hero-image-panel" style={{ '--hero-image': `url("${campaignImage}")` }}>
            <span className="hero-image-label">LAPIN — THE EVERYDAY EDIT</span>
            <button className="hero-image-link" onClick={() => goToProducts()} aria-label="Shop the collection"><Icon name="arrow" /></button>
          </div>
        </section>

        <section className="categories-section" id="categories">
          <div className="category-index-intro"><p className="eyebrow">01 — FIND YOUR FIT</p><h2>Shop by<br /><em>your mood.</em></h2><p>Start with what feels like you.</p></div>
          <div className="category-index">{categoryCards.map((category, index) => {
            const featuredProduct = category.featuredProduct
            return <button className="category-card" key={category.name} onClick={() => goToProducts(category.filter)} disabled={category.comingSoon}>
              <span className="category-card-image">
                <img src={featuredProduct?.image || category.image} alt={featuredProduct?.alt || category.alt} loading="lazy" />
                <span className="category-card-shade" />
                <span className="category-card-heading"><span className="category-index-number">0{index + 1}</span><span>{category.name}</span></span>
                <span className="category-card-caption">{featuredProduct?.name || (category.comingSoon ? 'COMING SOON' : `${category.productCount} PIECES`)}</span>
                <span className="category-card-arrow"><Icon name="arrow" /></span>
              </span>
            </button>
          })}</div>
        </section>

        <section className="section collection-section" id="shop">
          <div className="section-heading">
            <div><p className="eyebrow"><span className="eyebrow-dot" /> 02 — THE LAPIN EDIT</p><h2>Made to be<br /><em>worn your way.</em></h2><p className="section-subtitle">Everyday pieces. A little out of the ordinary.</p></div>
            <div className="catalog-notice"><span>●</span> {shopifyEnabled ? 'LIVE SHOPIFY CATALOGUE' : 'SAMPLE EDIT · PRICES ARE INDICATIVE'}</div>
          </div>
          {storeLoading && <p className="store-status" role="status">LOADING THE LAPIN COLLECTION…</p>}
          {storeError && <p className="store-status store-error" role="alert">The live store could not be loaded: {storeError}</p>}
          <div className="catalog-tools">
            <div className="filter-row" aria-label="Product filters">
              {['All pieces', ...(shopifyEnabled ? shopCollections.map((collection) => collection.title) : ['Graphic tees', 'Oversized tees', 'Hoodies'])].map((category) => <button className={!showSavedOnly && activeCategory === (category === 'All pieces' ? '' : category) ? 'filter active' : 'filter'} key={category} onClick={() => { setShowSavedOnly(false); setActiveCategory(category === 'All pieces' ? '' : category) }}>{category}</button>)}
              <button className={showSavedOnly ? 'filter active saved-filter' : 'filter saved-filter'} onClick={() => { setShowSavedOnly((saved) => !saved); setActiveCategory('') }} aria-pressed={showSavedOnly}><Icon name="heart" size={14} /> SAVED <span>{wishlist.length}</span></button>
            </div>
            <label className="sort-control">SORT
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort products">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>
          {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product, index) => <article className="product-card" key={product.id}>
            <div className="product-visual">
              <button className="product-image" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
              <img src={product.image} alt={product.alt} loading="lazy" width="800" height="1000" />
              <span className="product-index">0{index + 1}</span>
              <span className="quick-view">VIEW PIECE <Icon name="arrow" /></span>
              </button>
              <button className={wishlist.includes(product.id) ? 'save-product saved' : 'save-product'} onClick={() => toggleSaved(product.id)} aria-label={`${wishlist.includes(product.id) ? 'Remove' : 'Save'} ${product.name} ${wishlist.includes(product.id) ? 'from' : 'to'} saved pieces`} aria-pressed={wishlist.includes(product.id)}><Icon name="heart" size={17} /></button>
            </div>
            <div className="product-info"><div><h3>{product.name}</h3><p>{product.color} <span className="swatch" /></p></div><span className="product-price">{formatProductPrice(product)}</span></div>
            <p className="sample-label">{shopifyEnabled ? (product.variants.some((variant) => variant.available) ? 'IN STOCK · LIVE PRICE' : 'CURRENTLY UNAVAILABLE') : 'SAMPLE · INDICATIVE PRICE'}</p>
            <button className="quick-add" onClick={() => openProduct(product)}>SELECT SIZE <span>+</span></button>
          </article>)}</div> : <div className="empty-state"><p>{storeLoading ? 'Your collection is on its way.' : showSavedOnly ? 'Your saved edit is empty.' : storeError ? 'Live products are temporarily unavailable.' : 'Nothing in this lane yet.'}</p><button className="text-link" onClick={() => { setSearchTerm(''); setActiveCategory(''); setShowSavedOnly(false) }}>VIEW ALL PIECES <Icon name="arrow" /></button></div>}
          <div className="section-bottom"><span>SHOWING {visibleProducts.length} / {catalogProducts.length} PIECES</span><span>{shopifyEnabled ? `LIVE PRICES · ${storeConfig.currency}` : 'SAMPLE PRICES · INR'}</span></div>
        </section>

        <section className="editorial" id="story">
          <div className="editorial-image"><img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=90" alt="Streetwear editorial portrait in warm afternoon light" loading="lazy" width="1200" height="1500" /><span>FIELD NOTE Nº 01 — OFF THE CLOCK</span></div>
          <div className="editorial-copy"><p className="eyebrow">03 — A NOTE FROM LAPIN</p><h2>Make it<br /><em>your own.</em></h2><p>Good style isn't a uniform. It's the small, personal choices that make it yours. LAPIN is made for wearing your way, wherever the day goes.</p><button className="text-link" onClick={() => goToProducts()}>FIND YOUR PIECE <Icon name="arrow" /></button><span className="editorial-stamp">L<br />P<br />N</span></div>
        </section>

        <section className="newsletter">
          <div><p className="eyebrow light">THE LAPIN LIST</p><h2>GET IN BEFORE<br /><em>EVERYONE ELSE.</em></h2><p>First access to new drops, campaign releases and everything happening at LAPIN.</p></div>
          <form onSubmit={submitNewsletter} noValidate>
            <label htmlFor="newsletter-email">YOUR EMAIL ADDRESS</label>
            <div className="newsletter-control"><input id="newsletter-email" type="email" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /><button type="submit" aria-label="Subscribe"><Icon name="arrow" /></button></div>
            <label className="consent-check"><input type="checkbox" checked={newsletterConsent} onChange={(event) => setNewsletterConsent(event.target.checked)} /><span>Send me LAPIN drop notes. Unsubscribe whenever.</span></label>
            <button className="newsletter-submit" type="submit" disabled={newsletterSubmitting}>{newsletterSubmitting ? 'SENDING…' : 'JOIN THE LIST'} <Icon name="arrow" size={15} /></button>
            <p className="form-message" role="status">{newsletterMessage}</p>
          </form>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-top"><div className="footer-brand"><a href="#home" aria-label="LAPIN home"><BrandLockup /></a><p>RETRO ROOTS.<br />NEW-AGE ATTITUDE.</p><span>© {new Date().getFullYear()} LAPIN. ALL RIGHTS RESERVED.</span></div>
          <div className="footer-column"><h3>SHOP</h3><button onClick={() => goToProducts()}>All products</button><button onClick={() => goToProducts()}>New drop</button><button onClick={() => goToProducts('Graphic tees')}>Tops</button></div>
          <div className="footer-column"><h3>HELP</h3><a href={storeConfig.contactEmail ? `mailto:${storeConfig.contactEmail}` : 'mailto:hello@lapin.example?subject=Contact%20LAPIN'}>Contact <small>{storeConfig.contactEmail ? '' : '(placeholder)'}</small></a><a href="mailto:hello@lapin.example?subject=Shipping%20information">Shipping information <small>(placeholder)</small></a><a href="mailto:hello@lapin.example?subject=Returns">Returns & exchanges <small>(placeholder)</small></a></div>
          <div className="footer-column"><h3>ABOUT</h3><a href="#story">Our story</a><a href={storeConfig.instagramUrl || 'https://instagram.com/'} target="_blank" rel="noreferrer">Instagram <small>{storeConfig.instagramUrl ? '' : '(placeholder)'}</small></a></div>
          <div className="footer-column"><h3>LEGAL</h3><span>Policies will be published before launch.</span></div>
        </div>
        <div className="footer-bottom"><span>INR · INDIA</span><span>NOT MADE TO BLEND IN.</span><a href="#home">BACK TO TOP ↑</a></div>
      </footer>

      {accountPage && <div className="auth-page">
        <section className="auth-panel" aria-labelledby="auth-title">
          <button className="auth-back" onClick={() => setAccountPage('')}><span aria-hidden="true">←</span> BACK TO LAPIN</button>
          <a className="auth-brand" href="#home" onClick={(event) => { event.preventDefault(); setAccountPage('') }} aria-label="LAPIN home"><BrandLockup /></a>
          <p className="eyebrow">YOUR LAPIN ACCOUNT</p>
          <h1 id="auth-title">{accountPage === 'signin' ? <>Good to<br /><em>see you.</em></> : <>Make it<br /><em>official.</em></>}</h1>
          <p className="auth-intro">{accountPage === 'signin' ? 'Sign in to keep your saved pieces close.' : 'Create an account for your own corner of LAPIN.'}</p>
          <div className="auth-form">
            <p className="auth-preview-note">{shopifyAccountUrl
              ? 'Your LAPIN ID is protected by Shopify. Sign in, create an account, or recover access through the secure Shopify account page.'
              : 'Customer accounts are not connected yet. Add the Shopify store domain and account URL to the local environment configuration.'}</p>
            {shopifyAccountUrl
              ? <a className="button auth-submit" href={shopifyAccountUrl}>CONTINUE TO SHOPIFY <Icon name="arrow" /></a>
                : <button className="button auth-submit" type="button" disabled>SHOPIFY ACCOUNT NOT CONFIGURED</button>}
          </div>
          <p className="auth-switch">Sign-in, account creation, and recovery are handled by Shopify.</p>
        </section>
        <aside className="auth-aside" aria-hidden="true"><img src={campaignImage} alt="" /><span>NOT MADE<br />TO BLEND IN.</span></aside>
      </div>}

      {searchOpen && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}><section className="search-panel" role="dialog" aria-modal="true" aria-label="Search products"><div className="panel-heading"><div><p className="eyebrow">FIND YOUR PIECE</p><h2>SEARCH THE DROP<span>.</span></h2></div><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search"><Icon name="close" /></button></div><div className="search-input-wrap"><Icon name="search" /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Try “hoodie” or “black”" /><button className="text-link" onClick={() => { setSearchOpen(false); setShowSavedOnly(false); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }) }}>VIEW ALL <Icon name="arrow" /></button></div>
        <p className="sample-label">{searchTerm ? `${searchResults.length} MATCH${searchResults.length === 1 ? '' : 'ES'}` : 'A FEW PLACES TO START'}</p>
        <div className="search-results">{searchResults.length ? searchResults.map((product) => <button key={product.id} className="search-result" onClick={() => { setSearchOpen(false); openProduct(product) }}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.category} / {product.color}</small></span><b>{formatMoney(product.price, product.variants?.[0]?.currencyCode)}</b></button>) : <p className="search-empty">No pieces in this lane. Try another search.</p>}</div>
      </section></div>}

      {cartOpen && <div className="overlay drawer-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag"><div className="drawer-header"><div><p className="eyebrow">YOUR SELECTION</p><h2>THE BAG <span>({itemCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><Icon name="close" /></button></div><p className="cart-notice">{shopifyEnabled ? 'LIVE CART · INVENTORY AND PRICES VERIFIED BY SHOPIFY' : 'SAMPLE CART · INDICATIVE PRICES · CHECKOUT NOT CONNECTED'}</p>
        {cartError && <p className="store-status store-error" role="alert">{cartError}</p>}
        {cartLines.length ? <><div className="cart-items">{cartLines.map((item) => <div className="cart-item" key={shopifyEnabled ? item.id : `${item.id}-${item.size}`}><img src={item.image} alt={item.alt} /><div className="cart-item-details"><strong>{item.name}</strong><span>{item.color ? `${item.color} / ` : ''}Size {item.size}</span><span>{formatMoney(item.price, shopifyEnabled ? shopifyCart.currencyCode : undefined)}{shopifyEnabled ? '' : ' · sample price'}</span><div className="quantity"><button disabled={cartBusy} onClick={() => updateQuantity(item.id, item.size, -1)} aria-label={`Decrease ${item.name} quantity`}>−</button><span>{item.quantity}</span><button disabled={cartBusy} onClick={() => updateQuantity(item.id, item.size, 1)} aria-label={`Increase ${item.name} quantity`}>+</button><button className="remove-item" disabled={cartBusy} onClick={() => shopifyEnabled ? updateQuantity(item.id, item.size, -item.quantity) : setCart((items) => items.filter((entry) => entry.id !== item.id || entry.size !== item.size))}>REMOVE</button></div></div></div>)}</div><div className="cart-summary"><div><span>{shopifyEnabled ? 'Subtotal' : 'Subtotal (sample)'}</span><strong>{formatMoney(subtotal, shopifyEnabled ? shopifyCart.currencyCode : undefined)}</strong></div><p>{shopifyEnabled ? 'Shipping, taxes, and final payable total are confirmed securely at Shopify checkout.' : 'Shipping and taxes are calculated after real store rules are configured.'}</p>{shopifyEnabled
          ? <button className="button checkout-button" disabled={cartBusy || !shopifyCart?.checkoutUrl} onClick={() => { window.location.assign(shopifyCart.checkoutUrl) }}>SECURE CHECKOUT <Icon name="arrow" /></button>
          : <button className="button checkout-button" disabled>CHECKOUT — NOT CONFIGURED</button>}<button className="continue-shopping" onClick={() => setCartOpen(false)}>CONTINUE SHOPPING</button></div></> : <div className="cart-empty"><p>{storeLoading ? 'Restoring your bag…' : 'Your bag is taking a quiet moment.'}</p><button className="button" onClick={() => { setCartOpen(false); goToProducts() }}>EXPLORE THE DROP <Icon name="arrow" /></button></div>}</aside></div>}

      {selectedProduct && <div className="overlay product-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelectedProduct(null)}><section className="product-modal" role="dialog" aria-modal="true" aria-label={`${selectedProduct.name} details`}><button className="icon-button modal-close" onClick={() => setSelectedProduct(null)} aria-label="Close product details"><Icon name="close" /></button><img className="modal-product-image" src={selectedProduct.image} alt={selectedProduct.alt} /><div className="modal-product-info"><p className="eyebrow">{selectedProduct.category}{shopifyEnabled ? '' : ' / SAMPLE'}</p><h2>{selectedProduct.name}</h2>      <p className="modal-price">{formatMoney(selectedVariant?.price ?? selectedProduct.price, selectedVariant?.currencyCode || selectedProduct.variants?.[0]?.currencyCode)} <small>{shopifyEnabled ? 'LIVE STORE PRICE' : 'INDICATIVE SAMPLE PRICE'}</small></p><p className="modal-description">{shopifyEnabled ? selectedProduct.description : 'This is a replaceable sample listing. Product description, materials, care details, inventory and final price need to be supplied before launch.'}</p><div className="size-select-heading"><p className="size-label">SELECT OPTION <span>REQUIRED</span></p><button className="size-guide-trigger" onClick={() => setSizeGuideOpen((open) => !open)} aria-expanded={sizeGuideOpen}>SIZE GUIDE <span>↗</span></button></div>{sizeGuideOpen && <div className="size-guide"><strong>FIT NOTES</strong><p>{shopifyEnabled ? 'Refer to the sizing and fit guidance provided in this product description.' : 'Size measurements have not been supplied for this sample. Compare against a similar garment you own; exact garment measurements will be added when confirmed.'}</p></div>}<div className="size-options">{(selectedProduct.variants || selectedProduct.sizes.map((size) => ({ id: size, title: size, size, available: true }))).map((variant) => <button className={selectedVariantId === variant.id ? 'size-option selected' : 'size-option'} key={variant.id} disabled={!variant.available} onClick={() => { setSelectedVariantId(variant.id); setSelectedSize(variant.title); setSizeError('') }} aria-pressed={selectedVariantId === variant.id}>{variant.title}{shopifyEnabled && !variant.available ? ' · SOLD OUT' : ''}</button>)}</div><div className="detail-quantity"><span>QUANTITY</span><div className="quantity"><button onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{selectedQuantity}</span><button onClick={() => setSelectedQuantity((quantity) => quantity + 1)} aria-label="Increase quantity">+</button></div></div><p className="size-error" role="alert">{sizeError}</p><button className="button add-to-bag" disabled={cartBusy} onClick={() => addToCart(selectedProduct, selectedSize, selectedQuantity)}>{cartBusy ? 'ADDING…' : shopifyEnabled ? 'ADD TO BAG' : 'ADD SAMPLE TO BAG'} <Icon name="arrow" /></button><p className="modal-footnote">{shopifyEnabled ? 'Secure checkout and final order totals are handled by Shopify.' : 'No real order or payment will be created in this preview.'}</p></div></section></div>}
    </>
  )
}

export default App
