window.onload = function(){
	var cli = new CLI('cli');

	cli.registerCommand('echo', function(sFlgs, dFlgs, args){
    this._log(args);
  });

  cli.registerCommand('help', function(sFlgs, dFlgs, args){
    this._log('The following commands are supported:');
    this._log('echo <some_message_to_echo>');
  });
}