function applyDiscount(product: Product, discount: number): Product {
  // This method apply discount to a product
  product.price -= product.price * (discount / 100)
  return product
}

// Generated by gpt-4-0125-preview
