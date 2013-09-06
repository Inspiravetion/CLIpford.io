// Utility setup
//-----------------------------------------------------------------------------

/**
 * Syntactic sugar to help with dom manipulation
 * @param  {string} selector
 * @return {HTML node}
 */
var $ = function(selector){
  return document.querySelector(selector);
};

/**
 * Syntactic sugar to help with dom manipulation
 * @param  {string} selector
 * @return {Array of HTML nodes}
 */
var $$ = function(selector){
  return document.querySelectorAll(selector);
};

Object.defineProperty(String.prototype, 'startsWith', {
  /**
   * Returns true if a string starts with the given string,
   * false otherwise
   * @param  {string} str
   * @return {boolean}
   */
  value: function(str){
    return this.substr(0, str.length) == str;
  }
});

Object.defineProperty(String.prototype, 'endsWith', {
  /**
   * Returns true if a string ends with the given string,
   * false otherwise
   * @param  {string} str
   * @return {boolean}
   */
  value: function(str){
    return this.substr(0 - str.length) == str;
  }
});

Object.defineProperty(String.prototype, 'contains', {
  /**
   * Returns true if a string contains the given string,
   * false otherwise
   * @param  {string} str
   * @return {boolean}
   */
  value: function(str){
    return this.search(str) != -1;
  }
});

Object.defineProperty(String.prototype, 'padFront', {
  /**
   * Returns the current string padded from the front 
   * with the given string repeated the given number of times
   * @param  {int} num the number of times to repeat the padding string
   * @param  {string} str the pad string
   * @return {string}
   */
  value: function(num, str){
    str = str || ' ';
    return str.repeat(num) + this;
  }
});

Object.defineProperty(String.prototype, 'padBack', {
  /**
   * Returns the current string padded on the back 
   * with the given string repeated the given number of times
   * @param  {int} num the number of times to repeat the padding string
   * @param  {string} str the pad string
   * @return {string}
   */
  value: function(num, str){
    str = str || ' ';
    return this + str.repeat(num);
  }
});

Object.defineProperty(String.prototype, 'repeat', {
  /**
   * Returns the current string repeated the given amount of times
   * @param  {int} num the number of times to repeat the string
   * @return {string}
   */
  value: function(num){
    var repeatStr = '';
    for(var i = 0; i < num; i++){
      repeatStr += this;
    }
    return repeatStr;
  }
});

Object.defineProperty(Array.prototype, 'contains', {
  /**
   * Returns true if the Array contains the given object. If the object
   * is a function then it is passed each element in the array and if it
   * ever returns true then this function returns true
   * @param  {Object || Function} obj
   * @return {boolean}
   */
  value: function(obj){
    if(typeof obj == 'function'){
      for(var i = 0; i < this.length; i++){
        if(obj(this[i])){
          return true;
        }
      }
      return false;
    }
    return this.indexOf(obj) != -1;
  }
});

var HashHandler = require("ace/keyboard/hash_handler").HashHandler,
    Range       = require("ace/range").Range;

// Command Line Interface
//-----------------------------------------------------------------------------

/**
 * Creates a new CLI Object
 * @param {string} cliId the id of the HTML Element that the CLI should be 
 * attached to
 * @param {TokenStyler} optTokenStyler an optional TokenStyler to use for 
 * color logging
 */
var CLI = function(cliId, optTokenStyler){
  this._sFlagRegex         = new RegExp('^(?:\-)(\w*)');
  this._lFlagRegex         = new RegExp('^(?:\-\-)(\w*)');
  this._prompt             = '~/users/clip $>';
  this._cmdHistoryIndex    = 0;
  this._cachedCommand      = '';
  this._commandRegistry    = {};
  this._routeRegistry      = {};
  this._tabCommandRegistry = [];
  this._rootDir            = '~';
  this._route              = this._rootDir;
  this._editor             = ace.edit(cliId);
  this._initStyling();
  this._initKeyHandlers();
  this.setTokenStyler(optTokenStyler || null);
};

/**
 * Gives the BackgroundTokenizer and Document a reference to a TokenStyler
 * @param {TokenStyler} tStyler
 */
CLI.prototype.setTokenStyler = function(tStyler) {
  this._editor.session.bgTokenizer.tokenStyler = tStyler;
  this._doc().tokenStyler = tStyler;
};

/**
 * Initializes the styling and prompt of the CLI
 */
CLI.prototype._initStyling = function() {
  this._editor.setTheme('ace/theme/monokai');
  this._editor.renderer.setShowGutter(false);
  this._writePrompt();
};

