// Expects a specific enum value, doesn't handle other valid cases
enum Fruit {
  Apple,
  Banana,
  Orange
}
function eatFruit(fruit: Fruit): void {
  // Only allows Apple and Banana
  if (fruit !== Fruit.Apple && fruit !== Fruit.Banana) {
    throw new Error('Unsupported fruit type')
  }
  // Eating fruit logic
}

// Generated by gpt-4-0125-preview
