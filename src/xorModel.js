var _ = require('underscore');
var generation = 0;
var generationOfLastBoost = 0;
var dataSet = [
    { inputs: [ 0, 0 ], outputs: [ 0 ] },
    { inputs: [ 1, 0 ], outputs: [ 1 ] },
    { inputs: [ 0, 1 ], outputs: [ 1 ] },
    { inputs: [ 1, 1 ], outputs: [ 0 ] },
];
var bestFit = 0;
var lastdiff = 0;
var showWork = false;

var XorModel = {
    getInputs: function() {
        return 2;
    },
    getOutputs: function() {
        return 1;
    },
    generation: function() {
        generation++;
    },
    getPopulationSize: function() {
        return 300;
    },
    show: function(showing) {
        showWork = showing;
    },
    showBest: function() {
        if (generation % 20 == 0) {
            // Show every 20 generations
            return true;
        }
        return false;
    },
    end: function() {
        if (generation > 100) {
            return true;
        }
        if (generation - generationOfLastBoost > 30) {
            // 30 generations since we increased 5%
            return true;
        }
        return false;
    },
    evaluate: function(network) {
        if (showWork) {
            console.log('Best after', generation, 'generations');
            var genes = network.genotype.getGenes();
            console.log(network.genotype.id, genes);
        }
        var fitness = 0;
        var errorSum = 0;
        _.each(dataSet, function(data) {
            network.loadSensors(data.inputs);
            network.activate();
            var out = network.getOutput();
            var diff = Math.abs(out[0] - data.outputs[0]);
            if (showWork) {
                console.log(data, out);
            }
            errorSum += diff;
            network.flush();
        });
        fitness = Math.pow(4 - errorSum, 2);
        if (showWork) {
            console.log('Fitness', fitness);
        }
        if (fitness > bestFit) {
            var diff = (fitness - bestFit) + lastdiff;
            if (diff > (bestFit/20)) {
                console.log('After', generation - generationOfLastBoost, 'increase', diff, 'on', bestFit);
                generationOfLastBoost = generation;
                lastdiff = 0;
            } else {
                lastdiff = diff;
            }
            bestFit = fitness;
        }
        return fitness;
    },
}


module.exports = XorModel;
