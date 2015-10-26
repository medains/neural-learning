var NEAT = require('./neat');
var util = require('./util');
var Innovation = require('./innovation');
var _ = require('underscore');

var id = 0;

function newNode(id, type) {
    return {
        id: id,
        type: type,
    };
}

function newGene(inNode, outNode, weight, innovation) {
    return {
        inNode: inNode,
        outNode: outNode,
        weight: weight,
        innovation: innovation,
        enabled: true,
    };
}

var Genome = function(inputs, outputs) {
    // unique genome id
    this.id = ++id;
    this.inputs = inputs;
    this.outputs = outputs;
    this.genes = []  // sorted by innovation number
    this.nodes = [];
    // add a node for every input - last input is a bias
    for (var i=1; i<=inputs; i++) {
        this.nodes.push(newNode(i, i==inputs ? NEAT.BIAS : NEAT.SENSOR));
    }
    // add a node for every output
    this.nextNode = inputs+1;
    this.firstOutput = NEAT.maxNodes - outputs + 1;
    for (var i=this.firstOutput; i<(this.firstOutput+outputs); i++) {
        this.nodes.push(newNode(i, NEAT.OUTPUT));
    }
    //console.log('Created genome ' + JSON.stringify(this.nodes));
    this.firstNonSensor = this.firstOutput;
}

Genome.prototype.addInputGenes = function() {
    for (var i=1; i<=this.inputs; i++) {
        var node2 = this.randomNode(this.firstNonSensor);
        var innovationId = Innovation.create(i, node2.id, 'LINK');
        var gene = newGene(i, node2.id, 1, innovationId);
        this.addGene(gene);
    }
}

Genome.prototype.duplicate = function() {
    var newGenome = new Genome(this.inputs, this.outputs);
    newGenome.setGenes(this.genes);
    newGenome.setNodes(this.nodes);
    newGenome.firstNonSensor = this.firstNonSensor;
    newGenome.nextNode = this.nextNode;
    return newGenome;
}

Genome.prototype.getGenes = function() {
    return this.genes;
}
Genome.prototype.getNodes = function() {
    return this.nodes;
}

Genome.prototype.setGenes = function(genes) {
    this.genes = [];
    _.each(genes, function(gene) {
        this.genes.push(_.clone(gene));
    }.bind(this));
}

Genome.prototype.setNodes = function(nodes) {
    this.nodes = [];
    _.each(nodes, function(node) {
        this.nodes.push(_.clone(node));
    }.bind(this));
}

Genome.prototype.compatibility = function(genome) {
    var otherGenes = genome.getGenes();
    var maxSize = Math.max(this.genes.length, otherGenes.length);
    var myIndex = 0, theirIndex = 0;
    var numExcess = 0;
    var numDisjoint = 0;
    var numMatching = 0;
    var totalDiff = 0;
    while (myIndex < this.genes.length || theirIndex < otherGenes.length) {
        if (myIndex == this.genes.length) {
            numExcess++;
            theirIndex++;
            continue;
        }
        if (theirIndex == otherGenes.length) {
            numExcess++;
            myIndex++;
            continue;
        }
        var myInnovation = this.genes[myIndex].innovation;
        var theirInnovation = otherGenes[theirIndex].innovation;
        var innoDiff = myInnovation - theirInnovation;
        if (innoDiff == 0) {
            // Check weights
            var wDiff = Math.abs(this.genes[myIndex].weight - otherGenes[theirIndex].weight);
            numMatching++;
            totalDiff += wDiff;
            myIndex++;
            theirIndex++;
            continue;
        }
        if (innoDiff>0) {
            // My innovation higher, disjoint
            theirIndex++;
            numDisjoint++;
            continue;
        }
        // Their innovation is higher
        myIndex++;
        numDisjoint++;
    }
    if (numMatching == 0) {
        return NEAT.disjointCoeff * numDisjoint + NEAT.excessCoeff * numExcess;
    }
    return NEAT.disjointCoeff * numDisjoint + NEAT.excessCoeff * numExcess + NEAT.weightCoeff * (totalDiff/numMatching);
}
function averageGene(mom, dad) {
    return {
        inNode: mom.inNode,
        outNode: mom.outNode,
        weight: (mom.weight + dad.weight)/2,
        innovation: mom.innovation,
        enabled: true,
    };
}
function pickRandomGene(mom, dad) {
    if (util.randomFloat() < 0.5) {
        return mom;
    } else {
        return dad;
    }
}

