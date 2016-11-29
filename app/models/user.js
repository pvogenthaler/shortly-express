var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    console.log('this', this);
    this.on('creating', this.hashPassword);
  },

  comparePassword: function(password, cb) {
    bcrypt.compare(password, this.get('password'), (err, res) => {
      if (err) { console.log('passwords do not match'); }
      cb(res);
    });
  },

  hashPassword: function() {
    var hashedPassword = Promise.promisify(bcrypt.hash);
    console.log('getting password', this, this.get('password'));
    return hashedPassword(this.get('password'), null, null)
      .then( this.updatePassword.bind(this) );
  },

  updatePassword: function(newPassword) {
    this.set('password', newPassword);
  }
});

module.exports = User;