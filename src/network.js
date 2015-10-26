var NEAT = require('./neat');
var util = require('./util');
var _ = require('underscore');

var Network = function(genome) {
    var nodes = genome.getNodes();
    var genes = genome.getGenes();

    var nodeMap = [];
    var nodeCount = 0;
    this.netNodes = [];

    // Generate this.netNodes
    _.each(nodes, function(node) {
        nodeMap[node.id] = nodeCount++;
        this.netNodes.push(newNetnode(node));
    }.bind(this));
    _.each(genes, function(gene) {
        if (gene.enabled) {
            var nodeIndex = nodeMap[gene.outNode];
            var inIndex = nodeMap[gene.inNode];
            if (this.netNodes[nodeIndex] == undefined) {
                console.log( nodes );
                console.log( genes );
            }
            this.netNodes[nodeIndex].incoming.push(newLink(inIndex,gene.weight));
        }
    }.bind(this));

    this.genotype = genome;
    this.show = false;
}

function newLink(node, weight) {
    return {
        index: node,
        weight: weight,
    };
}

function newNetnode(node) {
    return {
        id: node.id,
        type: node.type,
        incoming: [],
        active: false,
        value: 0,
    };
}

Network.prototype.loadSensors = function(input) {
    // Set all the sensor nodes with their input value
    var idx = 0;
    _.each(this.netNodes, function(netNode) {
        if (netNode.type == NEAT.SENSOR) {
            netNode.active = true;
            netNode.value = input[idx++];
        }
        if (netNode.type == NEAT.BIAS) {
            netNode.active = true;
            netNode.value = 1;
        }
    });
}

Network.prototype.showActivation = function() {
    this.show = true;
}

Network.prototype.activate = function() {
    var count = 0;
    var maxActivations = this.netNodes.length;
    complete = false;
    while (count < maxActivations && !complete) {
        var newActive = false;
        _.each(this.netNodes, function(netNode) {
            if (netNode.type != NEAT.SENSOR && netNode.type != NEAT.BIAS) {
                var val = 0;
                _.each(netNode.incoming, function(link) {
                    var inIndex = link.index;
                    if (this.netNodes[inIndex].active) {
                        //console.log('ACTIVATING NODE', inIndex, this.netNodes[inIndex], link.weight);
                        val += this.netNodes[inIndex].value * link.weight;
                        if (!netNode.active) {
                            netNode.active = true;
                            newActive = true;
                        }
                    }
                }.bind(this));
                if (netNode.active) {
                    netNode.value = util.sigmoid(val);  // sigmoid params = 4.924273,2.4621365
                    if(this.show) {
                        console.log('Node', netNode.id, val, netNode.value);
                    }
                }
            }
        }.bind(this));
        if (!newActive) {
            complete = true;
        }
    }
}

Network.prototype.flush = function() {
    // Reset the network ready for the next input
    _.each(this.netNodes, function(netNode) {
        netNode.active = false;
        netNode.value = 0;
    });
}

Network.prototype.getOutput = function() {
    var results = [];
    _.each(this.netNodes, function(netNode) {
        if (netNode.type == NEAT.OUTPUT) {
            results.push(netNode.value);
        }
    });
    return results;
}

Network.prototype.isRecur = function(inNode, outNode, count, threshold) {
    // threshold should be nodecount*nodecount
    if (count>threshold) {
        return false;
    }
    if (inNode == outNode) {
        return true;
    }
    // for each of inNodes incomings
    //   if incomingLink is NOT recurrent && this.isRecur(newId, outNode, count+1, threshold) return true;
    // return false
}

module.exports = Network;