/**
 * Writes the prompt out to the CLI. Called before every non-logging line
 */
CLI.prototype._writePrompt = function() {
  var pos = this._editor.getCursorPosition(); 
  this._editor.getSession().insert(pos, this._prompt);
};

/**
 * Returns the current TextLayer in the DOM...MIGHT BE DEAD CODE
 * @return {HTML Node} the DOM TextLayer of the CLI
 */
CLI.prototype._textLayer = function() {
  return this._editor.container.querySelector('.ace_text-layer');
};

/**
 * Returns wther the current cursor position is past the prompt so that it can
 * insert text there safely
 * @return {boolean}
 */
CLI.prototype._inEditableArea = function() { 
  return this._prompt.length < this._currCol();
};

/**
 * Returns the CLI's Document
 * @return {Document}
 */
CLI.prototype._doc = function() {
  return this._editor.getSession().getDocument();
};

/**
 * Returns the text line of the given row
 * @param  {int} row the row whos text you want
 * @return {string}
 */
CLI.prototype._line = function(row) {
  return this._editor.getSession().getLine(row);
};

/**
 * Returns the current row that the cursor is on
 * @return {int}
 */
CLI.prototype._currRow = function() {
  return this._editor.getCursorPosition().row; 
};

/**
 * Returns the current column that the cursor is on
 * @return {int}
 */
CLI.prototype._currCol = function() {
  return this._editor.getCursorPosition().column;
};

/**
 * Returns the length of the text of the current line
 * @return {int}
 */
CLI.prototype._currLineLength = function() {
  return this._line(this._currRow()).length;
};

/**
 * Returns the width, in characters, of the CLI
 * @return {int}
 */
CLI.prototype._width = function() {
  return Math.floor(
    this._editor.renderer.$size.width / this._editor.renderer.characterWidth
  );
};

/**
 * Returns just the command portion of the text on the specified row or the 
 * current row
 * @param  {int}
 * @return {string}
 */
CLI.prototype._getCommand = function(optRow) {
  var row, cmd;
  row = optRow || (optRow == 0 ? 0 : this._currRow());
  return this._line(row).replace(this._prompt, '').trim();
};

/**
 * Returns the number of rows visible in the current CLI window
 * @return {int}
 */
CLI.prototype._totalVisibleRowCapacity = function() {
  return Math.floor(
    this._editor.renderer.$size.height / this._editor.renderer.lineHeight
  );
};

/**
 * Returns the top visible row of the CLI 
 * @return {int}
 */
CLI.prototype._topVisibleRow = function() {
  return Math.ceil(
    this._editor.renderer.scrollTop / this._editor.renderer.lineHeight
  );
};

/**
 * Prints the given message to the CLI screen with the optional CSS class 
 * applied. Multiple classes can be given to different parts of a line by 
 * passing an array of messages and an array of css classes.
 * @param  {string | string[]} msg 
 * @param  {string | string[]} cssClass
 */
CLI.prototype._log = function(msg, cssClass) {
  if(typeof msg === 'string'){
    if (typeof cssClass === 'string') {
      this._logStyle(msg, cssClass);
    }
    else if (cssClass instanceof Array) {
      this._logStyle(msg, cssClass[0]);
    }
    else if (!cssClass) {
      this._editor.insert(msg);
    }
  }
  else if(msg instanceof Array){
    if(typeof cssClass === 'string') {
      this._logStyle(msg.join(''), cssClass);
    }
    else if (cssClass instanceof Array) {
      for(var i = 0; i < cssClass.length; i++){
        this._logStyle(msg[i], cssClass[i]);
      }
    }
    else if (!cssClass) {
      this._editor.insert(msg.join(''));
    }
  }

  this._doc().insertNewLine(this._editor.getCursorPosition());
};

/**
 * Applies token styler rules to a message before printing it to the CLI
 * @param  {string} msg
 * @param  {string} css
 */
CLI.prototype._logStyle = function(msg, css) {
  var ts = this._doc().tokenStyler;
  if(ts)
    this._editor.insert(ts.lDelim + css + ts.rDelim + msg);
};

/**
 * Logs errors with a specific format and css style
 * @param  {string} msg 
 */
CLI.prototype._logError = function(msg) {
  this._log('ERROR: ' + msg, 'error');
};

// Key event handling------------------

/**
 * Resets the key handlers to the default editor mode
 */
CLI.prototype._disableKeyHandlers = function() {
  this._editor.setKeyboardHandler(new HashHandler());
};

