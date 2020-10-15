const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  userId: String,
  displayName: String,
  email: String,
  image: String,
  stocks: Array
});

module.exports = mongoose.model('User', userSchema);