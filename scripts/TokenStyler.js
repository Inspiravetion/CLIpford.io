/**
 * A class that acts as middleware for the ace editor renderer. If present, 
 * it will take tokens that are given by the tokenizer and create styled tokens
 * with custom css based off its deliminator settings
 */
var TokenStyler = function () {
  this.lDelim = '{{';
  this.rDelim = '}}';
  this.styleExtractor = new RegExp(
    '(' + this.lDelim + '[^' + this.lDelim + ']*' + this.rDelim + ')'
  );
}

/**
 * Takes a token and returns an array of custom styled tokens that were 
 * subtokens of the original token.
 * @param  {Object} token 
 * @return {Object[]}       
 */
TokenStyler.prototype.extractStyleTokens = function(token) {
  var matchArr, innerTokens;
  innerTokens = [];
  matchArr = token.value.split(this.styleExtractor);
  if(!matchArr[0])
    matchArr.shift();

  if(!matchArr[0].startsWith(this.lDelim)){
    innerTokens.push({
      type  : token.type,
      value : matchArr[0]
    });
    matchArr.shift();
  }

  for(var i = 0; i < matchArr.length; i += 2){
    innerTokens.push({
      type  : matchArr[i].replace(this.lDelim, '').replace(this.rDelim, ''),
      value : matchArr[i + 1]
    });
  }

  return innerTokens;
};

/**
 * Replaces unstyled tokens with styled tokens based on the deliminator settings
 * @param  {Object} data 
 */
TokenStyler.prototype.styleTokens = function(data) {
  var tokens, styledTokens;
  tokens = data.tokens;
  styledTokens = [];

  for (var i = tokens.length - 1; i >= 0; i--) {
    styledTokens = styledTokens.concat(this.extractStyleTokens(tokens[i]));
  };

  data.tokens = styledTokens;
};