/**
 * Sets up the CLI key handlers
 */
CLI.prototype._initKeyHandlers = function() {
  this._bindKeys([
    { 'Return'   : this._return.bind(this)    },
    { 'Tab'      : this._tab.bind(this)       },
    { 'Backspace': this._backspace.bind(this) },
    { 'Up'       : this._up.bind(this)        }, 
    { 'Down'     : this._down.bind(this)      },
    { 'Left'     : this._left.bind(this)      },
    { 'Right'    : this._right.bind(this)     }
  ])
};

/**
 * Takes an array of key binding hashes, applies them to a Hash Handler, and 
 * binds those key handlers to the CLI
 * @param  {Obj[]} key_bindings
 */
CLI.prototype._bindKeys = function(key_bindings) {
  var handler = new HashHandler();
  for(var i = 0; i < key_bindings.length; i++){
    handler.bindKeys(key_bindings[i]);
  }
  this._editor.keyBinding.addKeyboardHandler(handler);
};

/**
 * Defines what should happen when the return key is pressed
 */
CLI.prototype._return = function() {
  var pos, cmd;
  pos = this._editor.getCursorPosition();
  cmd = this._getCommand();
  this._doc().insertNewLine(pos);
  this._handleCommand(cmd);
  this._writePrompt();
  this._cmdHistoryIndex = 0;
};

/**
 * Defines what should happen when the tab key is pressed
 */
CLI.prototype._tab = function() {
  var orig, prfx, possibles, pos, routeObj, routeArr, prfxRoute, argIndex, 
  backCount, length, low, high;
  
  pos       = this._editor.getCursorPosition();
  orig      = this._getCommand();
  args      = orig.split(' ');
  length    = this._prompt.length;
  possibles = [];
  prfx      = '';

  for(var i = 0; i < args.length; i++){
    low = i + length + 1;
    high = i + length + args[i].length;
    length += args[i].length;

    if(pos.column >= low && pos.column <= high){
      prfx = args[i];
      argIndex = i;
      break;
    }
  }

  if(prfx.endsWith('..'))
    possibles.push(prfx + '/');
  
  this._tabCommandRegistry.forEach(function(cmd){
    if(prfx && cmd.startsWith(prfx)){
      possibles.push(cmd);
    }
  });

  if(prfx.startsWith('..')){
    prfxRoute = (!prfx.endsWith('../') && prfx.endsWith('/')) ? 
      prfx.substr(0, prfx.length - 1) : (prfx == '..' ? '' : prfx);
    routeArr  = this._route.split('/');
    backCount = 0;
    
    while(prfx.startsWith('..')){
      prfx = prfx.substr(3);
      routeArr.pop();
      backCount++;
    }

    routeObj  = this._getRouteObj(routeArr.join('/'));

    if(routeObj){
      possibles = possibles.concat(
        this._getRouteChildren('../', prfxRoute, routeObj, backCount)
      );
    }
  }
  else if(prfx.startsWith('.')){
    prfxRoute = (prfx != './' && prfx.endsWith('/')) ? 
      prfx.substr(0, prfx.length - 1) : (prfx == '.' ? '' : prfx);
    routeObj  = this._getRouteObj(this._route);

    if(routeObj){
      possibles = possibles.concat(
        this._getRouteChildren('./', prfxRoute, routeObj, 1)
      );
    }
  }

  if(possibles.length == 1){
    args[argIndex] = possibles[0];

    this._replaceCommand(
      this._prompt + args.join(' '),
      (this._prompt + args.slice(0, argIndex + 1).join(' ')).length
    );
  }
  else if(possibles.length > 1){
    this._editor.moveCursorTo(this._currRow(), this._currLineLength());
    this._prettyPrint(possibles, true);
    this._writePrompt();
    this._editor.insert(args.join(' '));
    this._editor.moveCursorTo(this._currRow(), pos.column);
  }
};

/**
 * Defines what should happen when the backspace key is pressed
 */
CLI.prototype._backspace = function() {
  if(this._inEditableArea()){
    this._editor.remove("left");
  }
};

/**
 * Defines what should happen when the up key is pressed
 */
CLI.prototype._up = function() { 
  if(this._cmdHistoryIndex != this._doc().getLength() - 1){
    if(this._cmdHistoryIndex == 0){
      this._cachedCommand = this._getCommand();
    }
    this._cmdHistoryIndex++;
    if(!this._replaceCommand()){
      this._up();
    }
  }
};

