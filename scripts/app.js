window.onload = function(){
  var cli = new CLI('cli');

  window.cli = cli;
  //COMMANDS-------------------------------------------------------------------

  /* Echo */
  cli.registerCommand(
    'echo', 
    function(sFlgs, lFlgs, args){
      this._log(args.join(' '), '.green');
    }, 
    'echo <message to echo>',
    'Prints out the given message'
  ).withFlags([ 
    new Flag('-t', '--test', 'Just a test flag'),
    new Flag('-c', '--cassandra', 'My Baybeeehh'),
    new Flag('-d', '', 'DISSS DICK'),
    new Flag('', '--Atrak', 'GOOOOOOO DJ...thats my DJ')
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
      this._editor.moveCursorTo(startRow, 0);
    },
    'clear',
    'Clears recent commands from view'
  );

  /* Help */ //add indentation and space to make more readable
  cli.registerCommand(
    'help', 
    function(sFlgs, lFlgs, args){
      if(args.length){
        args.forEach(function(cmd){
          this._log(this._commandRegistry[cmd].toString());
        }.bind(this));
      }
      else {
        for(cmd in this._commandRegistry){
          this._log(this._commandRegistry[cmd].usage);
        }
      }
    },
    'help [command]',
    'Prints command usage info'
  );

  /* Cd */
  cli.registerCommand(
    'cd', 
    function(sFlgs, lFlgs, args){
      var newPath, currPath, success;
      currPath = this._route.split('/');
      newPath  = args[0];

      if(newPath){
        if (newPath.startsWith('..')){
          while(newPath.startsWith('..')){
            currPath.pop();
            newPath = newPath.substr(3);
          }
          newPath = currPath.join('/') + (newPath ? '/' + newPath : '');
        }
        else if (newPath.startsWith('.')){
          newPath = this._route + newPath.substr(1);
        }

        if(newPath.endsWith('/')){
          newPath = newPath.substr(0, newPath.length - 1);
        }

        if(this._validateRoute(newPath)){
          this._route = newPath;
        }
        else {
          this._log('ERROR: You specified a path that does not exist');
        }
      }
      else{
        this._route = this._rootDir;
      }
      this._navigateTo(this._route);
      this._log(this._route);
    }, 
    'cd [relative | absolute path]', 
    'Navigates you through the site pages'
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

  //ROUTES---------------------------------------------------------------------
 
  cli.registerRoute(
    '~/test/directory', 
    'test',
    function(){
      console.log('route setup complete');
    }
  );

  cli.registerRoute(
    '~/another/test/directory', 
    'test2',
    function(){
      console.log('route setup complete');
    }
  );

  cli.registerRoute(
    '~/test/something', 
    'test3',
    function(){
      console.log('route setup complete');
    }
  );

  /*
   * Notes:
   * 1.cli height must be divisible by virtual_renderer lineheight for smooth scrollTo(x,y) action
   * 2.need to integrate color for easy recognition of prompt, user command, and logging
   */
}