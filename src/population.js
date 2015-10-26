var NEAT = require('./neat');
var Organism = require('./organism');
var Species = require('./species');
var Innovation = require('./innovation');
var util = require('./util');

var _ = require('underscore');

var Population = function() {
    this.organisms = [];
    this.species = [];
    this.generation = 0;
    this.maxFitness = 0;

    // Compatibility threshold will be adjusted to maintain species count between these
    this.compatibilityThreshold = NEAT.compatibilityThreshold;
}

Population.prototype.spawn = function(sourceGenome, size) {
    this.census = size;
    for (var count=0; count<size; count++) {
        var newGenome = sourceGenome.duplicate();
        newGenome.mutateLinkWeights();
        var newOrganism = new Organism(0, newGenome, this.generation);
        this.organisms.push(newOrganism);
    }
}

Population.prototype.getOrganisms = function() {
    return this.organisms;
}

Population.prototype.getSpecies = function() {
    return this.species;
}

// speciate, group organisms by species
Population.prototype.speciate = function() {
    _.each(this.organisms, function(organism) {
        this.addOrganismToSpecies(organism);
    }.bind(this));
}

// Generation function - adjust threshold to keep species count in range
Population.prototype.adjustCompatibility = function() {
    if (this.generation > 1) {
        if (this.species.length > NEAT.maxSpecies) {
            this.compatibilityThreshold += NEAT.compatibilityStep;
        }
        if (this.species.length < NEAT.minSpecies) {
            this.compatibilityThreshold -= NEAT.compatibilityStep;
        }
        if (this.compatibilityThreshold < NEAT.compatibilityStep) {
            this.compatibilityThreshold = NEAT.compatibilityStep;
        }
    }
}

// Generation function - sort species by fitness
Population.prototype.sortSpecies = function() {
    this.species.sort(function(a, b) {
        return b.getMaxFitness() - a.getMaxFitness();
    });
}

// Generation function - mark weakest oldest species for extinction
Population.prototype.retireWeakAncient = function() {
    if (this.generation % NEAT.ancientCheck != 0) {
        return;
    }
    var weakAncient = _.reduceRight(this.species, function(a, b) {
        if (a != undefined) {
            return a;
        }
        if (b.getAge() > NEAT.ancientAge) {
            return b;
        }
        return undefined;
    }, undefined);
    if (weakAncient != undefined) {
        weakAncient.retire();
        //console.log('Species', weakAncient.id, 'forced retirement');
    }
}

// Generation function - work out adjusted fitness of species
Population.prototype.calculateAdjustedSpeciesFitness = function() {
    _.each(this.species, function(species) {
        species.adjustFitness();
    });
}

// Generation function - cause species to mark their least fit members to die
Population.prototype.triggerSpeciesSurvival = function() {
    _.each(this.species, function(species) {
        species.triggerSurvival();
    });
}

// Generation function - calculate overall average fitness of population
Population.prototype.calculateAverageFitness = function() {
    var total = 0;
    if (this.organisms.length == 0) {
        return;
    }
    _.each(this.organisms, function(organism) {
        total += organism.getAdjustedFitness();
    });
    this.averageFitness = total / this.organisms.length;
    //console.log('Population', this.organisms.length, 'av fitness', this.averageFitness);
}

// Generation function - work out how many children each organism expects
Population.prototype.computeExpectedChildren = function() {
    _.each(this.organisms, function(organism) {
        organism.calculateExpectedChildren(this.averageFitness);
    }.bind(this));
}

// Generation function - ensure that the total children is correct
Population.prototype.validateExpectedTotal = function() {
    var total = 0;
    var partial = 0;
    _.each(this.species, function(species) {
        total += species.getTotalExpectedChildren();
    });
    if (total < this.census) {
        // fractional children get reassigned to the best species
        this.species[0].addExtraChildren(this.census - total);
    }
}

// Generation function - Work out the population max fitness
Population.prototype.recalcMaxFitness = function() {
    if (this.species.length == 0) {
        return;
    }
    var maxFitness = this.species[0].getMaxFitness();
    if (maxFitness > this.maxFitness) {
        this.highestLastChanged = 0;
        this.maxFitness = maxFitness;
    } else {
        this.highestLastChanged++;
    }
}

