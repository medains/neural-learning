var NEAT = {
    // Speciation parameters
    minSpecies: 4,           // Try to keep at least this many
    maxSpecies: 10,          // And at most this many

    compatibilityStep: 0.3,  // Change the threshold by this much to try to acheive species limits
    compatibilityThreshold: 3.0,  // Initial threshold

    disjointCoeff: 1.0,      // disjoint gene compatibility diff
    excessCoeff: 1.0,        // excess gene compatibility diff
    weightCoeff: 2.0,        // average weight difference compatibility diff

    stagnationAge: 20,       // Generations of stagnation before we push for the top two species to breed

    ancientCheck: 30,        // When to check for weak old species
    ancientAge: 20,          // Old age threshold to retire weak ones at

    dropoffAge: 1000,        // Age to penalise species at
    youthAge: 10,
    ageSignificance: 1.0,    // Multiplier for "young" species (1 = no advantage)

    survivalRate: 0.2,       // Proportion of species to include in reproduction

    breedMutation: 0.25,     // Proportion of children to mutate a clone instead of interbreeding

    linkMutation: 0.1,       // When mutating genome, should a link be added
    nodeMutation: 0.0025,    // When mutating genome, should a node be added
    weightMutation: 0.9,     // When mutating genome, should weights be changed
    linkEnableMutation: 0.05,// When mutating genome, should a disabled link be enabled

    speciesInterbreed: 0.05, // When mating, should a mate be chosen from a different species

    matingMultipoint: 0.55,  // Multipoint mating (each matching gene has a 50% chance)
    matingAveragepoint: 0.35,// 0.90 chance total (each matching gene averaged)
                             // Remaining 0.1 chance splits the gene and takes part from one and part from the other

    mutateChild: 0.8,        // Mutate the child after mating?

    weightPower: 2.5,        // Multiplier for weight mutation

    // Maximum number of nodes allowed

    maxNodes: 100,

    // Network node types

    SENSOR: 0,
    BIAS: 1,
    OUTPUT: 2,
    HIDDEN: 3,
};

module.exports = NEAT;
