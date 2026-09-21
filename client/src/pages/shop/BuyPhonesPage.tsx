import ProductCatalog from '../../components/shop/ProductCatalog'

export default function BuyPhonesPage() {
  return (
    <ProductCatalog
      heading="Buy Phones"
      eyebrow="Buy"
      idleDescription="Certified used & refurbished phones from the brands you trust"
      showSearch
      searchPlaceholder="Search phones by name or model..."
    />
  )
}
