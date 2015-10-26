var NEAT = require('./neat');
var _ = require('underscore');

var id = 0;

var Organism = function(n, genome, generation) {
    this.id = ++id;
    this.species = undefined;
    this.fitness = 0;
    this.adjustedFitness = 0;
    this.expectedChildren = 0;
    this.survival = true;
    this.genome = genome;

    // TODO - generate a network from the genome
}

Organism.prototype.duplicateGenome = function(msg) {
    return this.genome.duplicate();
}

Organism.prototype.getFitness = function() {
    return this.fitness;
}

Organism.prototype.getSpecies = function() {
    return this.species;
}

Organism.prototype.getGenome = function() {
    return this.genome;
}

Organism.prototype.setFitness = function(fitness) {
    this.fitness = fitness;
    if (this.species != undefined) {
        this.species.checkMaxFitness(fitness);
    }
}

Organism.prototype.compatibility = function(organism) {
    return this.genome.compatibility(organism.getGenome());
}

Organism.prototype.setSpecies = function(species) {
    this.species = species;
}

Organism.prototype.getAdjustedFitness = function(fitness) {
    return this.adjustedFitness;
}

Organism.prototype.setAdjustedFitness = function(fitness) {
    this.adjustedFitness = fitness;
}

Organism.prototype.getExpectedChildren = function() {
    return this.expectedChildren;
}

Organism.prototype.calculateExpectedChildren = function(averageFitness) {
    if (averageFitness > 0) {
        this.expectedChildren = this.adjustedFitness / averageFitness;
    } else {
        this.expectedChildren = 1;
    }
    return this.expectedChildren;
}

Organism.prototype.notSurviving = function() {
    this.survival = false;
}

Organism.prototype.survive = function() {
    if (!this.survival) {
        this.die();
    }
}

Organism.prototype.die = function() {
    if (this.species == undefined) {
        return;
    }
    this.species.removeOrganism(this);
}

module.exports = Organism;