// Generation function - If we haven't improved for a while, just breed from the top two species
Population.prototype.checkStagnation = function() {
    if (this.highestLastChanged > NEAT.stagnationAge) {
        //console.log('Max fitness of population unchanged for ' + NEAT.stagnationAge);
        this.highestLastChanged = 0;
        var halfPop = Math.ceil(this.census / 2);
        var secondHalfPop = this.census - halfPop;
        _.each(this.species, function(species) {
            species.setExpected(0);
        });
        this.species[0].setExpected(halfPop);
        this.species[1].setExpected(secondHalfPop);
    }
}

// Generation function - kill all organisms that lost fitness check in their species
Population.prototype.survivalDeathEvent = function() {
    _.each(this.organisms, function(organism) {
        organism.survive(); // Survive calls die if the organism doesn't survive
    });
}

// Locates and adds organism to a species, adding new where necessary
Population.prototype.addOrganismToSpecies = function(organism) {
    var found = false;
    _.each(this.species, function(species) {
        if (!found && species.compatibility(organism) < this.compatibilityThreshold) {
            species.addOrganism(organism);
            found = true;
        }
    }.bind(this));
    if (!found) {
        var newSpecies = new Species();
        newSpecies.addOrganism(organism);
        this.species.push(newSpecies);
    }
}

Population.prototype.selectSpecies = function() {
    // pick a random species
    var randomSpecies = util.randomInt(0, this.species.length - 1);
    while (this.species[randomSpecies].isEmpty()) {
        randomSpecies = util.randomInt(0, this.species.length - 1);
    }
    return this.species[randomSpecies];
}

// Generation function - tell species to reproduce, adding new species where necessary via callback
Population.prototype.speciesReproduction = function() {
    _.each(this.species, function(species) {
        species.reproduce(this.addOrganismToSpecies.bind(this), this.selectSpecies.bind(this), this.generation);
    }.bind(this));
}

// Generation function - kill all organisms in this generation
Population.prototype.generationDeathEvent = function() {
    _.each(this.organisms, function(organism) {
        organism.die();
    });
    this.organisms = [];
}

// Generation function - remove any dead species
Population.prototype.extinctionCheck = function() {
    var remainingSpecies = [];
    _.each(this.species, function(species) {
        if (!species.isEmpty()) {
            remainingSpecies.push(species);
        //} else {
            //console.log('Species', species.id, 'is extinct');
        }
    });
    this.species = remainingSpecies;
}

// Generation function - rebuild the organism list from the species
Population.prototype.rebuildPopulation = function() {
    var newOrganisms = [];
    _.each(this.species, function(species) {
        newOrganisms = newOrganisms.concat(species.getOrganisms());
    });
    this.organisms = newOrganisms;
}

// epoch, breed a new generation of organisms
Population.prototype.epoch = function() {
    this.generation++;
    //console.log(this.generation, 'organisms', this.organisms.length, 'species', this.species.length);
    /*_.each(this.species, function(species) {
        console.log('Species ',species.id,species.getOrganisms().length);
    });*/
//   adjust compatibility threshold to gain more/less species
    this.adjustCompatibility();
//   sort species by max fitness
    this.sortSpecies();
//   mark the oldest >20 gen species with the lowest fitness for retirement
    this.retireWeakAncient();
//   calculate adjusted fitness of each species
    this.calculateAdjustedSpeciesFitness();
//   mark organisms for death below survival threshold in each species
    this.triggerSpeciesSurvival();
//   get average fitness (from all organisms)
    this.calculateAverageFitness();
//   compute expected children per organism from the fitness against average
    this.computeExpectedChildren();
//   total expected from organism to species
//   if we've lost any due to rounding, assign them to the best species
    this.validateExpectedTotal();
//   check for max fitness change
    this.recalcMaxFitness();
//   if max fitness hasn't changed for N generations, give half pop to 2 best species
    this.checkStagnation();
//   kill organisms previously marked dead
    this.survivalDeathEvent();
//   tell each species to reproduce - with adds the organisms to its own list, or a new species via an addSpecies callback
    this.speciesReproduction();
//   kill remaining organisms
    this.generationDeathEvent();
//   kill any empty species
    this.extinctionCheck();
//   build new organism list from the species
    this.rebuildPopulation();
//   reset innovations
    Innovation.reset();
};

module.exports = Population;
