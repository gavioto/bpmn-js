var ModelUtil = require('../../util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject;

var head = require('lodash/array/head'),
    drop = require('lodash/array/drop');

var getBBox = require('diagram-js/lib/util/Elements').getBBox;


function AutoLayout(eventBus, elementRegistry, elementFactory, modeling, canvas) {

  this._elementRegistry = elementRegistry;
  this._elementFactory = elementFactory;
  this._modeling = modeling;
  this._canvas = canvas;

}

var STANDARDDIST = 50;

AutoLayout.prototype.layout = function() {

  var root = this._canvas.getRootElement();
  var quelle = findStartEvent(root.children);

  bfs(quelle, this);

};

AutoLayout.$inject = [ 'eventBus', 'elementRegistry', 'elementFactory', 'modeling', 'canvas' ];


module.exports = AutoLayout;


//////////////// helper ///////////////////

function bfs(quelle, self) {

  var anchor = {
    x: quelle.x,
    y: quelle.y + quelle.height / 2
  };

  var qBo = getBusinessObject(quelle);

  var queue = [qBo];

  var aquC = [],
      shortestDist = 0;

  qBo.marked = true;
  qBo.dist = 0;

  var node, out;

  while (queue.length !== 0) {

    // get first
    node = head(queue);
    queue = drop(queue);

    if (node.dist === shortestDist) {
      // node of same distance
      aquC.push(node);
    } else {
      var newAnchor;

      // arrange aquC,
      newAnchor = arrangeAquC(anchor, aquC, self);
      anchor = newAnchor;

      // set new shortestDist
      aquC = [node];
      shortestDist = node.dist;
    }

    out = node.outgoing;

    if (out) {
      var dest;

      // iterate over outgoings
      out.forEach(function(edge) {

        dest = edge.targetRef;
        if (hasChildren(dest, self)) {

          var par = self._elementRegistry.get(dest.id);
          var childQ = findStartEvent(par.children);

          bfs(childQ, self);

          organizeParent(par, childQ, self);


        }

        if (!dest.marked) {

          dest.marked = true;
          dest.dist = node.dist + 1;

          queue.push(dest);
        }
      });
    }
  }

  // arange last aquC
  arrangeAquC(anchor, aquC, self);
}


function arrangeAquC(anchor, aquC, self) {

  var lastTop, lastBottom;
  var maxWidth = 0;

  lastBottom = lastTop = anchor.y;

  aquC.forEach(function(node) {
    var element = self._elementRegistry.get(node.id);

    maxWidth = Math.max(element.width, maxWidth);

    if (node.incoming && node.incoming.length) {

      var sources = getSources(node, self);
      var sumB = 0,
          sumT = 0;
      sources.forEach(function(s) {
        var outgoingP = getOutgoingPoint(s);

        sumB += getDistance(outgoingP, { x: anchor.x, y: lastBottom });
        sumT += getDistance(outgoingP, { x: anchor.x, y: lastTop });

      });

      var delta;
      if (lastBottom === lastTop) {
        // place first element of aquC

        delta = {
          x: anchor.x - element.x,
          y: lastBottom - element.y - element.height / 2
        };

        lastTop = anchor.y - element.height / 2;
        lastBottom = anchor.y + element.height / 2;

      } else {
        // place other elements
        if (sumB < sumT) {
          // move to bottom
          delta = {
            x: anchor.x - element.x,
            y: lastBottom + STANDARDDIST - element.y
          };

          // calculate last bottom position
          lastBottom += STANDARDDIST + element.height;

        } else {
          // move to top
          delta = {
            x: anchor.x - element.x,
            y: lastTop - STANDARDDIST - element.height - element.y
          };

          //calculate top bottom position
          lastTop -= (STANDARDDIST + element.height);
        }
      }

      self._modeling.moveShape(element, delta, element.parentRefs);

      // place new connection
      sources.forEach(function(s) {
        self._modeling.connect(s, element);
      });

    }

  });

  return { x: anchor.x + maxWidth + 2*STANDARDDIST, y: anchor.y };

}

function getOutgoingPoint(point) {
  return {
    x: point.x + point.width,
    y: point.y + point.height / 2
  };
}

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getSources(node, self) {
  var sources = [];
  var incomming = node.incoming;

  incomming.forEach(function(connection) {
    var bo = connection.sourceRef;

    sources.push(self._elementRegistry.get(bo.id));

  });

  for (var i = incomming.length; i > 0; i--) {
    var con = self._elementRegistry.get(incomming[0].id);
    self._modeling.removeConnection(con);
  }
  return sources;
}

function findStartEvent(a) {
  var start;
  a.forEach(function(e) {
    if (/StartEvent/.test(e.type)) {
      start = e;
    }
  });

  return start;

}

function hasChildren(element, self) {
  var e = self._elementRegistry.get(element.id);

  return e.children.length;

}

function organizeParent(par, start, self) {

  var parent = self._elementRegistry.get(par.id);
  var children = par.children;
  // move children
  var innerPos = {
    x: parent.x + 20,
    y: parent.y + parent.height / 2
  };

  var delta = {
    x: innerPos.x - start.x,
    y: innerPos.y - start.y
  };

  self._modeling.moveElements(children, delta, parent);

  // resize to bbox
  var cbBox = getBBox(children);
  var newBounds = {
    x: cbBox.x - 20,
    y: cbBox.y - 10,
    width: cbBox.width + 40,
    height: cbBox.height+ 30
  };

  self._modeling.resizeShape(parent, newBounds);

}
