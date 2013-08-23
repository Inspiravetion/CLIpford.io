var TokenStyler = function () {
  this.lDelim = '{{';
  this.rDelim = '}}';
  this.styleExtractor = new RegExp(
    '(' + this.lDelim + '[^' + this.lDelim + ']*' + this.rDelim + ')'
  );
}

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

TokenStyler.prototype.styleTokens = function(data) {
  var tokens, styledTokens;
  tokens = data.tokens;
  styledTokens = [];

  for (var i = tokens.length - 1; i >= 0; i--) {
    styledTokens = styledTokens.concat(this.extractStyleTokens(tokens[i]));
  };

  data.tokens = styledTokens;
};
