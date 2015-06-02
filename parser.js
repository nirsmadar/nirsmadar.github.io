(function (global) {
    'use strict';
    var tokenType = {
        op: 'Operator',
        num: 'Number',
        id: 'Variable'
    };

    function Tokenizer() {
        var expression,
            length,
            index,
            OPERATORS,
            reset,
            createToken,
            isLetter,
            isOperator,
            isDecimalDigit,
            isWhiteSpace,
            peekAtNextChar,
            skipToNextChar,
            skipWhiteSpaces,
            createOperatorToken,
            createNumberToken,
            isVariablePrefix,
            isVariablePart,
            createVariableToken,
            tokenizeNext,
            tokenize;

        expression = '';
        length = 0;
        index = 0;
        OPERATORS = '/*-+()^';

        /**
         * resets the object for a new expression
         * @param {string} str the string that represents the expression
         */
        reset = function (str) {
            expression = str;
            length = expression.length;
            index = 0;
        };

        /**
         * checks if the character is an alphabet character
         * @param {string} ch the character to check
         * @return {bool} true if passes the check, false otherwise
         */
        isLetter = function (ch) {
            return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
        };

        /**
         * checks if the character is a number
         * @param {string} ch the character to check
         * @return {bool} true if passes the check, false otherwise
         */
        isDecimalDigit = function (ch) {
            return (ch !== null && ch >= '0' && ch <= '9');
        };

        /**
         * checks if the character is an operator
         * @param {string} ch the character to check
         * @return {bool} true if passes the check, false otherwise
         */
        isOperator = function (ch) {
            return OPERATORS.indexOf(ch) >= 0;
        };

        /**
         * checks if the ch is an white pace of any sort (whitespace, tab etc.)
         * @param {string} ch the character to check
         * @return {bool} true if passes the check, false otherwise
         */
        isWhiteSpace = function (ch) {
            return (ch === ' ') //space
                || (ch === 'u0009') //Unicode Character 'CHARACTER TABULATION' 
                || (ch === 'u00A0'); //Unicode Character NO-BREAK SPACE
        };

        /**
         * peeks at the next character without advancing the pointer
         * @return {string} the next character
         */
        peekAtNextChar = function () {
            return ((index < length) ? expression.charAt(index) : null);
        };

        /**
         * peeks at the next character and advancing the pointer
         * @return {string} the next character
         */
        skipToNextChar = function () {
            var ch;

            ch = peekAtNextChar();
            if (ch !== null) {
                index += 1;
            }

            return ch;
        };

        /**
         * skips whitespaces until a character of any sort is reached
         */
        skipWhiteSpaces = function () {
            var ch;

            while (index < length) {
                ch = peekAtNextChar();
                if (!isWhiteSpace(ch)) {
                    break;
                }
                skipToNextChar();
            }
        };

        /**
         * creates a token object from argumetns
         * @return {object} the new token
         */
        createToken = function (type, value) {
            return {
                type: type,
                value: value
            };
        };

        /**
         * creates an operator token object
         *     the function assumes that an operator length is 1 character
         * @return {object} the new operator token
         */
        createOperatorToken = function () {
            var ch;

            ch = peekAtNextChar();
            if (isOperator(ch)) {
                ch = skipToNextChar();
                return createToken(tokenType.op, ch);
            }

            return undefined;
        };

        /**
         * creates a number token object
         *     the number can be made of multiple characters
         * @return {object} the new number token
         */
        createNumberToken = function () {
            var ch,
                number,
                isDecimal;

            isDecimal = false;

            ch = peekAtNextChar();
            if (!isDecimalDigit(ch)) {
                return undefined;
            }

            number = skipToNextChar();
            while (true) {
                ch = peekAtNextChar();
                if (!isDecimal && ch === '.') {
                    isDecimal = true;
                }
                else if (!isDecimalDigit(ch)) {
                    break;
                }
                number += skipToNextChar();
            }

            number = new Number(number).toString();//TODO:looks ugly
            return createToken(tokenType.num, number);
        };

        /**
         * an helper function to check if the character is a prefix for an varialbe
         * @return {bool} true if passes the check, false otherwise
         */
        isVariablePrefix = function (ch) {
            return (ch === '_' || ch === '$') || isLetter(ch);
        };

        /**
         * an helper function to check if the character is the middle of an varialbe
         * @return {bool} true if passes the check, false otherwise
         */
        isVariablePart = function (ch) {
            return isVariablePrefix(ch) || isDecimalDigit(ch);
        };

        /**
         * creates an varialbe token object
         *     the varialbe can be made of multiple characters and has to start with '_' or a digit
         * @return {object} the new number token
         */
        createVariableToken = function () {
            var ch,
                varialbe;

            ch = peekAtNextChar();
            if (!isVariablePrefix(ch)) {
                return undefined;
            }

            varialbe = skipToNextChar();
            while (true) {
                ch = peekAtNextChar();
                if (!isVariablePart(ch)) {
                    break;
                }
                varialbe += skipToNextChar();
            }

            return createToken(tokenType.id, varialbe);
        };

        /**
         * tokenizes the next set of characters
         * @return {object} the new token
         */
        tokenizeNext = function () {
            var token;

            skipWhiteSpaces();
            if (index > length) {
                return undefined;
            }

            token = createOperatorToken();
            if (token !== undefined) {
                return token;
            }

            token = createNumberToken();
            if (token !== undefined) {
                return token;
            }

            token = createVariableToken();
            if (token !== undefined) {
                return token;
            }

            throw 'could not tokenize sequence';
        };

        /**
         * tokenizes an entire expression
         * @return {object} the new token array
         */
        tokenize = function () {
            var tokens,
                token;

            tokens = [];
            while (index < length) {
                token = tokenizeNext();
                if (token !== undefined) {
                    tokens.push(token);
                }
            }

            return tokens;
        };

        return {
            reset: reset,
            tokenize: tokenize
        };
    }

    //TODO: check if index can ever be > length when tokens are legal
    //TODO: check if index can ever be > length when tokens are not legal
    function TreeParser() {
        var orderOfOperations,
            tokens,
            length,
            index,
            peekAtNextToken,
            parse,
            parseExpression,
            parseAdditive,
            parseMultiplicative,
            parsePrimary,
            isInLevel,
            parseBinary,
            calculate,
            mathOperations;

        orderOfOperations = [['+', '-'],['*', '/'], ['^']];

        mathOperations = {
            '+' : function(x, y) {
                return x + y;
            },

            '-' : function(x, y) {
                return x - y;
            },

            '*' : function(x, y) {
                return x * y;
            },

            '/' : function(x, y) {
                if (y === 0) {
                    throw 'the right operand of a divide operator cannot be zero';
                }
                return x / y;
            },

            '^' : function(x, y) {
                return Math.pow(x, y);
            }            
        }

        tokens = [];
        length = 0;
        index = 0;

        peekAtNextToken = function () {
            if (index === length) {
                return null;
            }
            return tokens[index];
        };

        /**
         * creates an abstract tree from a tokens array
         *     this function does not validate the expression mathematically
         * @param {array} tokensArr an array that contains tokens
         * @return {object} the abstract expression tree root
         */
        parse = function (tokensArr) {
            tokens = tokensArr;
            length = tokens.length;
            if (length === 0) {
                return;
            }
            index = 0;

            //we want to parse the expression from left to right to avoid problems like 1-1-1=1
            tokens = tokens.reverse();
            return parseExpression();
        };

        /**
         * parses an assignment expression
         * @return {object} the abstract expression tree assignment node
         */
        parseExpression = function () {
            return parseBinary(0);
        };

        /**
         * parses an assignment expression
         * @return {object} the abstract expression tree assignment node
         */
        isInLevel = function (operator, order) {
            return orderOfOperations[order].indexOf(operator) > -1;
        };

        /**
         * recursivly parses a binary expression by order of operations
         *     each recursion level represents the more immidiate operation
         * @param {Number} order the current order of operation
         * @return {object} the abstract expression tree node
         */
        parseBinary = function (order) {
            var right,
                token,
                node;

            right = order == orderOfOperations.length - 1
                ? parsePrimary()
                : parseBinary(order + 1);
            
            token = peekAtNextToken();
            if (token === null) {
                return right;
            }

            while (isInLevel(token.value, order)) {
                index += 1;
                node = {};
                node = token;
                node.right = right;
                node.left = parseBinary(order);
                right = node;
                
                token = peekAtNextToken();
                if (token === null) {
                    return right;
                }
            }

            return right;
        };

        /**
         * parses a term expression i.e. a finite number, an varialbe or an expression in parens
         * @return {object} the abstract expression tree primary node
         */
        parsePrimary = function () {
            var token,
                node;

            if (index === length) {
                throw "error: there are no more tokens to parse";
            }

            token = tokens[index];
            if (token.type === tokenType.num || token.type === tokenType.id) {
                index += 1;
                node = {};
                node = token;
                return node;
            }

            if (token.value === ')') {
                index += 1;
                node = parseExpression();

                token = peekAtNextToken();
                if (token.value !== '(') {
                    throw "error: '(' was expected";
                }

                index += 1;
                return node;
            }

            throw "error: token '" + token.value + "' was not expected";
        };

        /**
         * calculates the result from mathematical tree
         * @param {object} the ree/sub tree token node
         * @return {Number} the result of the calculation
         */
        calculate = function (node) {
            var left,
                right,
                operator,
                result;

            if (node === null) return;
            if (node.type === tokenType.id) {
                throw 'variables are not supported at this point';
            }
            
            if (node.type === tokenType.num) {
                return parseFloat(node.value);
            }

            left = node.left.type === tokenType.num
                ? parseFloat(node.left.value)
                : calculate(node.left);

            right = node.right.type === tokenType.num
                ? parseFloat(node.right.value)
                : calculate(node.right);

            if (node.type !== tokenType.op) {
                throw 'an operator was expected';
            }

            result = mathOperations[node.value](left, right);
            return result; 
        }

        return {
            parse: parse,
            calculate: calculate
        };
    }

    global.tokenizer = new Tokenizer();
    global.treeParser = new TreeParser();
})(window);