// Utility setup
//-----------------------------------------------------------------------------

var $ = function(sel){
  return document.querySelector(sel);
};

var $$ = function(sel){
  return document.querySelectorAll(sel);
};

Object.defineProperty(String.prototype, 'startsWith', {
  value: function(str){
    var sub = this.substr(0, str.length);
    return sub == str;
  }
})

Object.defineProperty(String.prototype, 'contains', {
  value: function(str){
    var index = this.search(str);
    return index != -1;
  }
})

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
    var index = this.indexOf(obj);
    return index != -1;
  }
})

var HashHandler = require("ace/keyboard/hash_handler").HashHandler,
    Range       = require("ace/range").Range;

// Command Line Interface
//-----------------------------------------------------------------------------

var CLI = function(cliId){
  this.editor = ace.edit(cliId);
  this._commandRegistry = {};
  this._tabCommandRegistry = [];
  this._totalRowCount = 0;
  this._initStyling();
  this._initKeyHandlers();
};

CLI.prototype._initStyling = function() {
  this.editor.setTheme('ace/theme/monokai');
  this.editor.renderer.setShowGutter(false);
  this._writePrompt();
};

CLI.prototype._writePrompt = function() {
  var pos = this.editor.getCursorPosition(); 
  this.editor.getSession().insert(pos, this.prompt);
};

CLI.prototype._inEditableArea = function() { 
  return this.prompt.length < this._currCol();
};

CLI.prototype._doc = function() {
  return this.editor.getSession().getDocument();
};

CLI.prototype._line = function(row) {
  return this.editor.getSession().getLine(row);
};

CLI.prototype._currRow = function() {
  return this.editor.getCursorPosition().row; //this is wrong on scroll
};

CLI.prototype._currCol = function() {
  return this.editor.getCursorPosition().column;
};

CLI.prototype._getCommand = function(optRow) {
  var row, cmd;
  row = optRow || (optRow == 0 ? 0 : this._currRow());
  return this._line(row).replace(this.prompt, '').trim();
};

CLI.prototype._totalVisibleRowCapacity = function() {
  return Math.floor(
    this.editor.renderer.$size.height / this.editor.renderer.lineHeight
  );
};

CLI.prototype._topVisibleRow = function() {
  return Math.ceil(
    this.editor.renderer.scrollTop / this.editor.renderer.lineHeight
  );
};

CLI.prototype._log = function(msg) {
  this.editor.insert(msg);
  this._doc().insertNewLine(this.editor.getCursorPosition());
};

// Key event handling------------------
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
  this.editor.keyBinding.addKeyboardHandler(handler);
};

CLI.prototype._return = function() {
  var pos, cmd;
  pos = this.editor.getCursorPosition();
  cmd = this._getCommand();
  this._doc().insertNewLine(pos);
  this._handleCommand(cmd);
  this._writePrompt();
  this.cmdHistoryIndex = 0;
};

CLI.prototype._tab = function() {
  //right now only works for last word...should make it work on cursor
  var orig, prfx, possibles, self, pos;
  self = this;
  pos = this.editor.getCursorPosition();
  orig = this._getCommand();
  prfx = orig.split(' ').pop();
  possibles = [];
  this._tabCommandRegistry.forEach(function(cmd){
    if(cmd.startsWith(prfx)){
      possibles.push(cmd);
    }
  });
  if(possibles.length == 1){
    this._replaceCommand(this.prompt + possibles[0]);
  }
  else if(possibles.length > 1){
    //display horizontally instead of vertically
    this._doc().insertNewLine(pos);
    possibles.forEach(function(cmd){
      self._log(cmd);
    });
    this._writePrompt();
    this.editor.insert(orig);
  }
};

CLI.prototype._backspace = function() {
  if(this._inEditableArea()){
    this.editor.remove("left");
  }
};

