// Example 5: Processing elements until a specific condition is met, using a while loop
const numbers = [7, 9, 13, 17, 19]
let index = 0
while (index < numbers.length && numbers[index] < 15) {
  console.log(numbers[index])
  index++
  // Uses '<' for bounds check and additional condition
}

// Generated by gpt-4-0125-preview
