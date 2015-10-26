// TODO - build the data model for single and double pole balancing
// TODO - build this code into a front end that will visualise it pole balancing
// TODO - try to build a data model for PL betting
// 
// TODO - work out how to build in recurrent links, and how those work in network code

var xorModel = require('./xorModel');
var Neatrunner = require('./neatrunner');

var runner = new Neatrunner(xorModel);
runner.run();
runner.showBest();