/**
 * Defines what should happen when the down key is pressed
 */
CLI.prototype._down = function() {
  if(this._cmdHistoryIndex == 1){
    this._cmdHistoryIndex--;
    this._replaceCommand(this._prompt + this._cachedCommand);
  }
  else if(this._cmdHistoryIndex > 1){
    this._cmdHistoryIndex--;
    if(!this._replaceCommand()){
      this._down();
    }
  }
};

/**
 * Defines what should happen when the left key is pressed
 */
CLI.prototype._left = function() {
  if(this._inEditableArea()){
    this._editor.navigateLeft(1);
  }
};

/**
 * Defines what should happen when the right key is pressed
 */
CLI.prototype._right = function() {
  var endOfLine = this._line(this._currRow()).length;
  if(endOfLine > this._currCol()){
    this._editor.navigateRight(1);
  }
};

/**
 * Replaces the current command on the editable line with either a previously
 * used command or a given command. If optCol is passed in reset the cursor to 
 * that column
 * @param  {string} optCmd
 * @param  {int} optCol
 * @return {boolean}
 */
CLI.prototype._replaceCommand = function(optCmd, optCol) {
  var cmd, rng, logLine; 

  cmd = optCmd || (optCmd == '' ? '' : 
    this._line(this._currRow() - this._cmdHistoryIndex));
  rng = new Range(this._currRow(), this._prompt.length, this._currRow(), 10000);
  logLine = false;

  if(cmd.startsWith(this._prompt)){
    if(cmd != this._prompt || this._cmdHistoryIndex == 0){
      this._doc().replace(rng, cmd.replace(this._prompt, '').trim());
      logLine = true;
    }
  }

  if(optCol){
    this._editor.moveCursorTo(this._currRow(), optCol);
  }

  return logLine;
};

/**
 * Prints the array of strings in left aligned, equal length columns
 * @param  {string[]} argArr
 */
CLI.prototype._prettyPrint = function(argArr, newline) { 
  var width, gutter, maxStrLen, colWidth, colCount, row, arg;
  maxStrLen = 0;
  gutter    = '    ';
  width     = this._width();
  row       = '';

  if(newline)
    this._log('');  

  if(width < argArr.join(gutter).length){

    argArr.forEach(function(str){
      if(str.length > maxStrLen){
        maxStrLen = str.length;
      }
    });

    colCount = Math.floor(width / (maxStrLen + gutter.length));

    for(var i = 0; i < argArr.length; i++){
      if(i != 0 && i % colCount == 0){ 
        this._log(row, 'logging');
        row = '';
      }
      arg = argArr[i].trim();
      row += (arg.padBack(maxStrLen - arg.length) + gutter);
    }

    this._log(row, 'logging'); 
  }
  else{
    this._log(argArr.join(gutter), 'logging');
  }
};

// Command handling--------------------

/**
 * Splits up and passes the command, short flags, long flags, and args  
 * to a registered command function if it exists.
 * @param  {string} rawCmd
 */
CLI.prototype._handleCommand = function(rawCmd) {
  var cmdArr, cmdName, sFlags, lFlags, args, cmdParts;
  this._validCommand = true;
  cmdArr   = rawCmd.split(' ');
  cmdName  = cmdArr.shift();
  cmdParts = this._sortCommandParams(cmdName, cmdArr);
  sFlags   = cmdParts.sFlags;
  lFlags   = cmdParts.lFlags;
  args     = cmdParts.args;
  if(this._commandRegistry[cmdName] && this._validCommand){
    this._commandRegistry[cmdName].cmd.call(this, sFlags, lFlags, args);
  }
};

/**
 * Splits up a command into short flags, long flags, and arguments. Also 
 * validates that the flags being used for the current command exist.
 * @param  {string} cmdName
 * @param  {string[]} paramArr
 * @return {Object}
 */
CLI.prototype._sortCommandParams = function(cmdName, paramArr) {
  var sFlags = {}, lFlags = {}, args = [];
  for(var i = 0; i < paramArr.length; i++){
    if(this._lFlagRegex.test(paramArr[i])){
      if(this._commandRegistry[cmdName].hasFlag(paramArr[i])){ 
        lFlags[paramArr[i]] = paramArr[i + 1];
        i++;
      } 
      else {
        this._logError('Unknown flag ' + paramArr[i] + ' applied to ' + cmdName);
        this._validCommand = false;
      }
    }
    else if(this._sFlagRegex.test(paramArr[i])){
      if(this._commandRegistry[cmdName].hasFlag(paramArr[i])){
        sFlags[paramArr[i]] = true;
      } 
      else {
        this._logError('Unknown flag ' + paramArr[i] + ' applied to ' + cmdName);
        this._validCommand = false;
      }
    } 
    else {
      args.push(paramArr[i])
    }
  }
  return { 'sFlags' : sFlags, 'lFlags' : lFlags, 'args' : args };
};

