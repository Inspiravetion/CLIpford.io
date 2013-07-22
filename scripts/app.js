window.onload = function(){
	var cli = new CLI('cli');

	cli.registerCommand('echo', function(sFlgs, dFlgs, args){
    this._log(args);
  });

	cli.registerCommand('clear', function(sFlgs, dFlgs, args){
		var totalRows, startRow;
		totalRows = this._totalVisibleRowCapacity();
		startRow = this._currRow();

		this._doc().removeLines(startRow + 1, this._doc().getLength());
  	while(this._line(this._topVisibleRow())){
  		this._log('');
  	}
    this.editor.moveCursorTo(startRow, 0);
  });

  cli.registerCommand('help', function(sFlgs, dFlgs, args){
    this._log('The following commands are supported:');
    this._log('echo <some_message_to_echo>');
  });

  /*
	 * Notes:
	 * 1.cli height must be divisible by virtual_renderer lineheight for smooth scrollTo(x,y) action
	 * 2.need to integrate color for easy recognition of prompt, user command, and logging
   */
}