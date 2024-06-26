// Correct use of semantic variable names for tracking a shopping cart
interface CartItem {
  productId: number
  quantity: number
}

const shoppingCart: CartItem[] = [
  { productId: 1, quantity: 2 },
  { productId: 2, quantity: 1 }
]

// "shoppingCart" and "CartItem" are descriptive, clearly indicating their purpose

// Generated by gpt-4-0125-preview