/**
 * Registers a command so it can be tabbable and so that it can be called later
 * @param  {string} name
 * @param  {function} cmdFunc
 * @param  {string} usage
 * @param  {string} description
 * @return {Command}
 */
CLI.prototype.registerCommand = function(name, cmdFunc, usage, description) {
  this._tabCommandRegistry.push(name); 
  return this._commandRegistry[name] = new Command(cmdFunc, usage, description);
};

// Routing-----------------------------

/**
 * Register a route so that if the route is navigated to, the webRoute will 
 * show up in the url bar and the setup function will be called.
 * @param  {string} unixRoute
 * @param  {string} webRoute
 * @param  {function} setup
 */
CLI.prototype.registerRoute = function(unixRoute, webRoute, setup) {
  var currObj, splitRoute;
  splitRoute = unixRoute.split('/');
  currObj    = this._routeRegistry;
  for(var i = 0; i < splitRoute.length; i++){
    currObj[splitRoute[i]] = currObj[splitRoute[i]] || {};
    currObj = currObj[splitRoute[i]];
    currObj.routeData = currObj.routeData || { 
      'webRoute' : splitRoute[i], 
      'setup' : null,
      'files' : null 
    };
  }

  currObj.routeData = { 
    'webRoute' : webRoute, 
    'setup' : setup,
    'files' : currObj.files || null 
  };

  this._tabCommandRegistry.push(unixRoute);
};

/**
 * Return whether the given route actually exists
 * @param  {string} unixRoute
 * @return {boolean}
 */
CLI.prototype._validateRoute = function(unixRoute) { //CANNOT HANDLE RELATIVE PATHS
  var currObj, splitRoute;
  splitRoute = unixRoute.split('/');
  currObj = this._routeRegistry;
  for(var i = 0; i < splitRoute.length; i++){
    if(currObj[splitRoute[i]]){
      currObj = currObj[splitRoute[i]];
    }
    else{
      return false;
    }
  }
  return true;
};

/**
 * Calls the setup function of a route and changes the 
 * url to match the route's webroute.
 * @param  {string} unixRoute 
 */
CLI.prototype._navigateTo = function(unixRoute) {
  var route;

  if(!(route = this._getRouteObj(unixRoute))){
    return;
  }

  route = route.routeData;

  if(route.setup)
    route.setup.call(this);

  window.history.pushState(null, null, route.webRoute);
};

CLI.prototype._toFullRoute = function(unixRoute) { //a recursive version would be more flexible
  var currRoute, routeArr, fullRoute;
  currRoute = this._route;

  if(unixRoute.startsWith(this._rootDir)){
    fullRoute = unixRoute;
  }
  else if(unixRoute.startsWith('..')){
    routeArr = currRoute.split('/');
    while(unixRoute.startsWith('..')){
      routeArr.pop();

      if(unixRoute == '..'){
        unixRoute = '';
      }
      else{
        unixRoute = unixRoute.substr(3);
      }
    }
    fullRoute = routeArr.join('/') + '/' + unixRoute;
  }
  else if (unixRoute.startsWith('.')){
    if (unixRoute.length == 1){
      fullRoute = currRoute + '/' + unixRoute.substr(1); 
    }
    else if (unixRoute.startsWith('./')){
      fullRoute = currRoute + '/' + unixRoute.substr(2);
    }
    else{
      fullRoute = currRoute + '/' + unixRoute;      
    }
  }
  else{
    fullRoute = this._route + '/' + unixRoute;
  }
  return this._validateRoute(fullRoute) ? fullRoute : null; 
};

/**
 * Returns the route Object associated with a unix route
 * @param  {string} routeStr 
 * @return {Object}
 */
CLI.prototype._getRouteObj = function(routeStr) { //cannot handle relative routes charlie
  var currObj, directories;
  directories = this._toFullRoute(routeStr);
  currObj = this._routeRegistry;

  if(directories){
    directories = directories.split('/');
  }
  else{
    return null;
  }

  for(var i = 0; i < directories.length; i++){
    currObj = currObj[directories[i]];
  }
  return currObj;
};