CLI.prototype._up = function() { 
  if(this.cmdHistoryIndex != this._doc().getLength() - 1){
    if(this.cmdHistoryIndex == 0){
      this._cachedCommand = this._getCommand();
    }
    this.cmdHistoryIndex++;
    if(!this._replaceCommand()){
      this._up();
    }
  }
};

CLI.prototype._down = function() {
  if(this.cmdHistoryIndex == 1){
    this.cmdHistoryIndex--;
    this._replaceCommand(this.prompt + this._cachedCommand);
  }
  else if(this.cmdHistoryIndex > 1){
    this.cmdHistoryIndex--;
    if(!this._replaceCommand()){
      this._down();
    }
  }
};

CLI.prototype._left = function() {
  if(this._inEditableArea()){
    this.editor.navigateLeft(1);
  }
};

CLI.prototype._right = function() {
  var endOfLine = this._line(this._currRow()).length;
  if(endOfLine > this._currCol()){
    this.editor.navigateRight(1);
  }
};

CLI.prototype._empty = function(optMsg) {
  return function(){
    if(optMsg)
      console.log(optMsg)
  }
};

CLI.prototype._replaceCommand = function(optCmd) {
  var cmd, rng; 
  cmd = optCmd || (optCmd == '' ? '' : 
    this._line(this._currRow() - this.cmdHistoryIndex));
  rng = new Range(this._currRow(), this.prompt.length, this._currRow(), 10000);
  if(cmd.startsWith(this.prompt)){
    this._doc().replace(rng, cmd.replace(this.prompt, '').trim());
    return true;
  }
  return false;
};

// Command handling--------------------

CLI.prototype._handleCommand = function(rawCmd) {
  var cmdArr, cmdName, sFlags, lFlags, args, parts;
  cmdArr  = rawCmd.split(' ');
  cmdName = cmdArr.shift();
  this._validCommand = true;
  parts   = this._sortCommandParams(cmdName, cmdArr);
  sFlags  = parts.sFlags;
  lFlags  = parts.lFlags;
  args    = parts.args;
  if(this._commandRegistry[cmdName] && this._validCommand){
    this._commandRegistry[cmdName].cmd.call(this, sFlags, lFlags, args);
  }
};

CLI.prototype._sortCommandParams = function(cmdName, paramArr) {
  var sFlags = {}, lFlags = {}, args = [];
  for(var i = 0; i < paramArr.length; i++){
    if(this._dFlagRegex.test(paramArr[i])){
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
  this._tabCommandRegistry.push(name); //still need to add path tab integration
  return this._commandRegistry[name] = new Command(cmdFunc, usage, description);
};

// Class variables---------------------

CLI.prototype.prompt = '~/users/clip $>';

CLI.prototype.cmdHistoryIndex = 0;

CLI.prototype._cachedCommand = '';

CLI.prototype._sFlagRegex = new RegExp('^(?:\-)(\w*)');

CLI.prototype._dFlagRegex = new RegExp('^(?:\-\-)(\w*)');

// Inner Classes
//-----------------------------------------------------------------------------

var Command = function(cmdFunc, usage, description, flags){
  this.flags       = flags || [];
  this.usage       = usage;
  this.description = description;
  this.cmd         = cmdFunc;
};

Command.prototype.withFlags = function(flagArr) {
  this.flags = flagArr || [];
};

Command.prototype.hasFlag = function(flagStr) {
  return this.flags.contains(function(flag){
    return flag.short == flagStr || flag.long == flagStr;
  });
};

Command.prototype.toString = function() {
  var str = '';
  str += this.usage + '\n\n';
  this.flags.forEach(function(flag){
    str += flag.toString() + '\n';
  });
  return str;
};

var Flag = function(short, long, description){
  this.short       = short;
  this.long        = long;
  this.description = description;
};

Flag.prototype.toString = function() {
  var str = '';
  if(this.short && this.long){
    str += this.short + ' , ' + this.long;
  }
  else if(this.short){
    str += this.short;
  }
  else if(this.long){
    str += this.long;
  }
  str += '\t' + this.description;
  return str;
};
