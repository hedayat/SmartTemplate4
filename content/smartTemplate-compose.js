"use strict";
/* 
BEGIN LICENSE BLOCK

	SmartTemplate4 is released under the Creative Commons (CC BY-ND 4.0)
	Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
	For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


// -------------------------------------------------------------------
// Insert template message and edit quote header
// -------------------------------------------------------------------
SmartTemplate4.classSmartTemplate = function() {
  const Ci = Components.interfaces,
        Cc = Components.classes,
        util = SmartTemplate4.Util,
	      prefs = SmartTemplate4.Preferences;
  
			
	function readSignatureFile(Ident) {
		let sigEncoding = prefs.getMyStringPref('signature.encoding'), // usually UTF-8
		    htmlSigText = '',
		    fileName = '';
	  if (util.Application == 'Postbox') {
			throw('readSignatureFile - reading signature from file is not supported in Postbox!');
		}
		util.logDebugOptional('functions.extractSignature','SmartTemplate4.readSignatureFile()');
		// test code for reading local sig file (WIP)
		try {
			let sigFile = Ident.signature.QueryInterface(Ci.nsIFile);
			if (sigFile)
			{
				fileName = sigFile.path;
				util.logDebug('readSignatureFile() '
				        + '\nTrying to read attached signature file: ' + sigFile.leafName
				        + '\nat: ' + fileName );
// 					        + '\nfile size: ' + sigFile.fileSize
// 					        + '\nReadable:  '  + sigFile.isReadable()
// 					        + '\nisFile:    '  + sigFile.isFile());


				// let's check whether the file is an image:
        // use a regexp / as "strings" will escape backslashes!
				let isImage = (sigFile.leafName.toLowerCase().match( /\.(png|apng|jpg|jpeg|jp2k|gif|tif|bmp|dib|rle|ico|svg|webp)$/));
				
				if (isImage) {
					let filePath = "file:///" + fileName;
					// change to data URL
					filePath = util.getFileAsDataURI(filePath);
				  htmlSigText = "<img src='" + filePath + "'\\>";
          util.logDebugOptional('functions.extractSignature','Sig is image: ' + htmlSigText);
				}
				else {
					let data = "",
					    //read file into a string so the correct identifier can be added
					    fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream),
					    cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
					fstream.init(sigFile, -1, 0, 0);
          /* sigEncoding: The character encoding you want, default is using UTF-8 here */
					cstream.init(fstream, sigEncoding, 0, 0);
          let countRead = 0,
					    str = {};
					{
						let read = 0;
						do {
							read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
							data += str.value;
              countRead += read;
						} while (read != 0);
					}
					cstream.close(); // this closes fstream

					htmlSigText = data.toString();
          util.logDebugOptional('functions.extractSignature','Signature text read: (' + countRead + ') bytes.');
				}
		  }
		}
		catch(ex) {
			htmlSigText = "(problems reading signature file - see tools / error console for more detail)";
			util.logException(
			   "readSignatureFile - exception trying to read signature attachment file; expected charSet = " + sigEncoding + " !\n" 
			   + "Either save your signature with this charset or can change it through the config setting extensions.smartTemplate4.signature.encoding\n"  
			   + fileName, ex);
		}
		util.logDebugOptional('functions.extractSignature','SmartTemplate4.readSignatureFile() ends - charset = ' + sigEncoding  +'; htmlSigText:\n'
		                                   + htmlSigText + '[EOF]');
		return htmlSigText;
	};
	
	
	//  this.modifierCurrentTime = "%X:=today%";   // scheiss drauf ...
	// -----------------------------------
	// Extract Signature
	// signatureDefined - 'auto', 'text' or 'html' if the %sig% variable ist part of our template - this means signature must be deleted in any case
  //                    'omit' to suppress (remove only)
	// 1. removes signature node from the email
	// 2. extract current Signature (should return signature from the account and not from the mail if it is defined!)
	function extractSignature(Ident, signatureDefined, composeType) {
    let isSigInBlockquote = false;
	  SmartTemplate4.Sig.init(Ident);
		let htmlSigText = SmartTemplate4.Sig.htmlSigText, // might not work if it is an attached file (find out how this is done)
		    sig = '',
		    isSignatureHTML = SmartTemplate4.Sig.htmlSigFormat; // only reliable if in textbox!
		util.logDebugOptional(
      'functions','extractSignature()\nSTART==========  extractSignature(' + Ident + ', defined type=' + signatureDefined + ', compose type=' + composeType + ')  ========');
		let bodyEl = gMsgCompose.editor.rootElement,
		    nodes = gMsgCompose.editor.rootElement.childNodes;
		SmartTemplate4.signature = null;
		SmartTemplate4.sigInTemplate = false;

		let pref = SmartTemplate4.pref,
		    idKey = util.getIdentityKey(document), // util.mailDocument?
		    isSignatureTb = (!!htmlSigText) || Ident.attachSignature,
		    sigNode = null,
		    sigText;

    // find signature node...
		if (isSignatureTb) {
			util.logDebugOptional('functions.extractSignature','find moz-signature...');
			// try to extract already inserted signature manually - well we need the last one!!
			// get the signature straight from the bodyElement!
			//signature from top
			if (Ident.replyOnTop && !Ident.sigBottom) {
				sigNode = findChildNode(bodyEl, 'moz-signature');
			}
			//signature from bottom
			else {
				let signatureNodes = bodyEl.getElementsByClassName('moz-signature');
				if (signatureNodes && signatureNodes.length) {
					sigNode = signatureNodes[signatureNodes.length-1];
				}
			}
			// eliminate this if it is contained in BLOCKQUOTE
			if (sigNode && sigNode.parentNode) {
				if (sigNode.parentNode.nodeName) {
					if (sigNode.parentNode.nodeName.toLowerCase() == 'blockquote')
						isSigInBlockquote = true;
				}
			}
			util.logDebugOptional('functions.extractSignature','signature node ' 
			                                     + (sigNode ? 'was ' : 'not ')
			                                     + 'found' 
																					 + (isSigInBlockquote ? ' in <blockquote>!' : '.'));
		}

		// read text from signature file...
		let sigType = 'unknown';
    if (signatureDefined == 'omit') {
      isSignatureHTML = false;
      sigType = 'plain text';
      sigText = ''
    }
    else {
      if (Ident.attachSignature) { // Postbox never gets here:
        let fileSig = readSignatureFile(Ident);
        if (fileSig) {
          htmlSigText = fileSig;
          // look for html tags, because htmlSigFormat might be unchecked
          // while an attached sig file might still be in HTML format.
          if (signatureDefined != 'html' 
              && 
              signatureDefined != 'text') {
            if (fileSig.toLowerCase().match("<br>|<br/>|<div.*>|<span.*>|<style.*>|<table.*>|<p.*>|<u>|<b>|<i>|<pre.*>|<img.*>")) {
              isSignatureHTML = true;
              sigType = 'HTML';
            }
            else
              sigType = 'probably not HTML';
              
          }
        }
      }
      if (signatureDefined == 'html') {
        isSignatureHTML = true;
        sigType = 'HTML';
      }
      else if (signatureDefined == 'text') {
        isSignatureHTML = false;
        sigType = 'plain text';
      }
      else if (htmlSigText && !Ident.attachSignature) { // trust the checkbox as last thing.
        sigType = SmartTemplate4.Sig.htmlSigFormat ?  'HTML' : 'plain text';
      }
      util.logDebugOptional('functions.extractSignature', 'Signature Type (from file) is ' + sigType);

      // retrieve signature Node; if it doesn't work, try from the account
      // let sigText = sigNode ? sigNode.innerHTML : htmlSigText;
      sigText = isSigInBlockquote ? '' : htmlSigText
                 ? htmlSigText : (sigNode && sigNode.innerHTML) 
                 ? sigNode.innerHTML : '';
      sigText = (sigText) ? sigText : '';  
    }
			
    
    if ((sigType == 'plain text' || sigType == 'probably not HTML')
        && (prefs.getMyBoolPref('signature.replaceLF.plaintext.br'))) {
      sigText = sigText.replace(/\r\n/g, '<br>');
      sigText = sigText.replace(/\n/g, '<br>');
    }
		

		let removed = false;
		// LET'S REMOVE THE SIGNATURE
		//  && signatureDefined
		if (isSignatureTb && sigNode) {
			util.logDebugOptional('functions.extractSignature', 'First attempt to remove Signature.');
			let ps = sigNode.previousElementSibling;
			if (ps && ps.tagName === "BR") {
				//remove the preceding BR that TB always inserts
				try {
					gMsgCompose.editor.deleteNode(ps);
				}
				catch(ex) {
					util.logException("extractSignature - exception removing <br> before signature!", ex);
				}
			}
			// remove original signature (the one inserted by Thunderbird)
			try {
				gMsgCompose.editor.deleteNode(sigNode);
				removed = true;
			}
			catch(ex) {
				util.logException("extractSignature - exception removing signature!", ex);
			}
			//gMsgCompose.editor.document.removeChild(sigNode);
		}

		// remove previous signature (fallback). 
		if (!removed) {
			util.logDebugOptional('functions.extractSignature', 'Not removed. 2nd attempt to remove previous sig...');
			for (let i = 0; i < nodes.length; i++) {
				if (nodes[i].className && nodes[i].className == "moz-signature" ) {
					let pBr = nodes[i].previousElementSibling;
					let old_sig = bodyEl.removeChild(nodes[i]); // old_sig is just to check, not used
					removed = true;
					// old code - remove the preceding BR that TB always inserts
					if (pBr && pBr.tagName == "BR")
						bodyEl.removeChild(pBr); 
					break;
				}
			}
			// let's discard the old signature instead.
		}
		
		// still not removed. Maybe an error happened and it slipped into the blockquote;
		// let's have a global setting for removing it
		if (!removed && isSigInBlockquote && prefs.getMyBoolPref('signature.removeBlockQuotedSig.onFail')) {
			try {
				gMsgCompose.editor.deleteNode(sigNode);
				removed = true;
			}
			catch(ex) {
				util.logException("extractSignature - exception removing signature from blockquote!", ex);
			}
		}

		// okay now for the coup de grace!!
		if (prefs.getMyBoolPref('parseSignature') && sigText) {
			try {
				sigText = getProcessedText(sigText, idKey, composeType, true);
			}
			catch(ex) {
				util.logException(ex, "getProcessedText(signature) failed.");
			}
		}

		let dashesTxt = 
			prefs.getMyBoolPref('signature.insertDashes.plaintext') ? SmartTemplate4.signatureDelimiter : "";
		let dashesHTML = 
			prefs.getMyBoolPref('signature.insertDashes.html') ? SmartTemplate4.signatureDelimiter : "";
		if (gMsgCompose.composeHTML) {
			sig = util.mailDocument.createElement("div");
			sig.className = 'moz-signature';
			// if our signature is text only, we need to replace \n with <br>
			if (!isSignatureHTML) {
				util.logDebugOptional('functions.extractSignature', 'Replace text sig line breaks with <br>...');
				// prettify: txt -> html
				// first replace CRLF then LF
				// ASCII signature
				// check for empty signature!!
				if (sigText.length<=1) {
					sigText = '';
					util.logDebugOptional('functions.extractSignature', 'no signature defined!');
				}
				else {
					sigText = dashesTxt 
								+ "<pre>"
								+ sigText.replace(/\r\n/g, "<BR>").replace(/\n/g, "<BR>")
								+ "</pre>";  // .replace(/ /g, '&nbsp;') - we do not need this as we wrap in pre, anyway!
				}
			} 
			else {
				sigText = dashesHTML + sigText;
			}
			sig.innerHTML = sigText;  // = gMsgCompose.identity.htmlSigText;
			// TEST STUFF..
		}
		else {
			// createTextNode( ) returns a DOMString (16bit)
			sig = dashesTxt + sigText;  // gMsgCompose.editor.document.createTextNode(sigText);
		}

		util.logDebugOptional('functions.extractSignature','==============  extractSignature=============END\n'
		                                   + 'Return Signature:\n' + sig );

		return sig;
	};


	// -----------------------------------
	// Delete DOMNode/textnode or BR
	// change: return the type of node:
	// "cite-prefix" - the original header texts
	// tag name: usually "br" | "div" | "#text"
	// "unknown" - no node or nodeName available
	function deleteNodeTextOrBR(node, idKey, isPlainText)	{
		let isCitation = false,
		    match=false,
		    theNodeName='',
		    cName = '';
		if (node && node.nodeName)
			theNodeName = node.nodeName.toLowerCase();
		else
			return 'unknown';

		let content = '';
		if (node.innerHTML)
			content += '\ninnerHTML: ' + node.innerHTML;
		if (node.nodeValue)
			content += '\nnodeValue: ' + node.nodeValue;
		if (!content)
			content = '\nEMPTY';
		switch(theNodeName) {
			case 'p':
				match = true;
				break;
			case 'br':
				match = true;
				break;
			case '#text':
        // the text "Axel wrote:" is also a plain text node! So we must delete this even in Text mode.
				if (!isPlainText) // AG change: only delete text nodes if we are in HTML mode.
					match = true;
				break;
      case 'span':  // Postbox
        // Postbox 4 simple check whether string ends with :
        if (SmartTemplate4.Util.Application == 'Postbox') {
          if (node.innerHTML && node.innerHTML.lastIndexOf(':') == node.innerHTML.length-1)
            match = true;
        }
        break;
			case 'div': // tb 13++
				if (node.className &&
				    node.className.indexOf('moz-cite-prefix')>=0) {
					if (prefs.isDebugOption('composer')) debugger;
					cName = node.className;
					match = true;
					isCitation = true;
				}
				break;
		}

		if (match) {
				let msg = cName ? ('div class matched: ' + cName + '  ' + theNodeName) : theNodeName;
				util.logDebugOptional('deleteNodes','deleteNodeTextOrBR() - deletes node ' + msg
						+ '\n_________' + node.nodeName + '_________' + content);
			if (isCitation) {
				// lets not remove it if the box [x] "Use instead of default quote header" is not checked
				if (!SmartTemplate4.pref.isDeleteHeaders(idKey, "rsp", false))
					return 'cite-prefix'; // we do not remove the citation prefix if this account doesn't have this option specified

			}
			orgQuoteHeaders.push(node);
			// rescue the signature from citation before deleting the node
			gMsgCompose.editor.deleteNode(node);
		}
		else
			util.logDebugOptional('deleteNodes','deleteNodeTextOrBR() - ignored nonmatching ' + theNodeName);
		return isCitation ? 'cite-prefix' : theNodeName;
	};


	// -----------------------------------
	// Delete all consecutive whitespace nodes...
	function deleteWhiteSpaceNodes(node) {
		let match = true,
		    count = 0;
		while (node && match) {
			let nextNode = node.nextSibling;
			match = false;
			switch (node.nodeType) {
				case Node.TEXT_NODE:
					if (node.nodeValue == '\n' || node.nodeValue == '\r')
						match=true;
					break;
				case Node.ELEMENT_NODE:
					if (node.nodeName && node.nodeName.toLowerCase() == 'br')
						match = true;
					break;
				default:
					match = false;
			}
			if (match) {
				util.logDebugOptional('deleteNodes','deleteWhiteSpaceNodes() - deletes node '
						+ '\n' + node.nodeName + '	' + node.nodeValue);
				gMsgCompose.editor.deleteNode(node);
				node = nextNode;
			}
		}
		util.logDebugOptional('deleteNodes','deleteWhiteSpaceNodes() - deleted ' + count + ' nodes.');
	};

	function deleteHeaderNode(node) {
		if (node) {
			util.logDebugOptional('functions','deleteHeaderNode() - deleting ' + node.nodeName
						+ '\n' + node.innerHTML);
			orgQuoteHeaders.push(node);
			gMsgCompose.editor.deleteNode(node);
		}
	};

	function isQuotedNode(node) {
		if (!node)
			return false;

// Note:  moz-cite-prefix might be the container for the headers (shown _before_ the quote)
// 		    node.className &&
// 		    node.className.indexOf('moz-cite-prefix')>=0
    if (node.nodeName && node.nodeName.toLowerCase() == 'blockquote')
			return true;
		if (!node.parentNode) return false;
		// make this recursive; if the node is child of a quoted parent, it is also considered to be quoted.
		return isQuotedNode(node.parentNode); 
	};

	// -----------------------------------
	// Delete quote header (reply)
	//In compose with HTML, body is
	//	<BR><BR>(<- if reply_on_top=1) <#text#>..... (reply_header_xxxx) <BLOCKQUOTE> original-message
	//In compose with TEXT, body is
	//	<BR><BR>(<- if reply_on_top=1) <#text#>..... (reply_header_xxxx) <BR><SPAN> original-message
	//We need to remove a few lines depending on reply_ono_top and reply_header_xxxx.
	// [Bug 26523] added an additional option to only delete the space before the original quote header
	function delReplyHeader(idKey, onlyHeader, onlySpace) {
		function countLF(str) { return str.split("\n").length - 1; }

		util.logDebugOptional('functions','SmartTemplate4.delReplyHeader()');
		let rootEl = gMsgCompose.editor.rootElement,
		    pref = SmartTemplate4.pref,
		    lines = 0;
		if (pref.getCom("mail.identity." + idKey + ".reply_on_top", 1) == 1) {
			lines = 2;
		}
		if (prefs.getMyBoolPref('debug.functions.delReplyHeader')) debugger;

		let node = rootEl.firstChild,
		    elType = '',
		    skipInPlainText = !gMsgCompose.composeHTML,
        preserve = prefs.getMyBoolPref('plainText.preserveTextNodes'),
				foundReplyHeader = false;
		// delete everything except (or until in plaintext?) quoted part
		// in Postbox, just delete class=__pbConvHr - there is no cite-prefix in Postbox!
		while (node) {
			let n = node.nextSibling;
			// skip the forwarded part
			// (this is either a blockquote or the previous element was a moz-cite-prefix)
			if (skipInPlainText && elType == 'cite-prefix')
				break;  // all following parts are in plain text, so we don't know whether they are all part of the quoted email
			
			if (isQuotedNode(node) || elType == 'cite-prefix' || elType == 'moz-cite-prefix') {
				// skip element after quote header
				node = n;
				continue;
			}
			
			if (onlyHeader) { // don't delete all previous nodes!
				if (node.nodeName.toLowerCase()=='div' &&
				    node.className &&
				    node.className.indexOf('moz-cite-prefix')>=0) {
					elType = deleteNodeTextOrBR(node, idKey, skipInPlainText && preserve); // 'cite-prefix'
				}
				node = n;
				continue;
			}
			
			elType = deleteNodeTextOrBR(node, idKey, skipInPlainText && preserve); // 'cite-prefix'
			if (elType == 'cite-prefix')
				foundReplyHeader = true;
			node = n;
		}

		// remove quote header elemenbt
		if (!onlySpace) {
			const quoteHeaderCls = (util.Application != 'Postbox') ? 'moz-email-headers-table' : '__pbConvHr';
			// recursive search from root element
			let node = findChildNode(rootEl, quoteHeaderCls);
			if (node) {
				util.logDebugOptional('functions.delReplyHeader','found ' + quoteHeaderCls +', calling deleteHeaderNode()...');
				deleteHeaderNode(node);
			}
			if (!foundReplyHeader) {
				node = findChildNode(rootEl, 'moz-cite-prefix');
				if (node) {
					// only delete prefix if it is NOT within a blockquote
					if (!isQuotedNode(node))
						deleteNodeTextOrBR(node, idKey, skipInPlainText && preserve);
				}
			}
				
		}
		/*   // OLD CODE
		else {
			switch (pref.getCom("mailnews.reply_header_type", 1)) {
				case 3:	// LFLF + author + separator + ondate + colon+LF
				case 2:	// LFLF + ondate + separator + author + colon+LF
					lines += countLF(pref.getCom("mailnews.reply_header_separator", ","));
					lines += countLF(pref.getCom("mailnews.reply_header_ondate", "(%s)"));
				case 1:	// LFLF + author + colon+LF
				default:	// Handle same as 1
					lines += countLF(pref.getCom("mailnews.reply_header_authorwrote", "%s wrote"));
					lines += countLF(pref.getCom("mailnews.reply_header_colon", ":"));
				case 0:	// LFLF + LF
					lines++;
					break;
			}
			util.logDebugOptional('functions.delReplyHeader','older version of Tb [' + util.AppverFull + '], deleting ' + lines + ' lines');

			// Delete original headers .. eliminates all #text nodes but deletes the others
			while (rootEl.firstChild && lines > 0) {
				if (rootEl.firstChild.nodeName != "#text") {
					lines--;
				}
				deleteNodeTextOrBR(rootEl.firstChild, idKey);
			}
		}
		*/
		util.logDebugOptional('functions','SmartTemplate4.delReplyHeader() ENDS');
	};

	// helper function to find a child node of the passed class Name
	function findChildNode(node, className) {
		while (node) {
			if (node && node.className == className)
				return node;
			let n = findChildNode(node.firstChild, className);
			if (n)
				return n;
			node = node.nextSibling;
		}
		return null;
	};
	
	// if can't find in child node, search direct parent
	function findChildNodeOrParent(node, className) {
		let f = findChildNode(node, className);
		return f ? f : findChildNode(node.parentNode, className);
	};

	function testSmartTemplateToken(template, token) {
		if(!template)
			return false;
		let match = template.toLowerCase().match('%' + token.toLowerCase() + '%'); 
		return (!match ? false : true);
	};
	
	function testCursorVar(template) {
		return testSmartTemplateToken(template, 'cursor');
	};
	
	function testSignatureVar(template) {
		let reg = /%(sig)(\([^)]+\))*%/gm,
		    match = template.toLowerCase().match(reg);
    util.logDebugOptional('functions','testSignatureVar() match = ' + match);
		if (!match)
			return '';
		switch (match[0]) {
		  case "%sig%":
				return 'auto';
		  case "%sig(2)%":
				return 'auto';
			case "%sig(html)%":
				return 'html';
			case "%sig(text)%":
				return 'text';
		  case "%sig(none)%":
				return 'omit';
			default:	  // invalid %sig% variable!
				util.logToConsole("Invalid %sig% variable: " + match[0])
				return '';
		}
	};

	// -----------------------------------
	// Delete quote header(forward)
	//In compose with HTML, body is
	//	<BR><BR> <#text#(1041)> <TABLE(headers)> <#text# nodeValue=""> !<BR><BR>! <PRE> original-message
	//In compose with TEXT, body is
	//	<BR><BR> <#text#(1041)><BR> <#text# (headers)>!<BR><BR>! original-message
	//We need to remove tags until two BR tags appear consecutively.
	// AG: To assume that the 2 <br> stay like that is foolish... it change in Tb12 / Tb13
	function delForwardHeader(idKey, onlyHeader)	{
		function truncateTo2BR(root) {
			util.logDebugOptional('deleteNodes','truncateTo2BR()');
			let node = root.firstChild;
			// old method continues until it finds <br><br> after header table
			let brcnt = 0;
			while (root.firstChild && brcnt < 2) {
				if (root.firstChild.nodeName == "BR") {
					brcnt++;
				}
				else {
					// only older versions of Tb have 2 consecutive <BR>?? Tb13 has <br> <header> <br>
					//if (util.versionSmaller(util.AppverFull, "10"))
					brcnt = 0;
				}
				deleteHeaderNode(root.firstChild);
			}
			// delete any trailing BRs
			while (root.firstChild && root.firstChild.nodeName == "BR") {
				deleteHeaderNode(root.firstChild);
			}
		}

		util.logDebugOptional('functions','SmartTemplate4.delForwardHeader()');

    let origMsgDelimiter = '',
        Id,
		    bndl = Cc["@mozilla.org/intl/stringbundle;1"]
							 .getService(Ci.nsIStringBundleService)
							 .createBundle("chrome://messenger/locale/mime.properties");
    try {           
      origMsgDelimiter = bndl.GetStringFromID(1041);
    }
    catch(ex) {
    }
		// [Bug 25089] default forward quote can't be completely hidden
		if ((util.Application === "Thunderbird" || util.Application === "SeaMonkey")
		    && util.versionGreaterOrEqual(util.PlatformVer, "14"))
		{
      try {
        // from Tb 31.0 we have a dedicated string for _forwarded_ messages!
        let fwdId = 'mailnews.forward_header_originalmessage', // from Tb 31.0 onwards?
            replyId = 'mailnews.reply_header_originalmessage', //  [Bug 25089] Default forward quote not hidden
            service = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
        
        Id = fwdId;
        origMsgDelimiter = service.getComplexValue(Id, Ci.nsIPrefLocalizedString).data;
        // fallback to replyId if it doesn't exist.
        if (!origMsgDelimiter) {
          Id = replyId
          origMsgDelimiter = service.getComplexValue(Id, Ci.nsIPrefLocalizedString).data;
        }
      }
      catch(ex) {
        if (!origMsgDelimiter) {
          util.logException("Could not retrieve delimiter {" + Id + "}; attempt original method.", ex)
          origMsgDelimiter = bndl.GetStringFromID(1041);
        }
      }
		}
		util.logDebugOptional('functions.delForwardHeader','Retrieved Delimiter Token from mime properties: ' + origMsgDelimiter);

		// Delete original headers
		let rootEl = gMsgCompose.editor.rootElement,
		    node = rootEl.firstChild,
		    firstNode = null,
				skipInPlainText = !gMsgCompose.composeHTML,
        preserve = prefs.getMyBoolPref('plainText.preserveTextNodes');
		util.logDebugOptional('functions.delForwardHeader','Running Loop to remove unnecessary whitespace..');

		while (node) {
			let n = node.nextSibling;

			if (node.nodeValue && node.nodeValue == origMsgDelimiter) {
				deleteNodeTextOrBR(node, idKey, skipInPlainText && preserve); // HTML + plain text - stop after removing "--- original message ---"
				break;
			}

			// Analyse the forwarded part. if  it is plain text, let's search for the delimiter in any case (higher risk)!
			// [Bug 25097] do not restrict this to html mode only
			if (node.className == 'moz-forward-container') {
				// lets find the ---original message--- now
				let searchWhiteSpace = true,
				    truncWhiteSpace = false,
				    inner = node.firstChild;
				while (inner) {
					let m = inner.nextSibling;
					if (inner.nodeValue == origMsgDelimiter || truncWhiteSpace) {
						// delete all whitespace before delim
						if (searchWhiteSpace) {
							searchWhiteSpace = false;
							m = inner = node.firstChild;	//restart ...
							truncWhiteSpace = true; 		  // ...and delete EVERYTHING until delimiter
							firstNode = inner;
							continue;
						}
						util.logDebugOptional('functions.delForwardHeader','deleting node: ' + inner.nodeValue);
						gMsgCompose.editor.deleteNode(inner); // we are not pushing this on to orgQuoteHeaders as there is no value to this.
						if (inner.nodeValue == origMsgDelimiter)
							break;
					}
					inner = m;
				}
				node = n;
				continue;
			}
			
      if (!onlyHeader)
				deleteNodeTextOrBR(node, idKey);
			node = n;
		}

			// remove the original Mail Header
		util.logDebugOptional('functions.delForwardHeader','Remove the original header...');
		if (util.versionGreaterOrEqual(util.PlatformVer, "12")) {
			// recursive search from root element
			node = findChildNode(rootEl, 'moz-email-headers-table');
			if (node) {
				util.logDebugOptional('functions.delForwardHeader','found moz-email-headers-table; deleting');
				let nextNode = node.nextSibling;
				deleteHeaderNode(node);
				// delete trailing newlines!
				deleteWhiteSpaceNodes(nextNode);
			}
			else {
				util.logDebugOptional('functions.delForwardHeader','Could not find moz-email-headers-table!');
				if (!gMsgCompose.composeHTML) {
					truncateTo2BR(rootEl.firstChild);
				}
			}
		}
		else {
			truncateTo2BR(rootEl);
		}
		util.logDebugOptional('functions','SmartTemplate4.delForwardHeader() ENDS');
	}

	// -----------------------------------
	// Remove template messages and Restore original quote headers
	function removePreviousTemplate()	{
		try {
			util.logDebugOptional('functions','SmartTemplate4.removePreviousTemplate()');
			let curEl = gMsgCompose.editor.rootElement.firstChild,
			    nextEl = gMsgCompose.editor.rootElement.firstChild;
			if (nextEl && nextEl.nodeName == "PRE") {
				nextEl = nextEl.firstChild;
			}
			while ((curEl = nextEl)) {
				// one problem: if signature is not contained in this div, it will not be removed.
				nextEl = curEl.nextSibling;
				if (curEl.id == "smartTemplate4-template") {
					if (nextEl && nextEl.tagName == "BR") {
						let l = nextEl.nextSibling;
						gMsgCompose.editor.deleteNode(nextEl);
						nextEl = l;
					}
					gMsgCompose.editor.deleteNode(curEl);
				}
				// delete our last quoteHeader
				if (curEl.id == "smartTemplate4-quoteHeader") {
					gMsgCompose.editor.deleteNode(curEl);
				}
			}
			// Restore original quote headers
			while (orgQuoteHeaders.length > 0) {
				gMsgCompose.editor.insertNode(orgQuoteHeaders.pop(), gMsgCompose.editor.rootElement, 0);
			}
		}
		catch(ex) {
			util.logException("removePreviousTemplate - exception trying to remove previous template:", ex);
		}
	};

	function clearTemplate()	{
		util.logDebugOptional('functions','SmartTemplate4.clearTemplate()');
		orgQuoteHeaders.length = 0;
		SmartTemplate4.Sig.reset();
	};

	// -----------------------------------
	// Get processed template
	function getProcessedText(templateText, idKey, composeType, ignoreHTML, isStationery) 	{
		if (!templateText) return "";

		if (typeof isStationery === 'undefined') isStationery = SmartTemplate4.PreprocessingFlags.isStationery;
		util.logDebugOptional('functions.getProcessedText', 'START =============  getProcessedText()   ==========');
		util.logDebugOptional('functions.getProcessedText', 'Process Text:\n' +
		                                     templateText + '[END]');
		var pref = SmartTemplate4.pref;
		
		SmartTemplate4.calendar.init(); // set for default locale
		let regular = SmartTemplate4.regularize(templateText, composeType, isStationery, ignoreHTML, !composeType || pref.isUseHtml(idKey, composeType, false));
		
		// now that all replacements were done, lets run our global routines to replace / delete text, (such as J.B. "via Paypal")
		regular = SmartTemplate4.parseModifier(regular); // run global replacement functions (deleteText, replaceText)
		
		// [Bug 26364] Inline Images are not shown.
		// fix DataURLs from other template (Stationery)
		// This won't work if there is no "file:\\\" portion given (relative path / current folder not supported)
		// we can fix the Data urls for file:/// images now
		// assume they are enclosed in single quote, double quote or terminated by &gt;
		regular = regular.replace(/file:\/\/\/[^\"\'\>]*/g, 
		  function(match) {
				util.logDebugOptional('composer', 'Replacing image file as data: ' + match);
				return util.getFileAsDataURI(match);
			}
		);

		
    util.logDebugOptional('functions.getProcessedText','regular:\n' + regular);		
		util.logDebugOptional('functions.getProcessedText','=============  getProcessedText()   ========== END');
		return regular;
	};
	
	// new function to retrieve quote header separately [Bug 25099]
	// in order to fix bottom-reply
	function getQuoteHeader(composeType, idKey) {
		let hdr = SmartTemplate4.pref.getQuoteHeader(idKey, composeType, "");
		let ignoreHTML = false; // was false always
		return getProcessedText(hdr, idKey, composeType, ignoreHTML);
	};
	
	// -----------------------------------
	// Get template message - wrapper for main template field
	function getSmartTemplate(composeType, idKey) {
		util.logDebugOptional('functions','getSmartTemplate(' + composeType + ', ' + idKey +')');
		let msg = SmartTemplate4.pref.getTemplate(idKey, composeType, "");
		let ignoreHTML = false; // was false always - do we need gMsgCompose.composeHTML ?
		return getProcessedText(msg, idKey, composeType, ignoreHTML);
	};
	
	function findDirectChildById(parent, id) {
		let node = parent.firstChild;
		while (node) {
			if (node && node.id == id)
				return node;
			node = node.nextSibling;
		}
		return null;
	};

	function findDirectChildByClass(parent, className) {
		let node = parent.firstChild;
		while (node) {
			if (node && node.className == className)
				return node;
			node = node.nextSibling;
		}
		return null;
	};
						
	// -----------------------------------
	// Add template message
	function insertTemplate(startup, flags, retryCount)	{
		let isDebugComposer = prefs.isDebugOption('composer');
		if (!flags) {
		  // if not passed, create an empty "flags" object, and initialise it.
		  flags = {};
			flags.isStationery = false;
			flags.identitySwitched = true;  // new flag
			SmartTemplate4.initFlags(flags);
		}
		util.logDebugOptional('functions,functions.insertTemplate',
		  'insertTemplate(startup: ' + startup + ', flags: ' + (flags ? flags.toString() : '(none)') + ')\n' 
			+ 'gMsgCompose.type = ' + gMsgCompose.type);
		const msgComposeType = Ci.nsIMsgCompType,
					ed = util.CurrentEditor,
		      editor = ed.QueryInterface(Ci.nsIEditor);
		let pref = SmartTemplate4.pref,
		    // gMsgCompose.editor; => did not have an insertHTML method!! [Bug ... Tb 3.1.10]
		    doc = gMsgCompose.editor.document,
		    template = null,
		    quoteHeader = "",
        idKey = util.getIdentityKey(document);
        
    util.logDebugOptional("identities", "Retrieved msgIdentity key value: " + idKey);
    if (!idKey) {
      util.logDebugOptional("identities", "no key, getting from gMsgCompose.identity...");
      idKey = gMsgCompose.identity.key;
    }
		let isActiveOnAccount = false,
		    acctMgr = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager),  
        identitySource,
		    theIdentity = acctMgr.getIdentity(idKey);
    
		if (!theIdentity) {
			theIdentity = gMsgCompose.identity;
      identitySource = "gMsgCompose.identity";
    }
    else {
      identitySource = "msgIdentity.Identity";
    }
    util.logDebugOptional("identities", 
                          "Retrieved identity from " + identitySource+ "\n" +
                          "key = " + (theIdentity ? theIdentity.key : "NO IDENTITY!") + "\n" +
                          "identityName = " + (theIdentity ? theIdentity.identityName : "NO IDENTITY!"));
		// Switch account
		if (startup) {
			// Clear template
			clearTemplate();
		}
		else {
			if (gMsgCompose.type != msgComposeType.Template) {
				// Check identity changed or not
				if (gCurrentIdentity && gCurrentIdentity.key == idKey) {
					return;
				}
				// Undo template messages (does _not_ remove signature!)
				removePreviousTemplate();
			}
		}

		// is the %sig% variable used?
		let sigVarDefined = false,
        sigType = null,
		    composeCase = 'undefined',
		    st4composeType = '',
		    rawTemplate = '';
	  if (isDebugComposer) debugger;
		// start parser...
		try {
			switch (gMsgCompose.type) {
				case msgComposeType.Template: // new type for 1.6 - Thunderbird 52 uses this in "Edit As New" case
					composeCase = 'tbtemplate'; // flags.isThunderbirdTemplate
					st4composeType = "new"; // was "new" but there should be no processing in templates
					break;
				// new message -----------------------------------------
				//	(New:0 / NewsPost:5 / MailToUrl:11)
				case msgComposeType.New:
				case msgComposeType.NewsPost:
				case msgComposeType.MailToUrl:
					composeCase = 'new';
					st4composeType = 'new';
					break;

				// reply message ---------------------------------------
				// (Reply:1 / ReplyAll:2 / ReplyToSender:6 / ReplyToGroup:7 /
				// ReplyToSenderAndGroup:8 / ReplyToList:13)
				case msgComposeType.Reply:
				case msgComposeType.ReplyAll:
				case msgComposeType.ReplyToSender:
				case msgComposeType.ReplyToGroup:
				case msgComposeType.ReplyToSenderAndGroup:
				case msgComposeType.ReplyToList:
					composeCase = 'reply';
					st4composeType = 'rsp';
					break;

				// forwarding message ----------------------------------
				// (ForwardAsAttachment:3 / ForwardInline:4)
				case msgComposeType.ForwardAsAttachment:
				case msgComposeType.ForwardInline:
					composeCase = 'forward';
					st4composeType = 'fwd';
					break;

				// do not process -----------------------------------
				// (Draft:9/ReplyWithTemplate:12)
				case msgComposeType.Draft:
					composeCase = 'draft';
					let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
					    msgDbHdr = gMsgCompose.originalMsgURI ? messenger.msgHdrFromURI(gMsgCompose.originalMsgURI).QueryInterface(Ci.nsIMsgDBHdr) : null;
					if(msgDbHdr) {
						const nsMsgKey_None = 0xffffffff;
						if (msgDbHdr.threadParent && (msgDbHdr.threadParent != nsMsgKey_None)) {
							st4composeType = 'rsp'; // just guessing, of course it could be fwd as well
						}
						if (msgDbHdr.numReferences == 0)
							st4composeType = 'new';
					}
					break;
				case msgComposeType.EditAsNew: // Tb 60+
				  // no processing should be done
					util.logDebug("Edit As New - exit insertTemplate() without processing")
					return;
				case msgComposeType.EditTemplate: // Tb 60+
				  // no processing should be done
					util.logDebug("Edit Template - exit insertTemplate() without processing")
					return;
				default:
					st4composeType = "";
					break;
			}
			
			
			isActiveOnAccount = pref.isProcessingActive(idKey, st4composeType, false);
			// draft + startup: do not process!
			if (startup && composeCase=='draft')
				isActiveOnAccount = false;

			if (isActiveOnAccount) {
				// Message File loaded:
				/*
				if (gMsgCompose.originalMsgURI.includes(".eml")) {
					if (typeof messageHeaderSink == 'undefined') {
						retryCount = !retryCount ? 1 : retryCount + 1;
						util.logDebug("Waiting for messageHeaderSink...(" + retryCount + ")");
						if (retryCount<15)
							setTimeout(function() { insertTemplate(startup, flags, retryCount); }, 400);
						else
							debugger;
						return;
					}
				}
				*/
				if (prefs.isDebugOption('functions.insertTemplate')) debugger;
				
				if (flags.isThunderbirdTemplate) 
					rawTemplate = editor.rootElement.innerHTML; // treat email as raw template
				else
					rawTemplate = flags.isThunderbirdTemplate ? "" : pref.getTemplate(idKey, st4composeType, "");
				
				if (!flags.isStationery) {
					// if %sig% is in Stationery, it is already taken care of in Stationery's handler!!
					sigType = testSignatureVar(rawTemplate); // 'omit' for supressing sig from smart template
				}
				else
					sigType = flags.sigType; // initialised in notifyComposeBodyReady if tested in stationery
				
				// if Stationery has %sig(none)% then flags.omitSignature == true
				sigVarDefined = (flags.hasSignature || sigType) ? true : false; 
				// get signature and remove the one Tb has inserted
				SmartTemplate4.signature = extractSignature(theIdentity, sigType, st4composeType);
				
				if (flags.isThunderbirdTemplate) {
					// use innerHTML instead of outer (we do not want to replace the "body" part)
					// if %sig% variable is in Tb Template it is going to be expanded at this step.
					template = getProcessedText(editor.rootElement.innerHTML, idKey, st4composeType, true); // ignoreHTML = true ?
					// need to empty out the innerHTML if we insert this to avoid duplication.
					editor.rootElement.innerHTML="";
				}
				
				
        util.logDebugOptional('functions.insertTemplate','retrieving Template: getSmartTemplate(' + st4composeType + ', ' + idKey + ')');
				// main processing - note: this calls getProcessedText()
				// for thunderbird template case, we should get the body contents AND PROCESS THEM?
				
				if (!flags.isThunderbirdTemplate) {
					util.logDebugOptional('functions.insertTemplate','retrieving quote Header: getQuoteHeader(' + st4composeType + ', ' + idKey + ')');
					template = getSmartTemplate(st4composeType, idKey);
					quoteHeader = getQuoteHeader(st4composeType, idKey);
				}
				let isQuoteHeader = quoteHeader ? true : false;
				switch(composeCase) {
					case 'new':
					case 'tbtemplate':
						break;
					case 'draft':
					  // when do we remove old headers?
						break;
					case 'reply':
						if (pref.getCom("mail.identity." + idKey + ".auto_quote", true)) {
							// stationery has a placeholder for the original quote text.
							if (
									(pref.isDeleteHeaders(idKey, st4composeType, false) || flags.isStationery)
									&&
									(!flags.isStationery || flags.hasQuotePlaceholder ||
									 flags.isStationery && prefs.getMyBoolPref('stationery.forceReplaceQuoteHeader')) 
								)
							{
								// when in stationery we only delete the quote header and not all preceding quotes!
								delReplyHeader(idKey, flags.isStationery);
							}
							else
								delReplyHeader(idKey, false, true); // remove just spaces [Bug 26523]
						}
						break;
					case 'forward':
						if (gMsgCompose.type == msgComposeType.ForwardAsAttachment)
							break;
						if (  (pref.isDeleteHeaders(idKey, st4composeType, false) || flags.isStationery)
								  &&
									(!flags.isStationery || flags.hasQuotePlaceholder || 
									  flags.isStationery && prefs.getMyBoolPref('stationery.forceReplaceQuoteHeader'))
								)
						{
							delForwardHeader(idKey, flags.isStationery);
						}
						break;
				}
				
				if (isQuoteHeader) {
					let qdiv = function() { // closure to avoid unnecessary processing
						let qd = util.mailDocument.createElement("div");
						qd.id = "smartTemplate4-quoteHeader";
						qd.innerHTML = quoteHeader;
						return qd;
					}
					// new behavior: always replace the standard quote header [forceReplaceQuoteHeader]
					if (!flags.isStationery
					   ||
						 !flags.hasQuoteHeader && prefs.getMyBoolPref('stationery.forceReplaceQuoteHeader')) {
						let firstQuote = 
						  (st4composeType=='fwd') ?
							editor.rootElement.firstChild :
						  editor.rootElement.getElementsByTagName('BLOCKQUOTE')[0];
						// [Bug 26261] Quote header not inserted in plain text mode
						if (!firstQuote) firstQuote = editor.rootElement.firstChild;
						if (firstQuote) {
							let quoteHd = firstQuote.parentNode.insertBefore(qdiv(), firstQuote),
							    prev = quoteHd.previousSibling;
							// force deleting the original quote header:
							if (prev && prev.className && prev.className.indexOf('moz-cite-prefix')>=0) {
								prev.parentNode.removeChild(prev); 
							}
						}
					}
					else if (flags.hasQuoteHeader) { // find insertion point injected by %quoteHeader%
						let qnode = findChildNode(editor.rootElement, 'quoteHeader-placeholder'); // quoteHeader
						if (qnode) {
							if (composeCase!='new') {
							  let quoteHd = qdiv();
								qnode.parentNode.insertBefore(quoteHd, qnode);
								if (quoteHeader) // guard against empty setting: we do not remove header if there is nothing defined in st4.
									gMsgCompose.editor.deleteNode(qnode);
								// only if followed by a blockquote, delete every element between quoteHeader and blockquote element
								let nn = quoteHd.nextSibling,
								    isFollowedByQuote = false;
								while (nn) {
									if (nn.nodeName.toLowerCase() == 'blockquote') {
										isFollowedByQuote = true;
										break;
									}
									nn = nn.nextSibling;
								}
								if (isFollowedByQuote)
									while (quoteHd.nextSibling && quoteHd.nextSibling.nodeName.toLowerCase() != 'blockquote') {
										gMsgCompose.editor.deleteNode(quoteHd.nextSibling);
									}
							}
						}
					}
				}
				else { // delete all <br> before quote!
					
				}
			}
			else {
				util.logDebugOptional('functions.insertTemplate','insertTemplate - processing is not active for id ' + idKey);
				// remove old signature!
				// we shouldn't do this if it is not active on account unless we inserted it just beforehand?
				// extractSignature(theIdentity, false, st4composeType);
			}

		}
		catch(ex) {
			util.logException("insertTemplate - exception during parsing. Continuing with inserting template!", ex);
		}
		
		let targetNode = 0,
		    templateDiv,
		    // new global settings to deal with [Bug 25084]
		    breaksAtTop = flags.isStationery ? 0 : prefs.getMyIntPref("breaksAtTop"), // no breaks if Stationery is used!
		    bodyEl = gMsgCompose.editor.rootElement,
				bodyContent = '';
		
		// [Bug 26260] only remove body for mailto case if active on account
		if (isActiveOnAccount && gMsgCompose.type == msgComposeType.MailToUrl) {
			// back up the mailto body
			bodyContent = bodyEl.innerHTML;
			bodyEl.innerHTML = '';
			if (bodyContent) {
				util.logDebugOptional('composer','msgComposeType.MailToUrl - clearing template and setting to:\n' + bodyContent);
				template = bodyContent; // clear template
				SmartTemplate4.sigInTemplate = false;
			}
		}

		// add template message --------------------------------
		// if template text is empty: still insert targetNode as we need it for the cursor!
		// however we must honor the setting "breaks at top" as we now remove any <br> added by Tb
		if (isActiveOnAccount)	{
			util.logDebugOptional('composer','isActiveOnAccount: creating template Div...');
			templateDiv = util.mailDocument.createElement("div");
			// now insert quote Header separately
			try {
				if (flags.isThunderbirdTemplate && template.length) {
					// remove original st4 div
					let oldSt4Div = editor.document.getElementById("smartTemplate4-template");
					if (oldSt4Div) {
					  oldSt4Div.parentNode.removeChild(oldSt4Div);
					}
				}
				templateDiv.id = "smartTemplate4-template";
				/* TEST
				if (prefs.getMyBoolPref('debug.composer')) {
					// color the template part for debugging.
					templateDiv.style.backgroundColor = "#FFF4CC";
					templateDiv.style.border = "1px solid #FFE070";
				} */
				// ****************************
				// ***  STATIONERY SUPPORT  ***
				// ****************************
				// we only add the template if Stationery is not selected, otherwise, we leave our div empty! 
				if (!flags.isStationery) {
					util.logDebugOptional('composer','isStationery=false: setting template Div innerHTML...\n' + template);
					templateDiv.innerHTML = template;
				}
				else {
					util.logDebugOptional('composer','isStationery=true: processing left to Stationery');
					// to do:	template processing in body provided by Stationery!
				  // ** => replace stationeryBodyText 
					// **    with getProcessedText(stationeryBodyText, idKey, st4composeType) 
				}
				if (theIdentity.replyOnTop) {
					// this is where we lose the default "paragraph" style
					editor.beginningOfDocument();
					for (let i = 0; i < breaksAtTop; i++)  {
						gMsgCompose.editor.insertNode(
						                   util.mailDocument.createElement("br"),
						                   gMsgCompose.editor.rootElement, 0);
					}
					// the first Child should be BLOCKQUOTE (header is inserted afterwards)
					util.logDebugOptional('composer','Reply on Top - inserting template before first root child');
					targetNode = editor.rootElement.insertBefore(templateDiv, editor.rootElement.firstChild); 
				}
				else {
					for (let i = 0; i < breaksAtTop; i++) {
						gMsgCompose.editor.rootElement.appendChild(util.mailDocument.createElement("br"));
					}
					util.logDebugOptional('composer','Reply at Botton - appending template to first root child');
					targetNode = editor.rootElement.appendChild(templateDiv); // after BLOCKQUOTE (hopefully)
					editor.endOfDocument();
				}
			}
			catch (ex) {
				let errorText = 'Could not insert Template as HTML; please check for syntax errors.'
				      + '\n' + 'this might be caused by html comments <!-- or unclosed tag brackets <...>'
				      + '\n' + ex
				      + '\n' + 'Copy template contents to clipboard?';
							
				SmartTemplate4.Message.display(errorText,
				              "centerscreen,titlebar",
											{ ok: function() {
				              	let oClipBoard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
				              	oClipBoard.copyString(template); },
												cancel: function() { ;/* cancel NOP */ }
											}
				              , gMsgCompose.editor.document.defaultView
				);
			}
		}
		
		util.logDebugOptional('composer','finding cursor node...');
		// before we handle the sig, lets search for the cursor one time
		// moved code for moving selection to top / bottom
		let caretContainer = findChildNodeOrParent(targetNode, 'st4cursor'),
		    isCursor = (caretContainer != null);
		util.logDebugOptional('functions.insertTemplate', ' search %cursor% in template: ' + isCursor);
		
		// insert the signature that was removed in extractSignature() if the user did not have %sig% in their template
		let theSignature = SmartTemplate4.signature;
		
		SmartTemplate4.Sig.init(theIdentity);
		let isSignatureSetup = SmartTemplate4.Sig.isSignatureSetup,		
		    serverInfo = util.getServerInfo(idKey), // find out server name and type (IMAP / POP3 etc.)
		    common = SmartTemplate4.pref.isCommon(idKey) ? ' (uses Common)' : ''; // our "compact log" to assist our users more effective
		util.logDebugOptional('functions.insertTemplate',
		         'identityName:   ' + theIdentity.identityName + '\n'
		       + 'key:            ' + theIdentity.key + common + '\n'
		       + serverInfo
		       + '------------------------------------------------\n'
		       + 'sigOnReply:     ' + theIdentity.sigOnReply + '\n'
		       + 'sigOnForward:   ' + theIdentity.sigOnForward + '\n'
		       + 'sigBottom:      ' + theIdentity.sigBottom + '\n'       // sig at the end of the quoted text when replying above
		       + 'attachSignature:' + theIdentity.attachSignature + '\n'
		       + 'htmlSigFormat:  ' + SmartTemplate4.Sig.htmlSigFormat + '\n'   // Does htmlSigText contain HTML?
		       + 'composeHtml:    ' + theIdentity.composeHtml + '\n'
		       + 'replyOnTop:     ' + theIdentity.replyOnTop + '\n'      // quoting preference
		       + 'SmartTemplate4.isSignatureSetup:' + isSignatureSetup + '\n'
		       + 'SmartTemplate4.sigInTemplate: ' + SmartTemplate4.sigInTemplate + '\n'
		       + '%sig% type: [' + sigType + ']\n'
		       + 'compose case, is active? : ' + composeCase + ', ' + isActiveOnAccount + '\n'
		       + '------------------------------------------------\n'
		       + 'SmartTemplate4: ' + util.Version + '\n'
		       + 'Application: ' + util.Application + ' v' + util.AppverFull + '\n'
		       + 'HostSystem: ' + util.HostSystem + '\n'
		       + 'Stationery used: ' + flags.isStationery + '\n'
		       );

		/* SIGNATURE HANDLING */
		if (isActiveOnAccount) {  // && !sigVarDefined
		
      isSignatureSetup = isSignatureSetup && (sigType != 'omit') && !flags.omitSignature; // we say there is no signature if %sig(none)% is defined in [Stationery] Template
      util.logDebugOptional ('signatures','isSignatureSetup:' + isSignatureSetup + '\n'
         + 'sigType: ' + sigType + '\n'
         + 'flags.omitSignature: ' + flags.omitSignature +'\n'
         + 'sigVarDefined: ' + sigVarDefined);
		  if (composeCase == 'reply' && (theIdentity.sigOnReply || sigVarDefined) && isSignatureSetup
			    ||
			    composeCase == 'forward' && (theIdentity.sigOnForward || sigVarDefined) && isSignatureSetup
			    ||
			    composeCase == 'new' && theSignature && isSignatureSetup
					||
					composeCase == 'tbtemplate' && theSignature && isSignatureSetup)
			{
				try {
					if (!SmartTemplate4.sigInTemplate && theSignature) {
						util.logDebugOptional('functions.insertTemplate', ' Add Signature... ' );
		
						let pref = SmartTemplate4.pref;
						// add Signature and replace the BR that was removed in extractSignature
						
						// wrap text only signature to fix [Bug 25093]!
						if (typeof theSignature === "string")  {
							let sn = doc.createElement("div");
							sn.innerHTML = theSignature;
							theSignature = sn;
						}
						
						if (sigVarDefined 
						    && gMsgCompose.type != msgComposeType.MailToUrl) { 
						  // find and replace <sig>%sig%</sig> in body.
							let sigNode;
							if(flags.isStationery) { 
							  sigNode = findChildNode(bodyEl, 'st4-signature'); // find <sig>
							}
							else if(composeCase == 'tbtemplate') {
								// find %sig(..)% text?
								
							}
							if (sigNode) {
								let isRemoveDashes = sigNode.getAttribute('removeDashes');
								theSignature.innerHTML = util.getSignatureInner(theSignature, isRemoveDashes); // remove dashes hard coded for now
								sigNode.parentNode.insertBefore(theSignature, sigNode);
								sigNode.parentNode.removeChild(sigNode);
							}
						}
						else { // append signature using usual methods
							// if we reply on bottom we MUST ignore sigBottom (signature will not go on top template!)
							if (!theIdentity.replyOnTop || theIdentity.sigBottom) {
								// only need this in reply case (might not need it at all with breaksAtTop
								if (composeCase == 'reply' && breaksAtTop == 0)
									bodyEl.appendChild(doc.createElement("br"));
								bodyEl.appendChild(theSignature);
							}
							else {
								// reply above, before div smartTemplate4-template
								// findChildnode non recursive						
								templateDiv = findDirectChildById(bodyEl, 'smartTemplate4-template'); // find direct child of html element (avoid parsing quoted mail)
								// if we don't find this, lets take the first child div
								if (!templateDiv) {
									templateDiv = bodyEl.firstChild.nextSibling;
								}
								// insert signature after template
								if (templateDiv.nextSibling) {
									templateDiv.parentNode.insertBefore(theSignature, templateDiv.nextSibling);
									templateDiv.parentNode.insertBefore(doc.createElement("br"), templateDiv.nextSibling);
								}
								else {
									// templateDiv.parentNode.appendChild(templateDiv);
									templateDiv.parentNode.appendChild(doc.createElement("br"));
									templateDiv.parentNode.appendChild(theSignature);
								}
							}
						}
					}
			  }
			  catch(ex) {
					util.logException("handling signature failed", ex);
				}
			}
			// active, but empty signature?
			else {
				if(flags.omitSignature
           ||
           flags.isStationery 
				   && 
					 (theSignature.innerHTML == '' || theSignature.innerHTML ==  SmartTemplate4.signatureDelimiter )) { // in %sig(2)% case, the delimiter is built in.
					let sigNode = findChildNode(bodyEl, 'st4-signature'); // find <sig>
					if (sigNode) {
						if (isDebugComposer) debugger;
            util.logDebugOptional ('signatures','found signature node, removing...');
						sigNode.parentNode.removeChild(sigNode);
					}
				}
			}
			
			// PREMIUM FUNCTIONS
			// issue notifications for any premium features used.
			// all used functions are stored in the main instance of SmartTemplate4 (3pane window)
			if (util.mainInstance.Util.premiumFeatures.length 
			    && (!util.hasLicense(false)
					   || 
						 prefs.isDebugOption('premium.testNotification'))) {
				util.popupLicenseNotification(util.mainInstance.Util.premiumFeatures, true, true);
			}  
			// reset the list of used premium functions for next turn
			util.clearUsedPremiumFunctions();  // will affect main instance
		}
		
		// if %cursor% is not set explicitly
		if (!isCursor) {
			let cursor = doc.createElement("span");
			cursor.className = "st4cursor";
			// if we have a template we simply insert it at the bottom of the template
			if (templateDiv) {
				templateDiv.appendChild(cursor);
			}
			else if (!theIdentity.replyOnTop) {
				// reply on bottom, insert cursor straight after the quote (before the signature)
				bodyEl.appendChild(cursor);
			}
		}
		
		// moved code for moving selection to top / bottom
		// re-find cursor
		if (!caretContainer)
		  caretContainer = findChildNode(targetNode, 'st4cursor');
		isCursor = (caretContainer != null);
		try {
			if (targetNode) { // usually <body>
				let selCtrl = editor.selectionController,  // Ci.nsISelectionController
            isReplyOnTop = theIdentity.replyOnTop,
            forward = !isReplyOnTop;
        try {
          selCtrl.completeMove(forward, false); // forward, extend
        }
        catch(ex) {
          util.logException("editor.selectionController completeMove(forward = " + forward + ") failed", ex);
        }
        try {
          selCtrl.completeScroll(forward);
        }
        catch(ex) {
          util.logException("editor.selectionController completeScroll(forward = " + forward + ") failed", ex);
        }
				
				let theParent = targetNode.parentNode;
				if (theParent) {
					let nodeOffset = Array.prototype.indexOf(theParent.childNodes, targetNode);
					// collapse selection and move cursor - problem: stationery sets cursor to the top!
					if (isCursor) {
						// look for a child div with lass = 'st4cursor'
						if (!caretContainer)
							caretContainer = editor.rootElement.childNodes[0].ownerDocument.getElementById('_AthCaret'); // from (old) stationery
							
						if (isDebugComposer) debugger;
						if (caretContainer && caretContainer.outerHTML) {
							try {
								//if (util.Application=='Postbox') util.debugVar(caretContainer);
								
								let scrollFlags = selCtrl.SCROLL_FIRST_ANCESTOR_ONLY | selCtrl.SCROLL_OVERFLOW_HIDDEN,
										cursorParent = caretContainer.parentNode; // usually a <p>
                // =========== FORCE CURSOR IN <PARA> ==================================== [[[[
								if (prefs.getMyBoolPref('forceParagraph') && cursorParent.tagName=='DIV' || cursorParent.tagName=='BODY') {
									try {
										if (util.Application=='Postbox') util.logDebug("cursorParent:\n" + cursorParent);
										// refind the caret Container.
										// wrap internals in <p>
										let parentSrchHTML = cursorParent.innerHTML.toLowerCase(),
												caretStartPos = cursorParent.innerHTML.indexOf(caretContainer.outerHTML),
												caretEndPos = caretStartPos + caretContainer.outerHTML.length,
												para = doc.createElement('P'),
												nextBlock = parentSrchHTML.indexOf('<p', caretEndPos), // offset at the end of caret
												previousBlock = parentSrchHTML.lastIndexOf('</p', caretStartPos) + 1 || parentSrchHTML.lastIndexOf('<br',caretStartPos) + 1 || parentSrchHTML.lastIndexOf('</div',caretStartPos) + 1; // where the previous Block ends
										if (!previousBlock) 
											previousBlock = caretStartPos;
										else {
											previousBlock = parentSrchHTML.indexOf('>', previousBlock)+1 || caretStartPos; // find end of closing tag
											if (previousBlock < 0) previousBlock = 0;
										}
										
										if (nextBlock<0) {
											// find next block level element or line break
											nextBlock = parentSrchHTML.indexOf('<br', caretEndPos);
											if (nextBlock<0)
												nextBlock = parentSrchHTML.indexOf('<div', caretEndPos);
											if (nextBlock<0)
												nextBlock = cursorParent.innerHTML.length-1;
										}
										if (nextBlock<caretEndPos)
											nextBlock = caretEndPos; // if no suitable element follows, we are cutting the paragraph short here
										
										// If THunderbird has inserted the empty <p><br><p> here let's cut that out:
										let startNextBlock =
											(parentSrchHTML.substr(nextBlock).indexOf("<p><br></p>") == 0) ? nextBlock+11 : nextBlock;
										
										if (isDebugComposer) debugger;
										let leftHTML = cursorParent.innerHTML.substring(0, previousBlock),
												rightHTML = cursorParent.innerHTML.substring(startNextBlock),
												midHTML = cursorParent.innerHTML.substring(previousBlock, nextBlock);
										para.innerHTML = midHTML; // caretContainer.outerHTML +"<br>" visibility hack for the resulting empty <p>
										
										cursorParent.innerHTML = leftHTML + para.outerHTML + rightHTML;
										caretContainer = findChildNode(theParent, 'st4cursor');
										if (!caretContainer)
											caretContainer = editor.rootElement.childNodes[0].ownerDocument.getElementById('_AthCaret');
										
										theParent = caretContainer.parentNode;
									}
									catch (ex) {
										util.logException("editor.selectionController command failed - editor = " + editor + "\n", ex);
									}
								}
								
								let space = gMsgCompose.editor.document.createTextNode('\u00a0');
								if (caretContainer) {
									caretContainer.parentNode.insertBefore(space, caretContainer); 
									caretContainer.parentNode.removeChild(caretContainer);
								}
								editor.selection.selectAllChildren(space);
								if (prefs.getMyBoolPref('cursor.insertSpace')) {
									editor.selection.collapseToStart(); // 
									editor.selection.modify('extend', 'forward','character');
									selCtrl.scrollSelectionIntoView(selCtrl.SELECTION_NORMAL, selCtrl.SELECTION_WHOLE_SELECTION, scrollFlags);
									selCtrl.setDisplaySelection(selCtrl.SELECTION_ATTENTION);
								}
								else {
									editor.selection.collapseToStart(); 
									// check if we would create an empty paragraph:
									if (space.textContent == space.parentNode.innerText 
									    && 
											space.parentNode.tagName.toLowerCase()=="p")
										space.parentNode.innerHTML="<br>"; // avoid empty paragraph because the editor will remove it; replaces space
									else
										space.parentNode.removeChild(space);
								}
								window.updateCommands('style');
                // =========== FORCE CURSOR IN <PARA> ==================================== ]]]]
							}
							catch (ex) {
								util.logException("forceParagraph failed.", ex);
							}
						}
					} 
					else { // no cursor
						if (isReplyOnTop) {
							if (editor.selection.collapseToStart)
								editor.selection.collapseToStart();
							else
								editor.selection.collapse(theParent, nodeOffset+1); 
						}
						else {
						  // if we reply below we must be above the signature.
							if (editor.selection.collapseToEnd)
								editor.selection.collapseToEnd();
							else
								editor.selection.collapse(theParent, nodeOffset+1); 
						}
					}
					/* void scrollIntoView (in short aRegion, in boolean aIsSynchronous, in int16_t aVPercent, in int16_t aHPercent); */
					// editor.selection.scrollIntoView(space,false,10,10);
				}
			}
		}
		catch(ex) {
			util.logException("editor.selectionController command failed - editor = " + editor + "\n", ex);
		}
		
		if (flags.isStationery && targetNode) {
			if (isDebugComposer) debugger;
			if (targetNode.parentNode)
				targetNode.parentNode.removeChild(targetNode);  // Bug 25710
		}
		//[] prepend mailto "body" part if missing, in case something went wrong
		if (gMsgCompose.type == msgComposeType.MailToUrl && bodyContent) {
			if (!bodyEl.innerHTML) {
				bodyEl.innerHTML = bodyContent;
				util.logDebugOptional('composer','restoring body inner HTML:\n' + bodyContent);
			}
		}
		
		
		resetDocument(gMsgCompose.editor, startup);
		
		// no license => show license notification.
		if (!util.mainInstance.Licenser.isValidated) {
			util.logDebugOptional('premium.licenser', 'show license popup (isValidated==false)');
			util.popupLicenseNotification("", true, false);		// featureList = "" - standard for ALL features.
		}
		else
			util.logDebugOptional('premium.licenser', 'License is validated, no popup');
		
		if (SmartTemplate4.hasDeferredVars) {
			util.setupDeferredListeners(gMsgCompose.editor);
		}
		
		util.logDebugOptional('functions.insertTemplate', ' finished. ' );
		// remember  compose case for outside world
		this.composeCase = composeCase;      // 'undefined', 'new', 'reply', 'forward', 'draft'
		this.composeType = st4composeType;   // '', 'new', 'rsp', 'fwd'
	};

	function resetDocument(editor, withUndo) {
		gMsgCompose.editor.resetModificationCount();
		if (withUndo) {
			util.logDebugOptional('functions', ' resetting Undo... ' );
			gMsgCompose.editor.enableUndo(false);
			gMsgCompose.editor.enableUndo(true);
		}
	};
	
	// -----------------------------------
	// Constructor
	// var SmartTemplate4 = SmartTemplate4;
	var orgQuoteHeaders = new Array();

	// -----------------------------------
	// Public methods of classSmartTemplate
	this.insertTemplate = insertTemplate;
	this.extractSignature = extractSignature;
  this.getProcessedText = getProcessedText;	
	this.resetDocument = resetDocument;
	this.testSignatureVar = testSignatureVar;
	this.testCursorVar = testCursorVar;
	this.testSmartTemplateToken = testSmartTemplateToken;
};


