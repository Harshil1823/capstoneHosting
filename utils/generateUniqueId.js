// Function to generate a unique identifier of a specified length
function generateUniqueId(length = 8) {
  // Characters to be used in the unique identifier
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  // Loop to generate the unique identifier
  for (let i = 0; i < length; i++) {
      // Append a random character from the characters string to the result
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  // Return the generated unique identifier
  return result;
}

// Export the generateUniqueId function
module.exports = generateUniqueId;