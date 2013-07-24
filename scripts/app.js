window.onload = function(){
  var cli = new CLI('cli');

  /* Echo */
  cli.registerCommand(
    'echo', ['-t'], ['--test'], 'echo <message to echo>',
    function(sFlgs, dFlgs, args){
      this._log(args);
    },
    'Prints out the given message'
  );

  /* Clear */
  cli.registerCommand(
    'clear', [], [], 'clear',
    function(sFlgs, dFlgs, args){
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
    'Clears recent commands from view'
  );

  /* Help */ //add indentation and space to make more readable
  cli.registerCommand(
    'help', [], [], 'help [command]',
    function(sFlgs, dFlgs, args){
      //make this smart based off of command info given
    },
    'Prints command usage info'
  );

  /* Cd */
  cli.registerCommand(
    'cd', [], [], '', function(sFlgs, dFlgs, args){}, ''
  );

  /* Ls */
  cli.registerCommand(
    'ls', [], [], '', function(sFlgs, dFlgs, args){}, ''
  );

  /* Vim */
  cli.registerCommand(
    'vim', [], [], '', function(sFlgs, dFlgs, args){}, ''
  );

  /* Repl */
  cli.registerCommand(
    'repl', [], [], '', function(sFlgs, dFlgs, args){}, ''
  );

  /* Run */
  cli.registerCommand(
    'run', [], [], '', function(sFlgs, dFlgs, args){}, ''
  );

  /*
   * Notes:
   * 1.cli height must be divisible by virtual_renderer lineheight for smooth scrollTo(x,y) action
   * 2.need to integrate color for easy recognition of prompt, user command, and logging
   */
}