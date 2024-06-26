/**
 * Converts a temperature from Celsius to Fahrenheit.
 * @param tempCelsius {number} - The temperature in Celsius.
 * @returns {number} - The temperature in Fahrenheit.
 */
function celsiusToFahrenheit(tempCelsius: number): number {
  // This VIOLATES the rule by including type information in the JSDoc comments.
  return (tempCelsius * 9) / 5 + 32
}

// Generated by gpt-4-0125-preview