Genome.prototype.ensureNode = function(id) {
    if (id <= this.inputs) {
        return;
    }
    if (id >= this.firstOutput) {
        return;
    }
    var found = false;
    // TODO - use _.first?
    _.each(this.nodes, function(node) {
        if (!found && node.id == id) {
            found = true;
        }
    });
    if (found) {
        return;
    }
    this.nodes.push(newNode(id, NEAT.HIDDEN));
    if (this.firstNonSensor == this.firstOutput || id < this.firstNonSensor) {
        this.firstNonSensor = id;
    }
    if (id >= this.nextNode) {
        this.nextNode = id + 1;
    }
}

Genome.prototype.addGene = function(gene, disable) {
    if (this.checkExisting(gene.inNode, gene.outNode)) {
        return;
    }
    var addedGene = _.clone(gene);
    addedGene.enabled = !disable;
    this.genes.push(addedGene);
    this.ensureNode(gene.inNode);
    this.ensureNode(gene.outNode);
}

Genome.prototype.singlepointMate = function(genome) {
    var child = new Genome(this.inputs, this.outputs);
    var momLength = this.genes.length;
    var dadLength = genome.getGenes().length;
    if (momLength > dadLength) {
        momGenes = genome.getGenes();
        dadGenes = this.genes;
    } else {
        momGenes = this.genes;
        dadGenes = genome.getGenes();
    }
    var crossover = util.randomInt(0, momGenes.length-1);
    var momCount = 0;
    var dadCount = 0;
    var done = false;
    while (!done) {
        var chosen;
        var momGene = momGenes[momCount];
        var dadGene = dadGenes[dadCount];
        var disable = false;
        if (momCount == momGenes.length) {
            chosen = dadGene;
            dadCount++;
        } else if (dadCount == dadGenes.length) {
            chosen = momGene;
            momCount++;
        } else if (momGene.innovation == dadGene.innovation) {
            if (momCount < crossover) {
                chosen = momGene;
            } else if (momCount > crossover) {
                chosen = dadGene;
            } else {
                chosen = averageGene(momGene, dadGene);
            }
            if (!momGene.enabled || !dadGene.enabled) {
                if (util.randomFloat() < 0.75) {
                    disable = true;
                }
            }
            momCount++;
            dadCount++;
        } else if (momGene.innovation < dadGene.innovation) {
            if (momCount < crossover) {
                chosen = momGene;
                momCount++;
            } else {
                chosen = dadGene;
                dadCount++;
            }
        } else {
            dadCount++;
            continue;
        }
        if (chosen == undefined) {
            done = true;
            continue;
        }
        child.addGene(chosen, disable);
    }
    child.sortGenes();
    child.sortNodes();
    return child;
}
Genome.prototype.multipointWith = function(genome, geneSelector) {
    // work out which is "better" this or other, first by higher fitness, then by smallest size
    // mom is always fitter
    var momGenes, dadGenes;
    if (this.fitness > genome.getFitness) {
        momGenes = this.genes;
        dadGenes = genome.getGenes();
    } else {
        if (this.genes.length < genome.getGenes().length) {
            momGenes = this.genes;
            dadGenes = genome.getGenes();
        } else {
            dadGenes = this.genes;
            momGenes = genome.getGenes();
        }
    }
    var child = new Genome(this.inputs, this.outputs);
    //   if only one parent has the gene, add it (skip excess from the worse parent)
    //   choose randomly one of the genes (50/50) if either parent has a disabled gene 75% chance of baby disabled too
    //   CHECK - does the chosen gene match an existing one - if so, skip it
    //   add in and out nodes if they don't exist yet
    // sort genes
    // sort nodes
    var momCount = 0;
    var dadCount = 0;
    var done = false;
    // for each gene (in innovation order)
    while (!done) {
        var chosen;
        var momGene = momGenes[momCount];
        var dadGene = dadGenes[dadCount];
        var disable = false;
        if (momCount == momGenes.length) {
            // Mom run out of genes - excess from dad is discarded, so we're done
            done = true;
            continue;
        } else if (dadCount == dadGenes.length) {
            // Add excess genes from mom
            chosen = momGene;
            momCount++;
        } else if (momGene.innovation == dadGene.innovation) {
            chosen = geneSelector(momGene, dadGene);
            if (!momGene.enabled || !dadGene.enabled) {
                if (util.randomFloat() < 0.75) {
                    disable = true;
                }
            }
            momCount++;
            dadCount++;
        } else if (momGene.innovation < dadGene.innovation) {
            // Mom disjoint gene
            chosen = momGene;
            momCount++;
        } else {
            // Dad disjoint gene
            chosen = dadGene;
            dadCount++;
        }
        child.addGene(chosen, disable);
    }
    return child;
}
Genome.prototype.multipointAverageMate = function(genome) {
    return this.multipointWith(genome, averageGene);
}
Genome.prototype.multipointMate = function(genome) {
    return this.multipointWith(genome, pickRandomGene);
}
Genome.prototype.mutateEnableLink = function() {
    var found = false;
    _.each(this.genes, function(gene) {
        if (!found && !gene.enabled) {
            found = true;
            gene.enabled = true;
        }
    });
}
Genome.prototype.mutateLinkWeights = function() {
    var severe = false;

    var gaussianPoint = 0.3;
    var coldGaussianPoint = 0.1;
    var geneTotal = this.genes.length;
    var geneCount = this.genes.length * 0.8;

    // Chance of severe mutation
    if (util.randomFloat() > 0.5) {
        severe = true;
    }
    _.each(this.genes, function(gene) {
        geneCount -= 1;
        if (!severe) {
            if (geneTotal>10 && geneCount<0) {
                gaussianPoint = 0.5;
                coldGaussianPoint = 0.3;
            } else {
                // everything perturbed
                gaussianPoint = 0;
            }
        }
        var weight = (util.randomFloat() * 2 - 1) * NEAT.weightPower;
        var choice = util.randomFloat();
        if (choice > gaussianPoint) {
            gene.weight += weight;
        } else if (choice > coldGaussianPoint) {
            gene.weight = weight;
        }
        // cap on weight, listed as experimental
        if (Math.abs(gene.weight) > 8) {
            gene.weight = gene.weight * 8 / Math.abs(gene.weight);
        }
    });
    //this.genes += 'm';
}
Genome.prototype.randomNode = function(minId) {
    var minIndex = 0;
    if (minId != undefined) {
        var found = false;
        _.each(this.nodes, function(node) {
            if (!found && node.id >= minId) {
                found = true;
            } else {
                minIndex++;
            }
        });
    }
    var randIndex = util.randomInt(minIndex, this.nodes.length-1);
    return this.nodes[randIndex];
}

