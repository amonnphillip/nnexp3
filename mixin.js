module.exports = function(base, obj) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      base[prop] = obj[prop];
    }
  }

  return base;
};