var Population = require('./population');
var Genome = require('./genome');
var Network = require('./network');
var _ = require('underscore');

var NeatRunner = function(dataModel) {
    this.model = dataModel;
    this.bestFitness = 0;
    this.bestOrganism = undefined;
}

NeatRunner.prototype.getBest = function() {
    return this.bestOrganism;
}
NeatRunner.prototype.showBest = function() {
    var network = new Network(this.bestOrganism.getGenome());
    this.model.show(true);
    var fitness = this.model.evaluate(network);
    this.model.show(false);
}

NeatRunner.prototype.run = function() {
    var population = new Population();
    var baseGenome = new Genome(this.model.getInputs()+1, this.model.getOutputs());
    baseGenome.addInputGenes();
    population.spawn(baseGenome, this.model.getPopulationSize());
    population.speciate();

    var bestEver = 0;
    var bestOrganism = undefined;
    while (!this.model.end()) {
        this.model.generation();
        var organisms = population.getOrganisms();
        _.each(organisms, function(organism) {
            var network = new Network(organism.getGenome());
            var fitness = this.model.evaluate(network);
            if (fitness > this.bestFitness) {
                this.bestFitness = fitness;
                this.bestOrganism = organism;
            }
            organism.setFitness(fitness);
        }.bind(this));
        if (this.model.showBest()) {
            this.showBest();
        }
        population.epoch();
    }
}

module.exports = NeatRunner;
