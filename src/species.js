var _ = require('underscore');

var NEAT = require('./neat');
var Organism = require('./organism');
var util = require('./util');

var id = 0;

var Species = function() {
    this.id = ++id;
    //console.log('New species', this.id);
    this.organisms = [];
    this.age = 0;
    this.ageOfLastImprovement = 0;
    this.retired = false;
    this.maxFitness = 0;
    this.expectedChildren = 0;
    this.totalFitness = 0;
}

Species.prototype.addExtraChildren = function(extra) {
    this.expectedChildren += extra;
}
Species.prototype.setExpected = function(value) {
    this.expectedChildren = value;
}

Species.prototype.getAge = function(organism) {
    return this.age;
}

Species.prototype.addOrganism = function(organism) {
    this.organisms.push(organism);
    organism.setSpecies(this);
}

Species.prototype.compatibility = function(organism) {
    if (this.organisms.length==0) {
        return 1000;
    }
    return this.organisms[0].compatibility(organism);
}

// Called by an organism when setting fitness, maintains maxfitness without sorting organisms
Species.prototype.checkMaxFitness = function(fitness) {
    this.totalFitness += fitness;
    if (fitness > this.maxFitness) {
        this.maxFitness = fitness;
        this.ageOfLastImprovement = this.age;
        //console.log('Species', this.id, 'improves fitness to', fitness);
    }
}

Species.prototype.getMaxFitness = function() {
    return this.maxFitness;
}

Species.prototype.retire = function() {
    this.retired = true;
}

Species.prototype.adjustFitness = function() {
    this.age++;
    var ageDebt = (this.age - this.ageOfLastImprovement) + 1 - NEAT.dropoffAge;
    if (ageDebt==0) {
        ageDebt = 1;
    }
    _.each(this.organisms, function(organism) {
        var fitness = organism.getFitness();

        // Old or marked for retirement
        if (ageDebt >= 1 || this.retired) {
            fitness *= 0.01;
        }
        // Protect young species (depending on ageSignificance)
        if (this.age < NEAT.youthAge) {
            fitness *= NEAT.ageSignificance;
        }
        if (fitness < 0) {
            fitness = 0.0001;
        }
        fitness /= this.organisms.length;

        organism.setAdjustedFitness(fitness);
    }.bind(this));
}

Species.prototype.sortOrganisms = function() {
    this.organisms.sort(function(a, b) {
        return b.getAdjustedFitness() - a.getAdjustedFitness();
    });
}

Species.prototype.triggerSurvival = function() {
    this.sortOrganisms();
    var survivors = Math.ceil(this.organisms.length * NEAT.survivalRate);
    _.each(this.organisms, function(organism) {
        if (survivors==0) {
            organism.notSurviving();
        } else {
            survivors--;
        }
    });
}

Species.prototype.getTotalExpectedChildren = function() {
    var total = 0;
    _.each(this.organisms, function(organism) {
        total += organism.getExpectedChildren();
    });
    //console.log('Species', this.id, 'organisms', this.organisms.length, 'fitness', this.maxFitness, 'total', this.totalFitness, 'expect', total );
    this.expectedChildren = Math.floor(total);
    return this.expectedChildren;
}

Species.prototype.shouldMutateChild = function() {
    return (util.randomFloat() < NEAT.mutateChild);
}

Species.prototype.shouldMultipointMate = function(level) {
    return (level < NEAT.matingMultipoint);
}

Species.prototype.shouldAveragepointMate = function(level) {
    return (level < NEAT.matingAveragepoint);
}

Species.prototype.shouldInterspeciesMate = function() {
    return (util.randomFloat() < NEAT.speciesInterbreed);
}

Species.prototype.shouldMutate = function() {
    return (util.randomFloat() < NEAT.breedMutation);
}
Species.prototype.shouldMutateWeights = function() {
    return (util.randomFloat() < NEAT.weightMutation);
}
Species.prototype.shouldEnableLink = function() {
    return (util.randomFloat() < NEAT.linkEnableMutation);
}

Species.prototype.removeOrganism = function(organism) {
    this.organisms = _.without(this.organisms, organism);
}

Species.prototype.randomOrganism = function(poolsize) {
    var number = util.randomInt(0, poolsize-1);
    return this.organisms[number];
}

Species.prototype.mutateGenome = function(genome) {
    if (this.shouldMutateNode()) {
        genome.mutateAddNode();
    } else if (this.shouldMutateLink()) {
        genome.mutateAddLink();
    } else {
        if (this.shouldMutateWeights()) {
            genome.mutateLinkWeights();
        }
        if (this.shouldEnableLink()) {
            genome.mutateEnableLink();
        }
    }
}

Species.prototype.shouldMutateNode = function() {
    return (util.randomFloat() < NEAT.nodeMutation);
}

Species.prototype.shouldMutateLink = function() {
    return (util.randomFloat() < NEAT.linkMutation);
}

Species.prototype.breedMutation = function(poolsize, generation) {
    var mom = this.randomOrganism(poolsize);
    var genome = mom.duplicateGenome();
    this.mutateGenome(genome);
    return new Organism(0, genome, generation);
}

Species.prototype.breedMate = function(poolsize, selectSpecies, generation) {
    var mom = this.randomOrganism(poolsize);
    var momGenome = mom.duplicateGenome();
    var dad;
    if (this.shouldInterspeciesMate()) {
        var dadSpecies = selectSpecies();
        dad = dadSpecies.getOrganisms()[0];
    } else {
        dad = this.randomOrganism(poolsize);
    }
    var dadGenome = dad.duplicateGenome();
    var genome;
    var matingLevel = util.randomFloat();
    if (this.shouldMultipointMate(matingLevel)) {
        genome = momGenome.multipointMate(dadGenome);
    } else if (this.shouldAveragepointMate(matingLevel)) {
        genome = momGenome.multipointAverageMate(dadGenome);
    } else {
        genome = momGenome.singlepointMate(dadGenome);
    }
    if (this.shouldMutateChild() || mom.getSpecies() == dad.getSpecies()) {
        this.mutateGenome(genome);
    }

    return new Organism(0, genome, generation);
}

Species.prototype.reproduce = function(addOrganismToSpecies, selectSpecies, generation) {
    // lots of subactions here, break it down
    this.totalFitness = 0;

    var count = 0;
    var champClone = false;
    var poolSize = this.organisms.length;
    //console.log( this.id, ' generating ', this.expectedChildren );
    for (count=0; count < this.expectedChildren; count++) {
        var baby;
        if (this.expectedChildren > 5 && !champClone) {
            var mom = this.organisms[0];
            var genome = mom.duplicateGenome();
            baby = new Organism(0, genome, generation);
            champClone = true;
        } else if (poolSize==1 || this.shouldMutate()) {
            // mutate
            baby = this.breedMutation(poolSize, generation);
        } else {
            // mate
            baby = this.breedMate(poolSize, selectSpecies, generation);
        }
        if (baby!=undefined) {
            addOrganismToSpecies(baby);
        } else {
            // TODO: debug - lost a child somehow
            console.log('no baby');
        }
    }
}

Species.prototype.isEmpty = function() {
    return this.organisms.length == 0;
}

Species.prototype.getOrganisms = function() {
    return this.organisms;
}

module.exports = Species;
