'use strict'

function isCriticalError (err) {
  if (!err.message) {
    return true
  }

  if (err.message.match(/|doesn't exist|analyzed|deleted|EISDIR|40|No files|Too many|big object|timed out/)) {
    return false
  }

  return true
}

module.exports = {
  isCriticalError
}
