var slope = 4.924273; 
                     // sigmoid params = 4.924273,2.4621365

module.exports = {
    sigmoid: function(x) {
        // This is not classic sigmoid, it's scaled for -1 to 1 inputs and outputs
        //return 2/(1+Math.exp(-4.9*x))-1;
        return (1/(1+(Math.exp(-(slope * x)))));
    },
    randomFloat: function() {
        return Math.random();
    },
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
};
