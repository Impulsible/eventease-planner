const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

async function verifyWeek06() {
  console.log('🚀 Verifying Week 06 Implementation...\n');

  // 1. Database connection
  console.log('1. Checking database connection...');
  try {
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database connection: OK');
  } catch (error) {
    console.log('❌ Database connection: FAILED');
    return;
  }

  // 2. Check new models
  console.log('\n2. Checking new models...');
  const models = ['Invitation', 'RSVP'];
  for (const modelName of models) {
    if (mongoose.models[modelName]) {
      console.log(`✅ ${modelName} model: OK`);
    } else {
      console.log(`❌ ${modelName} model: NOT FOUND`);
    }
  }

  // 3. Test endpoints
  console.log('\n3. Testing API endpoints...');
  
  const testEndpoints = [
    { method: 'get', path: '/api/health', expected: 200 },
    { method: 'get', path: '/api/invitations', expected: 401 }, // Should require auth
    { method: 'get', path: '/api/rsvps', expected: 401 },
  ];

  for (const endpoint of testEndpoints) {
    const response = await request(app)[endpoint.method](endpoint.path);
    if (response.status === endpoint.expected) {
      console.log(`✅ ${endpoint.method.toUpperCase()} ${endpoint.path}: OK`);
    } else {
      console.log(`❌ ${endpoint.method.toUpperCase()} ${endpoint.path}: FAILED (got ${response.status})`);
    }
  }

  // 4. Check OAuth routes
  console.log('\n4. Checking OAuth configuration...');
  const authRoutes = ['/api/auth/google', '/api/auth/status', '/api/auth/logout'];
  
  for (const route of authRoutes) {
    const response = await request(app).get(route);
    if (response.status !== 404) {
      console.log(`✅ GET ${route}: OK`);
    } else {
      console.log(`❌ GET ${route}: NOT FOUND`);
    }
  }

  // 5. Final summary
  console.log('\n🎉 Week 06 Implementation Verification Complete!');
  console.log('\nNext steps:');
  console.log('1. Run full test suite: npm test');
  console.log('2. Deploy to Render/GitHub');
  console.log('3. Update documentation');
  console.log('4. Prepare demonstration video');
}

// Run verification
if (require.main === module) {
  require('dotenv').config();
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventease', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => verifyWeek06())
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}