/**
 * Returns an array of unix route strings one level deeper from
 * the prfxroute
 * @param  {string} prfx          repeated prfx
 * @param  {string} fullPrfxRoute the full unix route prefix
 * @param  {Object} routeObj      route object
 * @param  {int} prfxCount        The number of times prfx is supposed to repeat
 * @return {string[]}               
 */
CLI.prototype._getRouteChildren = function(prfx, fullPrfxRoute, routeObj, prfxCount) {
  var routes, prfxRoute, currObj, repeatPrfx;
  repeatPrfx = prfx.repeat(prfxCount);
  prfxRoute  = fullPrfxRoute.replace(repeatPrfx, '').split('/');

  routes = this._getValidRouteChildren(routeObj, prfxRoute, 0, repeatPrfx);

  return routes || [];
};

/**
 * Returns an array of route strings at most one level down 
 * @param  {Object} routeObj 
 * @param  {string[]} prfxArr  
 * @param  {int} index    
 * @param  {string} prfx     
 * @return {string[]}          
 */
CLI.prototype._getValidRouteChildren = function(routeObj, prfxArr, index, prfx) {
  var possibles;
  possibles = [];

  if(index != prfxArr.length){
    for(var key in routeObj){
      if(key != 'routeData' && key == prfxArr[index]){
        return this._getValidRouteChildren(
          routeObj[key], 
          prfxArr, 
          index + 1, 
          prfx + key + '/'
        );
      }
    }
  }

  if(index == prfxArr.length - 1){
    for(var key in routeObj){
      if(key != 'routeData' && key.startsWith(prfxArr[index])){
        possibles.push(prfx + key);
      }
    }
  }

  if(index == prfxArr.length){
    for(var key in routeObj){
      if(key != 'routeData'){
        possibles.push(prfx + key);
      }
    }
  }

  return possibles.length ? possibles : null;
};

// Inner Classes
//-----------------------------------------------------------------------------

// Command 
//-------------------------------------

/**
 * Class to represent a command
 * @param {function} cmdFunc   function to be called when the command is run
 * @param {string} usage       a desciprion of how to use the command
 * @param {string} description a description of what the command does
 */
var Command = function(cmdFunc, usage, description){
  this.flags          = null;
  this.usage          = usage;
  this.description    = description;
  this.cmd            = cmdFunc;
  this.maxFlagNameLen = 0;
};

/**
 * Registers flags with this command and sets the maxFlagNameLen for
 * the command
 * @param  {Flag[]} flagArr 
 */
Command.prototype.withFlags = function(flagArr) {
  this.flags = flagArr || [];
  this.flags.forEach(function(flag){
    if(flag.length() > this.maxFlagNameLen){
      this.maxFlagNameLen = flag.length();
    }
  }.bind(this));
};

/**
 * Returns whether or not a command has a certain flag registered to it
 * @param  {string}  flagStr 
 * @return {Boolean} 
 */
Command.prototype.hasFlag = function(flagStr) {
  if(!this.flags)
    return false;

  return this.flags.contains(function(flag){
    return flag.short == flagStr || flag.long == flagStr;
  });
};

/**
 * Returns a string representation of the command
 * @return {string} 
 */
Command.prototype.toString = function() {
  var str = '';
  str += this.usage + '\n\n';
  if(this.flags){
    this.flags.forEach(function(flag){
      str += flag.toString(this.maxFlagNameLen) + '\n';
    }.bind(this));
  }
  return str;
};

// Flag 
//-------------------------------------

/**
 * A class to represent a flag
 * @param {string} short   
 * @param {string} long        
 * @param {string} description 
 */
var Flag = function(short, long, description){
  this.short       = short || '';
  this.long        = long || '';
  this.description = description || '';
  this.delim       = ' , ';
};

/**
 * Returns the length of the base string representation of the flag
 * @return {int} 
 */
Flag.prototype.length = function() {
  if(this.long && this.short){
    return this.short.length + this.long.length + this.delim.length; 
  }
  return this.short.length || this.long.length;
};

/**
 * Returns a string representation of the Flag optimized for pretty printing
 * @param  {int} maxLen 
 * @return {string}      
 */
Flag.prototype.toString = function(maxLen) {
  var str = '',
  pad = maxLen - this.length();
  if(this.short && this.long){
    str += (this.short + this.delim + this.long).padBack(pad);
  }
  else if(this.short){
    str += this.short.padBack(pad);
  }
  else if(this.long){
    str += this.long.padBack(pad);
  }
  str += '\t' + this.description;
  return str;
};
