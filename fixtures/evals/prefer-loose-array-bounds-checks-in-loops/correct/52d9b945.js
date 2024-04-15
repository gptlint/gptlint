// Example 8: Using a while loop with a condition that checks for multiple criteria
const tasks = ['build', 'test', 'deploy']
let taskIndex = 0
while (taskIndex < tasks.length && tasks[taskIndex] !== 'deploy') {
  console.log(tasks[taskIndex])
  taskIndex++
  // Correctly uses '<' for bounds check and additional condition
}

// Generated by gpt-4-0125-preview