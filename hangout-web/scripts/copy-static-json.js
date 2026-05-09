const fs = require('fs');
const path = require('path');

// When running from hangout-web directory, static.json is in current directory
const source = path.join(__dirname, '..', 'static.json');
const dest = path.join(__dirname, '..', 'build', 'static.json');

console.log('Copying static.json...');
console.log('From:', source);
console.log('To:', dest);

try {
  // Create build directory if it doesn't exist
  const buildDir = path.dirname(dest);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  fs.copyFileSync(source, dest);
  console.log('✓ static.json copied to build directory successfully');
} catch (err) {
  console.error('✗ Failed to copy static.json:', err.message);
  process.exit(1);
}
