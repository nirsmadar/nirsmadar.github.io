/*jslint browser: true*/
$(document).ready(function () {
    'use strict';
    var MAX_EXP_LENGTH,
        OPERATORS,
        shouldAutoClear,
        expressionElm,
        tokensElm,
        treeElm,
        resultElm;

    MAX_EXP_LENGTH = 33;
    OPERATORS = '+-*/()';

    shouldAutoClear = false;
    expressionElm = $('#expression');
    tokensElm = $('#tokens');
    treeElm = $('#tree');
    resultElm = $('#result');

    expressionElm.focus();

    // $('#expression').html('   1    +  2 -3 + xx');
    // $('#expression').html('((9+87)*84-(66.2*x))+3');
    // $('#expression').html('(2-3)-1*4^55');
    //$('#expression').html('2.1000 + 6');
    // $('#expression').html('1+2');
    //$('#expression').html('2*8^4');

    function clearAll() {
        shouldAutoClear = false;
        expressionElm.empty();
        tokensElm.empty();
        treeElm.empty();
        resultElm.empty();
    }

    function parse(tokens) {
        return treeParser.parse(tokens);
    }

    function tokenize(exp) {
        tokenizer.reset(exp);
        return tokenizer.tokenize();
    }

    function drawTokensTable(tokens, tableElm) {
        var i,
            tableHtml;

        tableHtml = '<table id="tokens-table"><thead><tr><th class="col-xs-2">Value</th><th class="col-xs-10">Type</th></tr></thead><tbody>';
        for (i = 0; i < tokens.length; i++) {
            tableHtml += '<tr><td>' + tokens[i].value + '</td><td>' + tokens[i].type + '</td></tr>';
        }
        tableHtml += '</tbody></table>';
        tableElm.append(tableHtml);
    }

    function getTreeNodeHtml(node) {
        var left,
            right,
            childrenHtml;

        childrenHtml = '';

        if (node === null || node === undefined) {
            return;
        }

        left = getTreeNodeHtml(node.left);
        right = getTreeNodeHtml(node.right);

        if (left && right) {
            childrenHtml = '<ul>' + left + right + '</ul>';
        }
        return '<li><span>' + node.value + '</span>' + childrenHtml + '</li>';
    }

    function drawTree(root, htmlElm) {
        var treeHtml;

        treeHtml = '<ul>';
        treeHtml += getTreeNodeHtml(root);
        treeHtml += '</ul>';
        htmlElm.append(treeHtml);
    }

    function updateExpression(value) {
    	if (shouldAutoClear) {
    		clearAll();
    	}

    	value = expressionElm.text() + value;
    	expressionElm.html(value);
    }

    function updateResult(exp) {
        var tokens,
            root,
            result;

        clearAll();

        if (exp === undefined || exp.length === 0) {
            return;
        }

        while (exp[exp.length -1] === '=') {
        	exp = exp.substring(0, exp.length - 1);
        }

        try {
            try {
                tokens = tokenize(exp);
            }
            catch (ex) {
                throw ex;
            }

            drawTokensTable(tokens, tokensElm);
        }
        catch(ex) {
            tokensElm.html('<span style="color:#FF2655;font-size:2vh">Could not parse the expression as a tokens table: ' + ex + '</span>');
        }

        try {
            try {
                root = parse(tokens);
            }
            catch (ex) {
                throw ex;
            }

            drawTree(root, treeElm);
        }
        catch(ex) {
            treeElm.html('<span style="color:#FF2655;font-size:2vh">Could not parse the expression as a tree: ' + ex + '</span>');
        }

        try {
            try {
                if (root === undefined) {
                    throw 'the tree is not defined';
                }
                result = calculate(root);
            }
            catch (ex) {
                throw ex;
            }

            resultElm.html(result);
        }
        catch(ex) {
            resultElm.html('<span style="color:#FF2655;font-size:2vh;margin-right:10px;">Could not calculate an expression from the tree: ' + ex + '</span>');
        }

        exp += '=';
        expressionElm.html(exp);

        shouldAutoClear = true;
    }

    function isValidCharacter(ch) {
        return /^[a-z0-9_$.\-\+\*/()\^]+$/i.test(ch);
    }

    function calculate(tree) {
    	return treeParser.calculate(tree);
    }

    //http://stackoverflow.com/questions/4233265/contenteditable-set-caret-at-the-end-of-the-text-cross-browser
    function placeCaretAtEnd(el) {
	    el.focus();
	    if (typeof window.getSelection != "undefined"
	            && typeof document.createRange != "undefined") {
	        var range = document.createRange();
	        range.selectNodeContents(el);
	        range.collapse(false);
	        var sel = window.getSelection();
	        sel.removeAllRanges();
	        sel.addRange(range);
	    } else if (typeof document.body.createTextRange != "undefined") {
	        var textRange = document.body.createTextRange();
	        textRange.moveToElementText(el);
	        textRange.collapse(false);
	        textRange.select();
	    }
	}

    /**
     * handles mouse clicks on ui elements
     */
    $('#controls').on('click', 'span', function () {
        var spanElm,
            type,
            value,
            exp;

        spanElm = $(this);
        type = spanElm.attr('data-type');

        switch (type) {
        case 'key':
            value = spanElm.attr('data-value');
            updateExpression(value);
            break;
        case 'var':
            value = prompt('Pleaes enter a valid variable name.\n\nIt can only start with an underscore or a letter,\ne.g. "_myVar" or "myVar":');
            if (value === null) {
                return;
            }
            updateExpression(value);
            break;
        case 'delete':
            deleteLastChar();
            break;
        case 'clear':
            clearAll();
            break;
        case 'calculate':
        	exp = expressionElm.html();
            updateResult(exp);
            break;
        }

        placeCaretAtEnd(expressionElm.get(0));
    });

    /**
     * forces validation on the expression field
     */
    $('body').on('keypress', function (e) {
        var code,
            charCode;

        code = e.keyCode || e.which;
        charCode = String.fromCharCode(code);

		if (!isValidCharacter(charCode)) {
            e.preventDefault();
            return;
        }
        
        if (shouldAutoClear) {
            clearAll();
        }

       placeCaretAtEnd(expressionElm.get(0));
    });

    /**
     * handles special keys
     */
    $('body').on('keydown', function (e) {
        var code,
        	exp;
        
        code = e.keyCode || e.which;

        //8: delete, 46: backspace
        if (code === 8 || code === 46) {
            shouldAutoClear = false;
            return;
        }

        //27: Esc
        if (code === 27) {
            clearAll();
            e.preventDefault();
            return;
        }

        //13: Enter
        if (code === 13)
        {
            exp = expressionElm.html();
            updateResult(exp);
            e.preventDefault();
            return;
        }
    });
});