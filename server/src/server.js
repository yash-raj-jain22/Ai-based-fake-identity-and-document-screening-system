require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const { seedDefaultUser } = require('./modules/auth/auth.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultUser();
    server.listen(PORT, () => {
      console.log(`Node server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
