// Only accepts instances of a specific class, doesn't handle subclasses or similar objects
class Animal {
  speak() {
    return 'sound'
  }
}
function hearAnimalSound(animal: Animal): void {
  // Only accepts instances of Animal, not subclasses
  if (!(animal instanceof Animal)) {
    throw new Error('Object must be an instance of Animal')
  }
  console.log(animal.speak())
}

// Generated by gpt-4-0125-preview
