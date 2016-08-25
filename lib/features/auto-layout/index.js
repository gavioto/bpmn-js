'use strict';

module.exports = {
  __depends__:[
    require('diagram-js/lib/features/align-elements')
  ],
  __init__: [ 'autoLayout' ],
  autoLayout: [ 'type', require('./AutoLayout') ]
};
