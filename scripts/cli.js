// Utility setup
//-----------------------------------------------------------------------------

var $ = function(sel){
  return document.querySelector(sel);
};

var $$ = function(sel){
  return document.querySelectorAll(sel);
};

var getPadding = function(num, char){
  var padding = '';
  char = char || ' ';
  for(var i = 0; i < num; i++){
    padding += char;
  }
  return padding;
}

Object.defineProperty(String.prototype, 'startsWith', {
  value: function(str){
    return this.substr(0, str.length) == str;
  }
});

Object.defineProperty(String.prototype, 'endsWith', {
  value: function(str){
    return this.substr(0 - str.length) == str;
  }
});

Object.defineProperty(String.prototype, 'contains', {
  value: function(str){
    return this.search(str) != -1;
  }
});

Object.defineProperty(String.prototype, 'padFront', {
  value: function(num, char){
    return getPadding(num, char) + this;
  }
});

Object.defineProperty(String.prototype, 'padBack', {
  value: function(num, char){
    return this + getPadding(num, char);
  }
});

Object.defineProperty(String.prototype, 'repeat', {
  value: function(num){
    var repeatStr = '';
    for(var i = 0; i < num; i++){
      repeatStr += this;
    }
    return repeatStr;
  }
});

Object.defineProperty(Array.prototype, 'contains', {
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

CLI.prototype.setTokenStyler = function(tStyler) {
  this._editor.session.bgTokenizer.tokenStyler = tStyler;
};

CLI.prototype._initStyling = function() {
  this._editor.setTheme('ace/theme/monokai');
  this._editor.renderer.setShowGutter(false);
  this._writePrompt();
};

CLI.prototype._writePrompt = function() {
  var pos = this._editor.getCursorPosition(); 
  this._editor.getSession().insert(pos, this._prompt);
};

CLI.prototype._textLayer = function() {
  return this._editor.container.querySelector('.ace_text-layer');
};

CLI.prototype._inEditableArea = function() { 
  return this._prompt.length < this._currCol();
};

CLI.prototype._doc = function() {
  return this._editor.getSession().getDocument();
};

CLI.prototype._line = function(row) {
  return this._editor.getSession().getLine(row);
};

CLI.prototype._currRow = function() {
  return this._editor.getCursorPosition().row; 
};

CLI.prototype._currCol = function() {
  return this._editor.getCursorPosition().column;
};

CLI.prototype._currLineLength = function() {
  return this._line(this._currRow()).length;
};

CLI.prototype._getCommand = function(optRow) {
  var row, cmd;
  row = optRow || (optRow == 0 ? 0 : this._currRow());
  return this._line(row).replace(this._prompt, '').trim();
};

CLI.prototype._totalVisibleRowCapacity = function() {
  return Math.floor(
    this._editor.renderer.$size.height / this._editor.renderer.lineHeight
  );
};

CLI.prototype._topVisibleRow = function() {
  return Math.ceil(
    this._editor.renderer.scrollTop / this._editor.renderer.lineHeight
  );
};

CLI.prototype._log = function(msg, cssClass) {
  if(typeof msg != 'string'){
    msg = msg.toString();
  }

  if(!cssClass){
    this._editor.insert(msg);
  }
  else if(typeof cssClass == 'string'){
    this._logStyle(msg, cssClass);
  }
  else if(cssClass instanceof Array){
    for(var i = 0; i < cssClass.length; i++){
      this._logStyle(cssClass[i].msg, cssClass[i].css);
    }
  }
  this._doc().insertNewLine(this._editor.getCursorPosition());
};

CLI.prototype._logStyle = function(msg, css) {
  // var container;
  // this._editor.insert(msg);
  // container = this._textLayer().children;
  // console.log(container);
  //asynchronous event emitter calls are fuckn up this part
};

CLI.prototype._width = function() {
  return Math.floor(
    this._editor.renderer.$size.width / this._editor.renderer.characterWidth
  );
};

CLI.prototype._height = function() {
  return this._editor.renderer.$size.height;
};

// Key event handling------------------
CLI.prototype._disableKeyHandlers = function() {
  this._editor.setKeyboardHandler(new HashHandler());
};

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

CLI.prototype._bindKeys = function(key_bindings) {
  var handler = new HashHandler();
  for(var i = 0; i < key_bindings.length; i++){
    handler.bindKeys(key_bindings[i]);
  }
  this._editor.keyBinding.addKeyboardHandler(handler);
};

CLI.prototype._return = function() {
  var pos, cmd;
  pos = this._editor.getCursorPosition();
  cmd = this._getCommand();
  this._doc().insertNewLine(pos);
  this._handleCommand(cmd);
  this._writePrompt();
  this._cmdHistoryIndex = 0;
};

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
    possibles = possibles.concat(
      this._getRouteChildren('../', prfxRoute, routeObj, backCount)
    );
  }
  else if(prfx.startsWith('.')){
    prfxRoute = (prfx != './' && prfx.endsWith('/')) ? 
      prfx.substr(0, prfx.length - 1) : (prfx == '.' ? '' : prfx);
    routeObj  = this._getRouteObj(this._route);
    possibles = possibles.concat(
      this._getRouteChildren('./', prfxRoute, routeObj, 1)
    );
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
    this._prettyPrint(possibles);
    this._writePrompt();
    this._editor.insert(args.join(' '));
    this._editor.moveCursorTo(this._currRow(), pos.column);
  }
};

