window.onload = function(){
  var cli = new CLI('cli', new TokenStyler());

  //COMMANDS-------------------------------------------------------------------

  /* Echo */
  cli.registerCommand(
    'echo', 
    /**
     * [description]
     * @param  {[type]} sFlgs [description]
     * @param  {[type]} lFlgs [description]
     * @param  {[type]} args  [description]
     * @return {[type]}       [description]
     */
    function(sFlgs, lFlgs, args){
      this._log(args.join(' '), 'logging');
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
    /**
     * [description]
     * @param  {[type]} sFlgs [description]
     * @param  {[type]} lFlgs [description]
     * @param  {[type]} args  [description]
     * @return {[type]}       [description]
     */
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

  /* Help */
  cli.registerCommand(
    'help', 
    /**
     * [description]
     * @param  {[type]} sFlgs [description]
     * @param  {[type]} lFlgs [description]
     * @param  {[type]} args  [description]
     * @return {[type]}       [description]
     */
    function(sFlgs, lFlgs, args){
      if(args.length){
        args.forEach(function(cmd){
          this._log(this._commandRegistry[cmd].toString(), 'logging');
        }.bind(this));
      }
      else {
        for(cmd in this._commandRegistry){
          this._log(this._commandRegistry[cmd].usage, 'logging');
        }
      }
    },
    'help [command]',
    'Prints command usage info'
  );

  /* Cd */
  cli.registerCommand(
    'cd', 
    /**
     * [description]
     * @param  {[type]} sFlgs [description]
     * @param  {[type]} lFlgs [description]
     * @param  {[type]} args  [description]
     * @return {[type]}       [description]
     */
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
          this._logError('You specified a path that does not exist');
          return;
        }
      }
      else{
        this._route = this._rootDir;
      }
      this._navigateTo(this._route);
      this._log(this._route, 'logging');
    }, 
    'cd [relative | absolute path]', 
    'Navigates you through the site pages'
  );

  /* Ls */
  cli.registerCommand( //CANT HANDLE RELATIVE PATHS!!!
    'ls', 
    /**
     * List all of the files in the current routeObj
     * @param  {Object} sFlgs 
     * @param  {Object} lFlgs 
     * @param  {Object} args  
     */
    function(sFlgs, lFlgs, args){
      var route, files;
      route = args[0] || this._route;

      if(!this._validateRoute(route)){
        this._logError('The specified directory does not exist');
        return;
      }

      files = this._getRouteObj(route).routeData.files || []; 

      if(sFlgs['-l']){
        files.forEach(function(file){
          this._log(file, 'logging');
        }.bind(this));
      }
      else{
        this._prettyPrint(files);
      }
    }, 
    'ls <flag> [relative | absolute path]', 
    'Lists all of the files in the current directory'
  ).withFlags([ 
    new Flag('-l', '', 'list the files vertically')
  ]);

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
    '~/demos/Capsule', 
    'test',
    function(){
      console.log('route setup complete');
    }
  );

  cli.registerRoute(
    '~/demos/Reac', 
    'test2',
    function(){
      console.log('route setup complete');
    }
  );

  //fake state-----------------------------------------------------------------
   cli._getRouteObj('~').routeData.files = ['test.txt', 'Reac.rb', 'Capsule.js', 'asfasdfasdf.txt', 'asasdfasasdf.rb', 'asdf.txt', 'asasdfasddfsdf.sh'];


  /*
   * Notes:
   * 1.cli height must be divisible by virtual_renderer lineheight for smooth scrollTo(x,y) action
   */
}