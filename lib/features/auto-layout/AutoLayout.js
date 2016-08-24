function AutoLayout(eventBus, elementRegistry, modeling) {

  this._elementRegistry = elementRegistry;
  this._modeling = modeling;

}

AutoLayout.prototype.layout = function() {
  console.log(1);
};


AutoLayout.$inject = [ 'eventBus', 'elementRegistry', 'modeling' ];


module.exports = AutoLayout;