Genome.prototype.checkExisting = function(id1, id2) {
    var found = false;
    _.each(this.genes, function(gene) {
        if (found) {
            return;
        }
        if (gene.inNode == id1 && gene.outNode == id2) {
            found = true;
        }
        if (gene.inNode == id2 && gene.outNode == id1) {
            found = true;
        }
    });
    return found;
}
Genome.prototype.sortGenes = function() {
    this.genes.sort(function(a, b) {
        return a.innovation - b.innovation;
    });
}
Genome.prototype.sortNodes = function() {
    this.nodes.sort(function(a, b) {
        return a.id - b.id;
    });
}
Genome.prototype.mutateAddLink = function() {
    if (this.nodes.length == 0) {
        return;
    }
    var node1 = this.randomNode();
    var node2 = this.randomNode(this.firstNonSensor);
    if (node1.id == node2.id) {
        // No direct loop linking
        return false;
    }
    if (this.checkExisting(node1.id, node2.id)) {
        // link already exists
        return false;
    }
    // TODO - check for recurrency in the network?
    var innovationId = Innovation.create(node1.id, node2.id, 'LINK');
    var weight = util.randomFloat() * 2 - 1;
    this.genes.push(newGene(node1.id, node2.id, weight, innovationId));
    this.sortGenes();
}
Genome.prototype.mutateAddNode = function() {
    if (this.genes.length == 0) {
        return;
    }
    var retry = 0;
    var found = false;
    var randomGene;
    while (!found && retry < 20) {
        retry++;
        var randomChoice = util.randomInt(0, this.genes.length-1);
        randomGene = this.genes[randomChoice];
        if (randomGene.inNode == this.inputs) {  // relies on BIAS being specially numbered
            // link from BIAS, never split that
            continue;
        }
        if (randomGene.enabled) {
            found = true;
        }
    }
    if (!found) {
        return;
    }
    randomGene.enabled = false;
    var newN = newNode(this.nextNode, NEAT.HIDDEN);
    if (this.firstNonSensor == this.firstOutput) {
        this.firstNonSensor = this.nextNode;
    }
    this.nextNode = this.nextNode + 1;
    this.nodes.push(newN);
    var innovationId = Innovation.create(randomGene.inNode, newN.id, 'NODE');
    this.genes.push(newGene(randomGene.inNode, newN.id, 1.0, innovationId));
    innovationId = Innovation.create(newN.id, randomGene.outNode, 'NODE');
    this.genes.push(newGene(newN.id, randomGene.outNode, randomGene.weight, innovationId));
    this.sortGenes();
    this.sortNodes();
}

module.exports = Genome;