CLI.prototype._backspace = function() {
  if(this._inEditableArea()){
    this._editor.remove("left");
  }
};

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

CLI.prototype._left = function() {
  if(this._inEditableArea()){
    this._editor.navigateLeft(1);
  }
};

CLI.prototype._right = function() {
  var endOfLine = this._line(this._currRow()).length;
  if(endOfLine > this._currCol()){
    this._editor.navigateRight(1);
  }
};

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

CLI.prototype._prettyPrint = function(argArr) {
  var width, gutter, maxStrLen, colWidth, colCount, row;
  maxStrLen = 0;
  gutter    = '\t';
  width     = this._width();
  row       = '';
  
  argArr.forEach(function(str){
    if(str.length > maxStrLen){
      maxStrLen = str.length;
    }
  });

  colCount = Math.floor(width / (maxStrLen + gutter.length));

  this._log('');
  for(var i = 0; i < argArr.length; i++){
    if(i != 0 && i % colCount == 0){ 
      this._log(row);
      row = '';
    }
    row += argArr[i].padBack(maxStrLen - argArr[i].length) + gutter;
  }
  this._log(row); 
};

// Command handling--------------------

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

CLI.prototype._sortCommandParams = function(cmdName, paramArr) {
  var sFlags = {}, lFlags = {}, args = [];
  for(var i = 0; i < paramArr.length; i++){
    if(this._lFlagRegex.test(paramArr[i])){
      if(this._commandRegistry[cmdName].hasFlag(paramArr[i])){ 
        lFlags[paramArr[i]] = paramArr[i + 1];
        i++;
      } 
      else {
        this._log('ERROR: Unknown flag ' + paramArr[i] + ' applied to ' + cmdName);
        this._validCommand = false;
      }
    }
    else if(this._sFlagRegex.test(paramArr[i])){
      if(this._commandRegistry[cmdName].hasFlag(paramArr[i])){
        sFlags[paramArr[i]] = true;
      } 
      else {
        this._log('ERROR: Unknown flag ' + paramArr[i] + ' applied to ' + cmdName);
        this._validCommand = false;
      }
    } 
    else {
      args.push(paramArr[i])
    }
  }
  return { 'sFlags' : sFlags, 'lFlags' : lFlags, 'args' : args };
};

CLI.prototype.registerCommand = function(name, cmdFunc, usage, description) {
  this._tabCommandRegistry.push(name); 
  return this._commandRegistry[name] = new Command(cmdFunc, usage, description);
};

// Routing-----------------------------

CLI.prototype.registerRoute = function(unixRoute, webRoute, setup) {
  var currObj, splitRoute;
  splitRoute = unixRoute.split('/');
  currObj    = this._routeRegistry;
  for(var i = 0; i < splitRoute.length; i++){
    currObj[splitRoute[i]] = currObj[splitRoute[i]] || {};
    currObj = currObj[splitRoute[i]];
    currObj.routeData = { 'webRoute' : splitRoute[i], 'setup' : null };
  }

  currObj.routeData = { 
    'webRoute' : webRoute, 
    'setup' : setup 
  };

  this._tabCommandRegistry.push(unixRoute);
};

CLI.prototype._validateRoute = function(unixRoute) {
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

CLI.prototype._navigateTo = function(unixRoute) {
  var route;
  route = this._getRouteObj(unixRoute).routeData;

  if(route.setup)
    route.setup.call(this);

  window.history.pushState(null, null, route.webRoute);
};

CLI.prototype._getRouteObj = function(routeStr) {
  var currObj, directories;
  directories = routeStr.split('/');
  currObj = this._routeRegistry;
  for(var i = 0; i < directories.length; i++){
    currObj = currObj[directories[i]];
  }
  return currObj;
};

CLI.prototype._getRouteChildren = function(prfx, fullPrfxRoute, routeObj, prfxCount) {
  var routes, prfxRoute, currObj, repeatPrfx;
  repeatPrfx = prfx.repeat(prfxCount);
  prfxRoute  = fullPrfxRoute.replace(repeatPrfx, '').split('/');

  routes = this._getValidRouteChildren(routeObj, prfxRoute, 0, repeatPrfx);

  return routes || [];
};

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

var Command = function(cmdFunc, usage, description){
  this.flags          = null;
  this.usage          = usage;
  this.description    = description;
  this.cmd            = cmdFunc;
  this.maxFlagNameLen = 0;
};

Command.prototype.withFlags = function(flagArr) {
  this.flags = flagArr || [];
  this.flags.forEach(function(flag){
    if(flag.length() > this.maxFlagNameLen){
      this.maxFlagNameLen = flag.length();
    }
  }.bind(this));
};

Command.prototype.hasFlag = function(flagStr) {
  return this.flags.contains(function(flag){
    return flag.short == flagStr || flag.long == flagStr;
  });
};

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

var Flag = function(short, long, description){
  this.short       = short || '';
  this.long        = long || '';
  this.description = description || '';
  this.delim       = ' , ';
};

Flag.prototype.length = function() {
  if(this.long && this.short){
    return this.short.length + this.long.length + this.delim.length; 
  }
  return this.short.length || this.long.length;
};

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
