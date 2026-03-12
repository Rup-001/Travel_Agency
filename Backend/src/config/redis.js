const redis = require('redis');
const logger = require('./logger');

const client = redis.createClient({
  url: 'redis://127.0.0.1:6379'
});

client.on('error', (err) => logger.error('Redis Client Error', err));
client.on('connect', () => logger.info('Redis Client Connected'));

(async () => {
  try {
    await client.connect();
    logger.info('Connected to Redis server successfully');
  } catch (err) {
    logger.error('Failed to connect to Redis server', err);
  }
})();

module.exports = client;
