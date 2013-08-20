window.onload = function(){
	var editor, CliMode;
	// CliMode = require('ace/mode/cli').Mode;
	editor = ace.edit("editor");
	editor.session.bgTokenizer.tokenStyler = new TokenStyler();
	// editor.getSession().setMode(new CliMode());
}

//Mode-------------------------------------------------------------------------

// define('ace/mode/cli', function(require, exports, module) {
// 	var oop, TextMode, Tokenizer, CliHighlightRules;
// 	oop               = require("ace/lib/oop");
// 	TextMode          = require("ace/mode/text").Mode;
// 	Tokenizer         = require("ace/tokenizer").Tokenizer;
// 	CliHighlightRules = require("ace/mode/cli_highlight_rules").CliHighlightRules;

// 	var Mode = function() {
// 	    this.$tokenizer = new Tokenizer(new CliHighlightRules().getRules());
// 	};

// 	oop.inherits(Mode, TextMode);

// 	(function() {
	    
// 	}).call(Mode.prototype);

// 	exports.Mode = Mode;
// });

// //Highlight Rules--------------------------------------------------------------
// define('ace/mode/cli_highlight_rules', function(require, exports, module) {

// 	var oop = require("ace/lib/oop");
// 	var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

// 	var CliHighlightRules = function() {

// 	    this.$rules = {
// 	    	start : [{
// 	    		token : function(styleBlk, text) {
// 	    			return ['invisible', styleBlk.replace('{{', '').replace('}}', '')];
// 	    		},
// 	    		onMatch : function(match){
// 	    			console.log('onMatch got fired');
// 	    			console.log(arguments);
// 	    			var re = new RegExp(this.regex);
// 	    			var output = re.exec(match)[1].replace(/\{\{|\}\}/g, '');
// 	    			console.log(output);
// 	    			return output;
// 	    		},
// 	    		valueSwap : function(val){
// 	    			console.log('valueSwap ' + val);
// 	    			return val.replace(/\{\{.*\}\}/, '');
// 	    		},
// 	    		regex : '(\{\{.*\}\})(.*)'
// 	    	}]
// 	    };
	    
// 	}

// 	oop.inherits(CliHighlightRules, TextHighlightRules);

// 	exports.CliHighlightRules = CliHighlightRules;
// });

var TokenStyler = function () {
	this.styleExtractor = new RegExp(/\{\{(.*)\}\}/);
	this.lDelim = '{{';
	this.rDelim = '}}';
}

TokenStyler.prototype.styleTokens = function(data) {
	var tokens, styledTokens;
	tokens = data.tokens;
	styledTokens = [];
	for (var i = tokens.length - 1; i >= 0; i--) {
		styledTokens += this.getInnerStyledTokens(tokens[i]);
	};
	//set data.tokens = styledTokens;
};

TokenStyler.prototype.getInnerStyledTokens = function(token) {
	var innerTokens, text, styledTokens, splitText;
	styledTokens = [];
	innerTokens = token.value.split(this.lDelim);
	for (var i = 0; i < innerTokens.length; i++) {
		text = innerTokens[i];
		if(!text || /^\s$/.exec(text)){ //leading space isnt working
			!text || styledTokens.push({
				type : token.type,
				value : text
			});
		}
		else{
			splitText = text.split(this.rDelim);
			styledTokens.push({
				type : splitText[0],
				value : splitText[1]
			});
		}
	};
	console.log(styledTokens);
	return styledTokens;
	//collect tokens and return them
};