window.onload = function(){
  var cli = new CLI('cli');

  /* Echo */
  cli.registerCommand(
    'echo', 
    function(sFlgs, lFlgs, args){
      console.log(sFlgs);
      console.log(lFlgs);
      this._log(args);
    }, 
    'echo <message to echo>',
    'Prints out the given message'
  ).withFlags([ 
    new Flag('-t', '--test', 'Just a test flag'),
    new Flag('-c', '--cassandra', 'My Baybeeehh')
  ]);

  /* Clear */
  cli.registerCommand(
    'clear', 
    function(sFlgs, lFlgs, args){
      var totalRows, startRow;
      totalRows = this._totalVisibleRowCapacity();
      startRow = this._currRow();
      this._doc().removeLines(startRow + 1, this._doc().getLength());
      while(this._line(this._topVisibleRow()) ||
        !this._line(this._topVisibleRow() - 1).contains('clear')){ 
        this._log('');
      }
      this.editor.moveCursorTo(startRow, 0);
    },
    'clear',
    'Clears recent commands from view'
  );

  /* Help */ //add indentation and space to make more readable
  cli.registerCommand(
    'help', 
    function(sFlgs, lFlgs, args){
      //make this smart based off of command info given
    },
    'help [command]',
    'Prints command usage info'
  );

  /* Cd */
  cli.registerCommand(
    'cd', function(sFlgs, lFlgs, args){}, '', ''
  );

  /* Ls */
  cli.registerCommand(
    'ls', function(sFlgs, lFlgs, args){}, '', ''
  );

  /* Vim */
  cli.registerCommand(
    'vim', function(sFlgs, lFlgs, args){}, '', ''
  );

  /* Repl */
  cli.registerCommand(
    'repl', function(sFlgs, lFlgs, args){}, '', ''
  );

  /* Run */
  cli.registerCommand(
    'run', function(sFlgs, lFlgs, args){}, '', ''
  );

  /*
   * Notes:
   * 1.cli height must be divisible by virtual_renderer lineheight for smooth scrollTo(x,y) action
   * 2.need to integrate color for easy recognition of prompt, user command, and logging
   * 3.format strings with spacing so that they can be equally spaced
   */
}