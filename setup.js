#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 WhatsApp Moderation App Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  const envExample = fs.readFileSync(path.join(__dirname, 'env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ .env file created. Please update it with your API keys.\n');
} else {
  console.log('✅ .env file already exists.\n');
}

// Install server dependencies
console.log('📦 Installing server dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Server dependencies installed.\n');
} catch (error) {
  console.error('❌ Failed to install server dependencies:', error.message);
  process.exit(1);
}

// Install client dependencies
console.log('📦 Installing client dependencies...');
try {
  execSync('cd client && npm install', { stdio: 'inherit' });
  console.log('✅ Client dependencies installed.\n');
} catch (error) {
  console.error('❌ Failed to install client dependencies:', error.message);
  process.exit(1);
}

// Create necessary directories
const dirs = ['logs', 'uploads'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`📁 Created ${dir} directory`);
  }
});

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Update the .env file with your API keys');
console.log('2. Start MongoDB: mongod');
console.log('3. Run the development server: npm run dev');
console.log('4. Open http://localhost:3000 in your browser');
console.log('\n📚 For more information, see the README.md file'); 