/** globals emit **/

module.exports = {
  availableVersions: {
    map: function(doc) {
      emit([doc._id], Object.keys(doc.versions));
    }
  }
}
