var _ = require('underscore');

var innovations = [];
var innovationId = 1;

function newInnovation(inId, outId, type) {
    var id = innovationId++;
    return {
        inId: inId,
        outId: outId,
        type: type,
        id: id,
    };
}

var Innovation = {
    reset: function() {
        innovations = [];
    },
    create: function(inId, outId, type) {
        var foundInnovation = undefined;
        // Probably use _.first or something
        _.each(innovations, function(innovation) {
            if (foundInnovation != undefined) {
                return;
            }
            if (innovation.inId == inId && innovation.outId == outId && innovation.type == type) {
                foundInnovation = innovation;
            }
        });
        if (foundInnovation != undefined) {
            return foundInnovation.id;
        }
        var innovation = newInnovation(inId, outId, type);
        innovations.push(innovation);
        return innovation.id;
    },
}
module.exports = Innovation;
