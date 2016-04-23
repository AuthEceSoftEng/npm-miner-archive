var semver = require('semver');

var lib = {};

lib.sort = function(versions) {
  return versions.sort(semver.gt);
};

lib.getCredentials = function() {
  var username = process.env.COUCH_USER;
  var password = process.env.COUCH_PASS;
  var host = process.env.COUCH_HOST;

  if (!username) {
    console.log('the database username is not defined. set COUCH_USER');
    process.exit(1);
  }

  if (!password) {
    console.log('the database password is not defined. set COUCH_PASS');
    process.exit(1);
  }

  if (!host) {
    console.log('the database host is not defined.');
    console.log('set COUCH_HOST');
    process.exit(1);
  }

  return {
    auth: {
      username: username,
      password: password
    },
    host: host
  };
};



module.exports = lib;
