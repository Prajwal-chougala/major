# LAPIN storefront

An independent React + Vite storefront project. The current site is a responsive, interactive launch preview built around the supplied LAPIN logo.

## Run locally

```sh
npm install
npm run dev
```

Build the static site with `npm run build` and preview it with `npm run preview`.

## Included now

- Original supplied rabbit-and-wordmark logo preserved unchanged in `public/lapin-logo.jpg`; a custom geometric rabbit mark and matching favicon define the refreshed storefront identity.
- Responsive warm-paper/editorial storefront, reference-inspired loading animation, product/category browsing, instant search, sorting, saved pieces, size guidance, and a persistent local sample cart.
- Reduced-motion support, semantic controls, mobile navigation, empty states, and basic page/social metadata.
- Product and store copy in `src/catalog.js` for editing.
- Shopify Storefront API integration for live products, collections, variant availability, cart updates, and Shopify-hosted checkout. Sign-in, account creation, and recovery are handed off to Shopify's customer account page.

## Connect LAPIN to Shopify

The storefront remains in clearly labeled sample mode until Shopify is configured:

1. Create a Shopify store and add products, variants, prices, inventory, and collections in Shopify Admin.
2. Create/install a Shopify app with Storefront API access to read products/collections and create/update carts. Generate a **Storefront API public access token**.
3. Copy `.env.example` to `.env` in the `lapin` project and set:

   ```env
   VITE_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_public_access_token
   VITE_SHOPIFY_API_VERSION=2026-10
   VITE_SHOPIFY_ACCOUNT_URL=https://your-store.myshopify.com/account
   ```

4. Restart Vite (`npm run dev`) after changing `.env`. Live products and collection cards will load from Shopify. Cart line changes use Shopify's cart API; checkout redirects to Shopify-hosted checkout for final totals, shipping, taxes, and payment.
5. Configure customer accounts, checkout, supported payment methods, shipping rates/zones, tax settings, and policies in Shopify Admin. Shopify hosts sign-in, account creation, and password recovery.

The Storefront API public token is intended for storefront use. **Never put a Shopify Admin API token, payment secret, or other private credential in a `VITE_*` variable or frontend code.** Keep private credentials only in a trusted server-side integration.

Without Shopify configuration, the site remains a local demo with sample products/prices and browser-local cart data; it cannot create an order.

## Integration scope and remaining launch work

- Shopify Admin is the product/stock/order management interface; this project does not create a separate admin dashboard.
- Product, collection, variant availability, cart, and live price data are queried from Shopify when configured. Shopify revalidates stock and prices at checkout.
- Shopify checkout is live when configured, but must be tested with the store's enabled payment methods. This implementation does not create a custom Razorpay flow or handle payments directly.
- Account links use Shopify-hosted customer accounts. Account access, email verification/recovery, profile and order management must be enabled/configured in Shopify Admin.
- Wishlist remains browser-local and is not synced to customer accounts.
- The collections configured in Shopify drive the category cards and collection filters. Dedicated gender and price-tier filtering, configurable Premium/Mid-Range rules, and the Fit Room experience are not yet implemented.
- Suggested Shopify collections for the requested destinations are `Men`, `Women`, `Premium: Unisex`, `Mid-Range`, and `Most Wanted`. Assign products to collections in Shopify Admin; this storefront displays configured non-empty collections.
- Most Wanted ranking by a configurable period with explicit cancelled/refunded/test-order exclusions requires a trusted Admin API/app integration. The storefront does not fabricate sales data.
- Delivery serviceability/estimates, custom order emails, and tracking require Shopify settings or compatible apps.
- Newsletter integration is unset; the form reports that it is not connected. Configure an endpoint before collecting subscribers.
- Replace sample images with approved product imagery and configure verified contact/social details, shipping/returns information, privacy, and terms.

Do not announce the storefront as production-ready until API access, accounts, checkout, payments, inventory, policies, and order flows have been tested end to end.

## Editing the sample product catalogue

When Shopify is configured, add and update live inventory in Shopify Admin. `src/catalog.js` is only the fallback demo catalogue used before Shopify configuration. To edit a fallback sample listing:

1. Put an approved product photo in `public/products/` (create the folder if needed). Use a short filename such as `new-tee.jpg`.
2. Add a new object to the `products` array in `src/catalog.js`, or edit the matching object. Give every product a unique `id`.
3. Set its `name`, `category`, `price` (a number in INR, without commas), `color`, `sizes`, `image` (for example `/products/new-tee.jpg`), and descriptive `alt` text.
4. Save and refresh the preview. For a production build, run `npm run build`.

Example listing:

```js
{
  id: '05',
  name: 'New Tee',
  category: 'Graphic tees',
  price: 1990,
  color: 'Washed charcoal',
  sizes: ['S', 'M', 'L', 'XL'],
  image: '/products/new-tee.jpg',
  alt: 'Washed charcoal LAPIN graphic tee',
  note: 'SAMPLE PRODUCT · PRICE IS INDICATIVE',
}
```

To make a new category appear in the category section, add an entry to the `categories` array in that same file. Set its `name` and `filter`; the `filter` must exactly match the product `category` values. The section will use the first matching product photo automatically. Categories marked `comingSoon: true` stay unavailable.

**Important:** In the fallback demo, `sizes` only lists options and does not track or decrement inventory. For live stock and pricing, configure Shopify and manage products/variants in Shopify Admin; do not publish fallback indicative prices as final prices.
