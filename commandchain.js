/*
Helper class for building chains in an easy to read way. 

Args
  commands
    Array of command objects. Each object should have the following: 
    {
      message: <String> message to send to the card,
      patience: <Number> max milliseconds to wait for the command,
      expected: <Array> expected result, will be compared with returned result to determine if call was successful.
    }

You can then get and array of all messages, patiences, and expectations for passing to your chain

*/
function CommandChain(commands) {
  this._commands = commands;
}

CommandChain.prototype.getMessages = function() {
  return this._commands.map(function(obj) {
    return obj.message;
  });
};

CommandChain.prototype.getPatiences = function() {
  return this._commands.map(function(obj) {
    return obj.patience;
  });
};

CommandChain.prototype.getExpected = function() {
  return this._commands.map(function(obj) {
    return obj.expected;
  });
}; 

module.exports = CommandChain;