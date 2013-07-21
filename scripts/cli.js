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

var HashHandler = require("ace/keyboard/hash_handler").HashHandler,
    Range       = require("ace/range").Range;

// Command Line Interface
//-----------------------------------------------------------------------------

var CLI = function(cliId){
	this.editor = ace.edit(cliId);
  this._commandRegistry = {};
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
  console.log(this._currCol());
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

CLI.prototype._log = function(msg) {
  this.editor.insert(msg);
  this._doc().insertNewLine(this.editor.getCursorPosition());
};

// Key event handling------------------
CLI.prototype._initKeyHandlers = function() {
	this._bindKeys([
    { 'Return'   : this._return.bind(this) },
    { 'Backspace': this._backspace.bind(this) },
		{ 'Up'       : this._up.bind(this) }, 
		{ 'Down'     : this._down.bind(this) },
		{ 'Left'     : this._left.bind(this) },
		{ 'Right'    : this._right.bind(this) }
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
    this._replaceCommand(this._cachedCommand);
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
  this.editor.navigateRight(1);
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

//gotta do flag logic******
CLI.prototype._handleCommand = function(rawCmd) {
  var cmdArr, cmd;
  cmdArr = rawCmd.split(' ');
  cmd = cmdArr.shift();
  if(this._commandRegistry[cmd]){
    this._commandRegistry[cmd].call(this, null, null, cmdArr.join(' '));
  }
};

CLI.prototype.registerCommand = function(name, cmdFunc) {
  this._commandRegistry[name] = cmdFunc; 
};

// Class variables---------------------

CLI.prototype.prompt = 'charlie/lipford $>';

CLI.prototype.cmdHistoryIndex = 0;

CLI.prototype._cachedCommand = '';