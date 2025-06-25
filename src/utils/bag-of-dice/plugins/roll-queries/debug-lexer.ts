import { Lexer } from 'chevrotain';
import { allRollQueryTokens } from './tokens';

const RollQueryLexer = new Lexer(allRollQueryTokens);

const input = '?{Prompt|Option\\|A|Option\\,B}';
const lexResult = RollQueryLexer.tokenize(input);

console.log('LEXED TOKENS:');
lexResult.tokens.forEach(t => {
  console.log({ name: t.tokenType?.name, image: t.image });
}); 