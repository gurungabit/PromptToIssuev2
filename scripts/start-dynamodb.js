const DynamoDbLocal = require('dynamodb-local');

const dynamoLocalPort = 8000;

async function startDynamoDB() {
  try {
    console.log('🚀 Starting DynamoDB Local on port', dynamoLocalPort);
    
    await DynamoDbLocal.launch(dynamoLocalPort, null, [
      '-sharedDb',           // Share database across processes
      '-inMemory'            // Use in-memory storage (data doesn't persist between restarts)
      // For persistent storage, use: ['-sharedDb', '-dbPath', './dynamodb-data']
      // Note: Some versions of dynamodb-local have issues with -dbPath
    ]);
    
    console.log('✅ DynamoDB Local started successfully!');
    console.log(`📍 Endpoint: http://localhost:${dynamoLocalPort}`);
    console.log('🌐 Web Shell: http://localhost:8000/shell/');
    console.log('\n💡 Press Ctrl+C to stop DynamoDB Local');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start DynamoDB Local:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping DynamoDB Local...');
  try {
    await DynamoDbLocal.stop(dynamoLocalPort);
    console.log('✅ DynamoDB Local stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping DynamoDB Local:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Stopping DynamoDB Local...');
  try {
    await DynamoDbLocal.stop(dynamoLocalPort);
    console.log('✅ DynamoDB Local stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping DynamoDB Local:', error);
  }
  process.exit(0);
});

startDynamoDB(); 