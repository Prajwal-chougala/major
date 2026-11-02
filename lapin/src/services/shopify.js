const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION || '2026-10'
const configuredDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || ''
const storeDomain = configuredDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
const accountUrl = import.meta.env.VITE_SHOPIFY_ACCOUNT_URL || ''

export const shopifyEnabled = Boolean(storeDomain && storefrontToken)
export const shopifyAccountUrl = accountUrl || (storeDomain ? `https://${storeDomain}/account` : '')

const productFields = `
  id
  handle
  title
  description
  productType
  tags
  featuredImage { url altText }
  images(first: 10) { nodes { url altText } }
  collections(first: 20) { nodes { handle title } }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      quantityAvailable
      price { amount currencyCode }
      selectedOptions { name value }
    }
  }
`

const cartFields = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          quantityAvailable
          price { amount currencyCode }
          selectedOptions { name value }
          product {
            id
            handle
            title
            productType
            featuredImage { url altText }
          }
        }
      }
    }
  }
`

async function storefrontRequest(query, variables = {}) {
  if (!shopifyEnabled) throw new Error('Shopify storefront is not configured.')

  const response = await fetch(`https://${storeDomain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) throw new Error(`Shopify Storefront API returned HTTP ${response.status}.`)

  const payload = await response.json()
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '))
  }
  return payload.data
}

function mapProduct(product) {
  const variants = product.variants.nodes.map((variant) => {
    const options = Object.fromEntries(variant.selectedOptions.map(({ name, value }) => [name.toLowerCase(), value]))
    return {
      id: variant.id,
      title: variant.title,
      size: options.size || variant.title,
      color: options.color || '',
      price: Number(variant.price.amount),
      currencyCode: variant.price.currencyCode,
      available: variant.availableForSale,
      quantityAvailable: variant.quantityAvailable,
    }
  })
  const image = product.featuredImage || product.images.nodes[0]
  const productCollections = product.collections.nodes

  return {
    id: product.id,
    handle: product.handle,
    name: product.title,
    description: product.description,
    category: product.productType || productCollections[0]?.title || 'New arrivals',
    collections: productCollections,
    tags: product.tags,
    price: variants[0]?.price || 0,
    color: variants[0]?.color || '',
    sizes: variants.map((variant) => variant.size),
    variants,
    image: image?.url || '',
    alt: image?.altText || product.title,
    note: '',
  }
}

function mapCart(cart) {
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: Number(cart.cost.subtotalAmount.amount),
    currencyCode: cart.cost.subtotalAmount.currencyCode,
    lines: cart.lines.nodes.map((line) => {
      const variant = line.merchandise
      const image = variant.product.featuredImage
      const options = Object.fromEntries(variant.selectedOptions.map(({ name, value }) => [name.toLowerCase(), value]))
      return {
        id: line.id,
        variantId: variant.id,
        productId: variant.product.id,
        handle: variant.product.handle,
        name: variant.product.title,
        category: variant.product.productType,
        size: options.size || variant.title,
        color: options.color || '',
        price: Number(variant.price.amount),
        quantity: line.quantity,
        image: image?.url || '',
        alt: image?.altText || variant.product.title,
        available: variant.availableForSale,
        quantityAvailable: variant.quantityAvailable,
      }
    }),
  }
}

export async function fetchShopifyProducts() {
  const products = []
  let cursor = null
  let hasNextPage = true

  while (hasNextPage) {
    const data = await storefrontRequest(
      `query LapinProducts($after: String) {
        products(first: 100, after: $after, sortKey: BEST_SELLING) {
          nodes { ${productFields} }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after: cursor },
    )
    products.push(...data.products.nodes.map(mapProduct))
    hasNextPage = data.products.pageInfo.hasNextPage
    cursor = data.products.pageInfo.endCursor
  }

  return products
}

export async function fetchShopifyCollections() {
  const data = await storefrontRequest(
    `query LapinCollections {
      collections(first: 100, sortKey: TITLE) {
        nodes {
          id
          handle
          title
          description
          image { url altText }
          productsCount { count }
        }
      }
    }`,
  )
  return data.collections.nodes
}

export async function fetchShopifyCart(cartId) {
  const data = await storefrontRequest(
    `query LapinCart($id: ID!) {
      cart(id: $id) { ${cartFields} }
    }`,
    { id: cartId },
  )
  return data.cart ? mapCart(data.cart) : null
}

export async function addShopifyCartLine(cartId, variantId, quantity) {
  const data = cartId
    ? await storefrontRequest(
      `mutation LapinAddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart { ${cartFields} }
          userErrors { message }
        }
      }`,
      { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    )
    : await storefrontRequest(
      `mutation LapinCreateCart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { ${cartFields} }
          userErrors { message }
        }
      }`,
      { lines: [{ merchandiseId: variantId, quantity }] },
    )

  const result = cartId ? data.cartLinesAdd : data.cartCreate
  if (result.userErrors.length) throw new Error(result.userErrors.map((error) => error.message).join('; '))
  if (!result.cart) throw new Error('Shopify did not return a cart after adding this item.')
  return mapCart(result.cart)
}

export async function updateShopifyCartLine(cartId, lineId, quantity) {
  const data = await storefrontRequest(
    `mutation LapinUpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${cartFields} }
        userErrors { message }
      }
    }`,
    { cartId, lines: [{ id: lineId, quantity }] },
  )
  const result = data.cartLinesUpdate
  if (result.userErrors.length) throw new Error(result.userErrors.map((error) => error.message).join('; '))
  if (!result.cart) throw new Error('Shopify did not return the updated cart.')
  return mapCart(result.cart)
}

export async function removeShopifyCartLine(cartId, lineId) {
  const data = await storefrontRequest(
    `mutation LapinRemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${cartFields} }
        userErrors { message }
      }
    }`,
    { cartId, lineIds: [lineId] },
  )
  const result = data.cartLinesRemove
  if (result.userErrors.length) throw new Error(result.userErrors.map((error) => error.message).join('; '))
  if (!result.cart) throw new Error('Shopify did not return the updated cart.')
  return mapCart(result.cart)
}
