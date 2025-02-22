"use strict";
/* 
BEGIN LICENSE BLOCK

	SmartTemplate4 is released under the Creative Commons (CC BY-ND 4.0)
	Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
	For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

//******************************************************************************
// for messengercompose
//******************************************************************************
// moved main object into smartTemplate-main.js !

// -------------------------------------------------------------------
// common (preference)
// -------------------------------------------------------------------
// this class uses 2 "global" variables:
// 1. branch = smartTemplate4  the branch from the preferences
SmartTemplate4.classPref = function() {
  const Ci = Components.interfaces,
        Cc = Components.classes;
	// -----------------------------------
	// Constructor
	let root = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	// -----------------------------------
	// get preference
	// returns default value if preference cannot be found.
	function getCom(prefstring, defaultValue)	{
		const util = SmartTemplate4.Util;
		try {
			switch (root.getPrefType(prefstring)) {
				case Ci.nsIPrefBranch.PREF_STRING:
          try {
						return root.getComplexValue(prefstring, Ci.nsIPrefLocalizedString).data;
          }
          catch(ex) {
            util.logDebug("Prefstring missing: " + prefstring 
              + "\nReturning default string: [" + defaultValue + "]");
            return defaultValue;
          }
				case Ci.nsIPrefBranch.PREF_INT:
					return root.getIntPref(prefstring);
				case Ci.nsIPrefBranch.PREF_BOOL:
					return root.getBoolPref(prefstring);
				default:
					break;
			}
			return defaultValue;
		}
		catch(ex) {
			return defaultValue;
		}
	};

	// -----------------------------------
	// get preference(branch)
	function getWithBranch(idKey, defaultValue)
	{
		return getCom(SmartTemplate4.Preferences.Prefix + idKey, defaultValue); //
	};

	// idKey Account
	// composeType: rsp, fwd, new
	// def: true = common
	// "Disable default quote header"
	function isDeleteHeaders(idKey, composeType, def) {
		// xxxhead
		return getWithIdkey(idKey, composeType + "head", def)
	};

	function isReplaceNewLines(idKey, composeType, def) {
		// xxxnbr
		return getWithIdkey(idKey, composeType + "nbr", def)
	};

	function isUseHtml(idKey, composeType, def) {
		// xxxhtml
		return getWithIdkey(idKey, composeType + "html", def)
	};

	function getTemplate(idKey, composeType, def) {
		return getWithIdkey(idKey, composeType + "msg", def);
	};

	function getQuoteHeader(idKey, composeType, def) {
		return getWithIdkey(idKey, composeType + "header", def);
	};

	function isProcessingActive(idKey, composeType, def) {
		let isActive = getWithIdkey(idKey, composeType, def);
		if (!isActive) return false; // defaults to empty string
		return isActive;
	};

	// whether an Identity uses the common account
	function isCommon(idkey) {
		return getWithBranch(idkey + ".def", true);
	};
	

	// -----------------------------------
	// Get preference with identity key
	function getWithIdkey(idkey, pref, def) {
	  // fix problems in draft mode...
	  if (!pref) 
			return ""; // draft etc.
		// extensions.smarttemplate.id8.def means account id8 uses common values.
		if (getWithBranch(idkey + ".def", true)) { // "extensions.smartTemplate4." + "id12.def"
		  // common preference - test with .common!!!!
			return getWithBranch("common." + pref, def);
		}
		else {
		  // Account specific preference
		  return getWithBranch(idkey + "." + pref, def);
		}
	};

	// -----------------------------------
	// Public methods
	this.getCom = getCom;
	this.getLocalePref = SmartTemplate4.Util.getLocalePref;
	this.getTemplate = getTemplate;
	this.getQuoteHeader = getQuoteHeader;
	this.getWithBranch = getWithBranch;
	this.getWithIdkey = getWithIdkey;
	this.isCommon = isCommon;
	this.isDeleteHeaders = isDeleteHeaders;
	this.isProcessingActive = isProcessingActive;
	this.isReplaceNewLines = isReplaceNewLines;
	this.isUseHtml = isUseHtml;

};


/**
 * Function to kick off/resume asynchronous processing.  Any function invoked by
 *  async_run that returns/yields false at any point is responsible for ensuring
 *  async_driver() is called again once the async operation completes.
 *
 * Note: This function actually schedules the real driver to run after a
 *  timeout. This is to ensure that if you call us from a notification event
 *  that all the other things getting notified get a chance to do their work
 *  before we actually continue execution.  It also keeps our stack traces
 *  cleaner.
 */
 /*
function async_driver(val) {
  asyncGeneratorSendValue = val;
  do_execute_soon(_async_driver);
  return false;
}
*/

// We use this as a display consumer
// nsIStreamListener
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
// not used (yet)
var SmartTemplate4_streamListener =
{
  _data: "",
  _stream : null,

  QueryInterface:
	  function () {
			if (XPCOMUtils.generateQI)
				return XPCOMUtils.generateQI([Components.interfaces.nsIStreamListener, Components.interfaces.nsIRequestObserver]);
			return null;
		},

  // nsIRequestObserver interfaces
  onStartRequest: function(aRequest, aContext) {
    // Note: An exception thrown from onStartRequest has the side-effect of causing the request to be canceled.
  },
  onStopRequest: function(aRequest, aContext, aStatusCode) {
    // Called to signify the end of an asynchronous request. This call is always preceded by a call to onStartRequest().
    //in nsIRequest aRequest,
    // in nsISupports aContext,
    // in nsresult aStatusCode
    do_check_eq(aStatusCode, 0);
    do_check_true(this._data.contains("Content-Type"));
    // async_driver(); //????
  },

  // concatenate stream data into a string
  onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
    if (this._stream == null) {
      this._stream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
      this._stream.init(aInputStream);
    }
    this._data += this._stream.read(aCount);
  }
};

// -------------------------------------------------------------------
// Get header string
// for "dummy header" derived from eml file, use clsGetAltHeader() instead.
// -------------------------------------------------------------------
SmartTemplate4.classGetHeaders = function(messageURI) {
	// -----------------------------------
	// Constructor
  const Ci = Components.interfaces,
        Cc = Components.classes;
	let util = SmartTemplate4.Util,
      messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
	    messageService = messenger.messageServiceFromURI(messageURI),
	    messageStream = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance().QueryInterface(Ci.nsIInputStream),
	    inputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Ci.nsIScriptableInputStream);

  util.logDebugOptional('functions','classGetHeaders(' + messageURI + ')');
  let headers = Cc["@mozilla.org/messenger/mimeheaders;1"]
              .createInstance().QueryInterface(Ci.nsIMimeHeaders);
							
					
/*   
  // ASYNC MIME HEADERS

  let testStreamHeaders = true; // new code!
  var asyncUrlListener = new AsyncUrlListener();
  
  if (testStreamHeaders) {
    // http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsIMsgMessageService.idl#190
    
    // http://mxr.mozilla.org/comm-central/source/mailnews/imap/test/unit/test_imapHdrStreaming.js#101
    let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
    let msgService = messenger.messageServiceFromURI(messageURI); // get nsIMsgMessageService
    msgService.streamHeaders(msgURI, SmartTemplate4_streamListener, asyncUrlListener,true);    
    yield false;
  }
  // ==
  let msgContent = new String(SmartTemplate4_streamListener._data);
  headers.initialize(msgContent, msgContent.length);
*/  
  if (messageURI.indexOf(".eml")>0) { 
		return null;
	}
	inputStream.init(messageStream);
	try {
		messageService.streamMessage(messageURI, messageStream, msgWindow, null, false, null);
	}
	catch (ex) {
		util.logException('classGetHeaders - constructor - messageService.streamMessage failed', ex);
		return null;
	}

	let msgContent = "",
	    contentCache = "";
  try {
    while (inputStream.available()) { 
      msgContent = msgContent + inputStream.read(2048); 
      let p = msgContent.search(/\r\n\r\n|\r\r|\n\n/); //todo: it would be faster to just search in the new block (but also needs to check the last 3 bytes)
      if (p > 0) {
        contentCache = msgContent.substr(p + (msgContent[p] == msgContent[p+1] ? 2 : 4));
        msgContent = msgContent.substr(0, p) + "\r\n";
        break;
      }
      if (msgContent.length > 2048 * 32) {
        util.logDebug('classGetHeaders - early exit - msgContent length>64kB: ' + msgContent.length);
        break; // instead of a fatal 
      }
    }
  }
  catch(ex) {
    util.logException('Reading inputStream failed:', ex);
    if (!msgContent) throw(ex);
  }
  
	headers.initialize(msgContent, msgContent.length);
	util.logDebugOptional('mime','allHeaders: \n' +  headers.allHeaders);

	// -----------------------------------
	// Get header
	function get(header) {
    // /nsIMimeHeaders.extractHeader
    let retValue = '',
		    str = headers.extractHeader(header, false);
    // for names maybe use nsIMsgHeaderParser.extractHeaderAddressName instead?
    if (str && SmartTemplate4.Preferences.getMyBoolPref('headers.unescape.quotes')) {
      // if a string has nested escaped quotes in it, should we unescape them?
      // "Al \"Karsten\" Seltzer" <fxxxx@gmail.com>
      retValue = str.replace(/\\\"/g, "\""); // unescape
    }
    else
      retValue = str ? str : "";
    SmartTemplate4.regularize.headersDump += 'extractHeader(' + header + ') = ' + retValue + '\n';
    return retValue;
	};
	
	// -----------------------------------
	// Get content
	function content(size) {
	  while (inputStream.available() && contentCache.length < size) 
	    contentCache += inputStream.read(2048);
	  if (contentCache.length > size) return contentCache.substr(0, size);
	  else return contentCache;
	};

	// -----------------------------------
	// Public methods
	this.get = get;
	this.content = content;

	return null;
};

SmartTemplate4.clsGetAltHeader = function(msgDummyHeader) {
	// -----------------------------------
	// Get header
	function get(header) {
		function toCamelCase(h) {
			return h.substr(0, 1).toLowerCase() + h.substr(1);
		}
    // /nsIMimeHeaders.extractHeader
		let hdr = toCamelCase(header);
		switch(hdr) {
			case "from":
			  hdr = "author";
				break;
			case "to":
			  hdr = "recipients";
				break;
		}
		let retValue = "";
		try {
			retValue = msgDummyHeader[hdr];
			if(!retValue) {
				if (retValue=="") {
					// if we are writing a NEW mail, we should insert some placeholders for resolving later.
					// if (gMsgCompose.composeHTML && hdr.composeType == 'new') {
					//   retValue = util.wrapDeferredHeader(hdr, "", gMsgCompose.composeHTML);
					// }
				}
				else
					if (typeof msgDummyHeader[hdr] == "undefined")
						retValue = msgDummyHeader.__proto__[hdr];
			} 
				
		}
		catch (ex) {
			SmartTemplate4.Util.logException("clsGetAltHeader.get(" + hdr + ") failed.")
		}
    SmartTemplate4.regularize.headersDump += 'extractHeader(' + header + ') = ' + retValue + '\n';
    return retValue;
	};	
	this.get = get;
	this.content = ""; // nothing here...
	
}
// -------------------------------------------------------------------
// MIME decode
// -------------------------------------------------------------------
SmartTemplate4.mimeDecoder = {
	headerParam: Components
	             .classes["@mozilla.org/network/mime-hdrparam;1"]
	             .getService(Components.interfaces.nsIMIMEHeaderParam),

	// -----------------------------------
	// Detect character set
	// jcranmer: this is really impossible based on such short fields
	// see also: hg.mozilla.org/users/Pidgeot18_gmail.com/patch-queues/file/cd19874b48f8/patches-newmime/parser-charsets
	//           http://encoding.spec.whatwg.org/#interface-textdecoder
	//           
	detectCharset: function(str) {
		let charset = "";
		 // not supported                  
		 // #    RFC1555 ISO-8859-8 (Hebrew)
		 // #    RFC1922 iso-2022-cn-ext (Chinese extended)

		if (str.search(/\x1b\$[@B]|\x1b\(J|\x1b\$\(D/gi) !== -1) {   // RFC1468 (Japanese)
		  charset = "iso-2022-jp"; 
		} 
		if (str.search(/\x1b\$\)C/gi) !== -1)                    {   // RFC1557 (Korean)
		  charset = "iso-2022-kr"; 
		} 
		if (str.search(/~{/gi) !== -1)                           {   // RFC1842 (Chinese ASCII)
		  charset = "HZ-GB-2312"; 
		}
		if (str.search(/\x1b\$\)[AG]|\x1b\$\*H/gi) !== -1)       {   // RFC1922 (Chinese) 
		  charset = "iso-2022-cn"; 
		}
		if (str.search(/\x1b\$\(D/gi) !== -1) {  // RFC2237 (Japanese 1)
		  charset = "iso-2022-jp-1"; 
		}
		if (!charset) { 
			let defaultSet = SmartTemplate4.Preferences.getMyStringPref ('defaultCharset');
			charset = defaultSet ? defaultSet : '';  // should we take this from Thunderbird instead?
		}
		SmartTemplate4.Util.logDebugOptional('mime','mimeDecoder.detectCharset guessed charset: ' + charset +'...');
		return charset;
	},

	// -----------------------------------
	// MIME decoding.
	decode: function (theString, charset) {
		let decodedStr = "";

		try {
			if (/=\?/.test(theString)) {
				// RFC2231/2047 encoding.
				// We need to escape the space and split by line-breaks,
				// because getParameter stops convert at the space/line-breaks.
        // => some russian mail servers use tab character as delimiter
        //    some even use a space character between 2 encoding blocks
        theString = theString.replace ("?= =?", "?=\n=?"); // space problem
				let array = theString.split(/\s*\r\n\s*|\s*\r\s*|\s*\n\s*|\s*\t\s*/g);
				for (let i = 0; i < array.length; i++) {
					decodedStr += this.headerParam
					                  .getParameter(array[i].replace(/%/g, "%%").replace(/ /g, "-%-"), null, charset, true, { value: null })
					                  .replace(/-%-/g, " ").replace(/%%/g, "%");
				}
			}
			else {
				// for Mailers who have no manners.
				if (util.versionGreaterOrEqual(util.AppverFull, "61")) {
					util.logDebug("Mailer has no manners, trying to decode string: " + theString);
					decodedStr = decodeURIComponent(escape(theString));
					util.logDebug("...decoded string: " + decodedStr);
				}
				else {
					if (charset === "")
						charset = this.detectCharset(theString);
					let skip = charset.search(/ISO-2022|HZ-GB|UTF-7/gmi) !== -1;
					// this will always fail if theString is not an ACString?
					let cvtUTF8 = Components.classes["@mozilla.org/intl/utf8converterservice;1"].getService(Components.interfaces.nsIUTF8ConverterService),
					decodedStr = this.cvtUTF8.convertStringToUTF8(theString, charset, skip);
				}
			}
		}
		catch(ex) {
			SmartTemplate4.Util.logDebugOptional('mime','mimeDecoder.decode(' + theString + ') failed with charset: ' + charset
			    + '...\n' + ex);
			return theString;
		}
		return decodedStr;
	} ,

	// -----------------------------------
	// Split addresses and change encoding.
  // addrstr - comma separated string of address-parts
  // charset - character set of target string (probably silly to have one for all)
  // format - list of parts for target string: name, firstName, lastName, mail, link, bracketMail(), initial
	split: function (addrstr, charset, format, bypassCharsetDecoder)	{
		const util = SmartTemplate4.Util,
		      prefs = SmartTemplate4.Preferences;
	  // jcranmer: you want to use parseHeadersWithArray
		//           that gives you three arrays
	  //           the first is an array of strings "a@b.com", "b@b.com", etc.
		//           the second is an array of the display names, I think fully unquoted
    //           the third is an array of strings "Hello <a@b.com>"
		//           preserveIntegrity is used, so someone with the string "Dole, Bob" will have that be quoted I think
		//           if you don't want that, you'd have to pass to unquotePhraseOrAddrWString(value, false)
		//           oh, and you *don't* need to decode first, though you might want to
		// see also: https://bugzilla.mozilla.org/show_bug.cgi?id=858337
		//           hg.mozilla.org/users/Pidgeot18_gmail.com/patch-queues/file/587dc0232d8a/patches-newmime/parser-tokens#l78
		// use https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIMsgDBHdr
		// mime2DecodedAuthor, mime2DecodedSubject, mime2DecodedRecipients!
	  function getEmailAddress(a) {
			return a.replace(/.*<(\S+)>.*/g, "$1");
		}

		function isLastName(format) { return (format.search(/^\(lastname[,\)]/, "i") != -1); };
    // argType = Mail or Name to support bracketMail and bracketName
    function getBracketAddressArgs(format, argType) { 
      let reg = new RegExp('bracket' + argType + '\\<(.+?)\\>', 'g'), //   /bracketMail\[(.+?)\]/g, // we have previously replaced bracketMail(*) with bracketMail<*> !
          ar = reg.exec(format);
      if (ar && ar.length>1) {
        let args = ar[1];
        util.logDebugOptional('regularize', 
          'getBracketAddressArgs(' + format + ',' + argType + ') returns ' + args 
          + '\n out of ' + ar.length + ' results.');
        return args;
      }
      return '';
    };
    function getCardFromAB(mail) {
      if (!mail) return null;
      // https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Address_Book_Examples
      // http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/public/nsIAbCard.idl
      
      let allAddressBooks;

      if (util.Application === "Postbox") {
         // mailCore.js:2201 
         // abCardForEmailAddress(aEmailAddress, aAddressBookOperations, aAddressBook)
         let card = abCardForEmailAddress(mail,  Components.interfaces.nsIAbDirectory.opRead, {});
         if (card) return card;
         return null;
      }
      else {
        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
        allAddressBooks = abManager.directories; 
      }
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext()
                                         .QueryInterface(Components.interfaces.nsIAbDirectory);
        if (addressBook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
          // alert ("Directory Name:" + addressBook.dirName);
          try {
            let card = addressBook.cardForEmailAddress(mail);
            if (card)
              return card;
          }
          catch(ex) {
            util.logDebug('Problem with Addressbook: ' + addressBook.dirName + '\n' + ex) ;
          }
        }
      }
      return null;
    }

    // return the bracket delimiters
		function getBracketDelimiters(bracketParams, element) {
      let del1='', del2='',
          bracketExp = element.field,
					isOptional = false;
      if (bracketExp) {
				// ??prefix make brackets optional if bracketMail / bracketName is the only element in the address.
				// e.g. ??bracketName(??round)
        // bracketMail()% use to "wrap" mail address with non-standard characters
        // bracketMail(square)%    [email]  - square brackets
        // bracketMail(round)%     (email)   - round brackets
        // bracketMail(angle)%     <email>   - angled brackets
        // bracketMail(;)%      email
        // bracketMail(<;>)%    <email>
        // bracketMail(";")%    "email"
        // bracketMail(= ;)%     = email
        // etc.
        // the expression between brackets can also have empty delimiters; e.g. bracketMail(- ;) will prefix "- " and append nothing
        // we use ; as delimiter between the bracket expressions to avoid wrongly splitting format string elsewhere
        // (Should we allow escaped round brackets?)
				if (bracketParams.indexOf('??')==0) {
					isOptional = true;
					bracketParams = bracketParams.substring(2);
				}
					
        if (!bracketParams.trim())
          bracketParams = 'angle';
        let delimiters = bracketParams.split(';');
        switch(delimiters.length) {
          case 0: // error
            break;
          case 1: // special case
            switch(delimiters[0]) {
              case 'square':
                del1 = '[';
                del2 = ']';
                break;
              case 'round':
                del1 = '(';
                del2 = ')';
                break;
              case 'angle': case 'angled':
                del1 = '&lt;'; // <
                del2 = '&gt;';  // >
                break;
              default:
                del1 = delimiters[0]; // allow single delimiter, such as dash
                del2 = '';
            }
            break;
          default: // delimiters separated by ; 3 and more are ignored.
            del1 = delimiters[0];
            del2 = delimiters[1];
            break;
        }
      }
      return [del1, del2, isOptional];
    }
    
		
		if (typeof addrstr =='undefined')
			return ''; // no address string (new emails)
		
    //  %from% and %to% default to name followed by bracketed email address
    if (typeof format=='undefined' || format == '') {
      format =  prefs.getMyStringPref('mime.defaultFormat').replace("(","<").replace(")",">") ; // 'name,bracketMail<angle>'
    }
    
		util.logDebugOptional('mime.split',
         '====================================================\n'
       + 'mimeDecoder.split(charset decoding=' + (bypassCharsetDecoder ? 'bypassed' : 'active') + ')\n'
       + '  addrstr:' +  addrstr + '\n'
       + '  charset: ' + charset + '\n'
       + '  format: ' + format + '\n'
       + '====================================================');
		// if (!bypassCharsetDecoder)
			// addrstr = this.decode(addrstr, charset);
		// Escape % and , characters in mail addresses
		if (prefs.isDebugOption('mime.split')) debugger;
		
		addrstr = addrstr.replace(/"[^"]*"/g, function(s){ return s.replace(/%/g, "%%").replace(/,/g, "-%-"); });
		util.logDebugOptional('mime.split', 'After escaping special chars in mail address field:\n' + addrstr);

    /** SPLIT ADDRESSES **/
		let array = addrstr.split(/\s*,\s*/);
    
    /** SPLIT FORMAT PLACEHOLDERS **/
		// possible values for format are:
		// name, firstname, lastname, mail - fields (to be extended)
    // bracketMail(args) - special function (we replaced the round brackets with < > for parsing)
    // link, islinkable  - these are "modifiers" for the previous list element
		let formatArray = util.splitFormatArgs(format);
    
    let dbgText = 'addrstr.split() found [' + array.length + '] addresses \n' + 'Formats:\n';
    for (let i=0; i<formatArray.length; i++) {
      dbgText += formatArray[i].field;
      if (formatArray[i].modifier)  
        dbgText += '(' + formatArray[i].modifier + ')';
      dbgText += '\n';
    }
    util.logDebugOptional('mime.split', dbgText);
    
		const nameDelim = prefs.getMyStringPref('names.delimiter'), // Bug 26207
			    isGuessFromAddressPart = prefs.getMyBoolPref('names.guessFromMail'),
					isReplaceNameFromParens = prefs.getMyBoolPref('names.extractNameFromParentheses'); // [Bug 26595] disable name guessing      
		let addresses = "",
        address,
        bracketMailParams = getBracketAddressArgs(format, 'Mail'),
        bracketNameParams = getBracketAddressArgs(format, 'Name');

    /** ITERATE ADDRESSES  **/
		for (let i = 0; i < array.length; i++) {
			let suppressMail = false;
			if (prefs.isDebugOption('mime.split')) debugger;
			if (i > 0) {
				addresses += nameDelim + " ";  // comma or semicolon
			}
      let addressee = '',
          firstName, lastName,
          fullName = '',
          emailAddress = '',
          addressField = array[i];
					
      // [Bug 25816] - missing names caused by differing encoding
      // MIME decode (moved into the loop)
      if (!bypassCharsetDecoder)
        addressField = this.decode(array[i], charset);
      
			// Escape "," in mail addresses
			array[i] = addressField.replace(/\r\n|\r|\n/g, "")
			                   .replace(/"[^"]*"/,
			                   function(s){ return s.replace(/-%-/g, ",").replace(/%%/g, "%"); });
			// name or/and address. (wraps email into <  > )
			address = array[i].replace(/^\s*([^<]\S+[^>])\s*$/, "<$1>").replace(/^\s*(\S+)\s*\((.*)\)\s*$/, "$2 <$1>");
			
      
      util.logDebugOptional('mime.split', 'processing: ' + addressField + ' => ' + array[i] + '\n'
                                           + 'address: ' + address);
      // [Bug 25643] get name from Addressbook
      emailAddress = getEmailAddress(address); // get this always
      let card = prefs.getMyBoolPref('mime.resolveAB') ? getCardFromAB(emailAddress) : null;
			
          
			
      // determine name part (left of email)
      addressee = address.replace(/\s*<\S+>\s*$/, "")
                      .replace(/^\s*\"|\"\s*$/g, "");  // %to% / %to(name)%
											
      if (isGuessFromAddressPart && !addressee) { // if no addressee part found we probably have only an email address.; take first part before the @
        addressee = address.slice(0, address.indexOf('@'));
        if (addressee.charAt('0')=='<')
          addressee = addressee.slice(1);
      }
      // if somebody repeats the email address instead of a name at front, e.g. a.x@tcom, we cut the domain off anyway
      if (addressee.indexOf('@')>0) {
				let add_end = addressee.substring(addressee.length-1);
        addressee = addressee.slice(0, addressee.indexOf('@')); // if we do this we may need to re-add parentheses or special characters at the end!
			if ([')', ']', '}', '"'].indexOf(add_end) !== -1)
				addressee += add_end; // re-add ')'
			}
			fullName = addressee;
      
			// attempt filling first & last name from AB
      firstName = card ? card.firstName : '';
      if (card) {
				if (prefs.getMyBoolPref('mime.resolveAB.preferNick')) {
					if (util.Application === "Postbox") {
						if (card.nickName) 
							firstName = card.nickName;
					}
					else
						firstName = card.getProperty("NickName", card.firstName);
				}
				if (!firstName && prefs.getMyBoolPref('mime.resolveAB.displayName'))
					firstName = card.displayName;
      }
      lastName = card ? card.lastName : '';
      fullName = (card && card.displayName) ? card.displayName : fullName;
			
			
			let isNameFound = (firstName.length + lastName.length > 0); // only set if name was found in AB
			if ((fullName || isNameFound) && prefs.getMyBoolPref('mime.resolveAB.removeEmail')) {
				// remove mail if name found in AB, and a name component is displayed:
				for (let f=0; f<formatArray.length; f++) {
					if (["name","firstname","lastname","fullname"].indexOf(formatArray[f].field)>=0) {
						suppressMail = true;
					}
				}
			}
              
					
      if (!isNameFound && prefs.getMyBoolPref('firstLastSwap')) {
        // extract Name from left hand side of email address
				
				let regex = /\(([^)]+)\)/,
				    nameRes = regex.exec(addressee);
				// (Name) extraction!
				if (isReplaceNameFromParens && nameRes  &&  nameRes.length > 1 && !isLastName(format)) {
					isNameFound = true;
					firstName = nameRes[1];  // name or firstname will fetch the (Name) from brackets!
				}
				else {
					let iComma = addressee.indexOf(', ');
					if (iComma>0) {
						firstName = addressee.substr(iComma + 2);
						// remove parentheses part from firstnames
						if (nameRes)
							firstName = (firstName.replace(nameRes[0],'')).trim();
						lastName = addressee.substr(0, iComma);
            isNameFound = true;
					}
				}
      }
      
      if (!fullName) {
        if (firstName && lastName) { 
          fullName = firstName + ' ' + lastName ; 
        }
        else {
          fullName = firstName ? firstName : lastName;  // ???
        }
        if (!fullName) fullName = addressee.replace("."," "); // we might have to replace . with a space -  fall back
      }
      else {
        // name split / replacements; if there are no spaces lets replace '.' then '_'
        if (fullName.indexOf(' ')<0) {
           fullName = addressee.replace('.',' ');
        }
        if (fullName.indexOf(' ')<0) {
           fullName = addressee.replace('_',' ');
        }
        // replace double quotation marks?
      }
      
      let names = fullName.split(' '),
			    ncount = names.length,
          isOnlyOneName = (ncount==1) ? true : false;
      if (!firstName) {
				firstName = '';
				if (isOnlyOneName)
					firstName = names[0];  // always fill first Name!
				else for (let n=0; n<ncount-1; n++) {
					if (n>0) firstName += ' '; // concatenate with space between all first names
					firstName += names[n];
				}
			}
			// [Bug 26208] ? Omitting middle names
			if (!lastName && !isOnlyOneName) {
				lastName = ncount ? names[ncount-1] : '';
			}
      
      if (prefs.getMyBoolPref('names.capitalize')) {
        fullName = util.toTitleCase(fullName);
        firstName = util.toTitleCase(firstName);
        lastName = util.toTitleCase(lastName);
      }
      
      // build the part!
			let addressElements = [],
			    foundNonOptionalParts = false,
			    open = '', 
					close = '',
					bracketsAreOptional = false; // bracket Elements

      for (let j=0; j<formatArray.length; j++)  {
        let element = formatArray[j],
            part = '',
						isOptionalPart = false,
						partKeyWord = element.field; 
						
				if (partKeyWord.indexOf('??')==0) {
					partKeyWord = partKeyWord.substring(2);
					isOptionalPart = true;
				}
        switch(partKeyWord.toLowerCase()) {
					case 'initial':
						while (addressElements.length>1) 
							addressElements.pop();
					  addressElements.push( {part:addrstr, optional:false, bracketLeft:'', bracketRight:'', bracketsOptional:true}  ); // return unchanged string, ignore all other parameters
						break;
          case 'mail':
						if (suppressMail)
							continue;
            switch (element.modifier) {
              case 'linkable':
                part = emailAddress;
                break;
              case 'linkTo': // No special linking, anchor will be modified below like with all other parts
                part = emailAddress;
                break;
              default:
                //empty anchor suppresses link; adding angle brackets as default
                // TO DO: make default brackets configurable later
                if (prefs.getMyBoolPref('mail.suppressLink'))
                  part = "<a>" + "&lt;" + emailAddress + "&gt;" + "</a>"; 
                else
                  part = emailAddress;                  
            }
            break;
					case 'fwd': // this is handled on the outside, so we ignore it
						continue;
          case 'name':
          case 'fullname':
            if (fullName)
              part = fullName;
            else {
							if (isGuessFromAddressPart)
								part = address.replace(/.*<(\S+)@\S+>.*/g, "$1"); // email first part fallback
							else
								part = ''; // [Bug 26595]
						}
						// [Bug 26209] wrap name if contains comma
						if (prefs.getMyBoolPref('names.quoteIfComma')) {
							if (part.includes(',') || part.includes(';'))
								part = '"' + part + '"';
						}
            break;
          case 'firstname':
            part = firstName;
            break;
          case 'lastname':
            if (isOnlyOneName && format.indexOf('firstname')<0) {
              part = firstName; // fall back to first name if lastName was 
                                // 'emptied' because of duplication
            }
            else
              part = lastName;
            break;
          default:
            let bM = (partKeyWord.indexOf('bracketMail<')==0),
                bN = (partKeyWord.indexOf('bracketName<')==0);
            if (bM || bN) {
              if (bM) {
                [open, close, bracketsAreOptional] = getBracketDelimiters(bracketMailParams, element);
                part = emailAddress ?  emailAddress : ''; // adding brackets later!
              }
              else {
								if (isGuessFromAddressPart || fullName) {
									[open, close, bracketsAreOptional] = getBracketDelimiters(bracketNameParams, element);
									let fN = fullName ? fullName : address.replace(/.*<(\S+)@\S+>.*/g, "$1"); // email first part fallback
									part = fN ? fN : '';
								}
								else
									part = '';
              }
            }
            break;
        }
        if (element.modifier =='linkTo') {
          part = "<a href=mailto:" + emailAddress + ">" + part + "</a>"; // mailto
        }

				// make array of non-empty parts
				if (part) {
					addressElements.push({part:part, optional:isOptionalPart, bracketLeft:open, bracketRight:close, bracketsOptional: bracketsAreOptional});
					if (!isOptionalPart) 
						foundNonOptionalParts = true;
				}
      }
			
      addressField = ''; // reset to finalize
			for (let j=0; j<addressElements.length; j++)  {
				let aElement = addressElements[j];
				// remove optional parts, e.g. to(name,??mail) - will only show name unless missing, in which case it shows mail
				if (aElement.optional && foundNonOptionalParts)
					continue;
        // append the next part if not empty
        if (aElement.part.length>1) {
          if (addressField.length) addressField += ' '; // space to append next parts
					// if there is only one element and brackets param is prefixed with ??
					// e.g. %from(name,bracketMail(??- {,}))%
					// Name - {email}
					// then hide the brackets and only show email.
					if (addressElements.length==1 && aElement.bracketsOptional)
						addressField += aElement.part; // omit brackets if this is the only bracketed Expression returned
					else
						addressField += aElement.bracketLeft + aElement.part + aElement.bracketRight;
        }
			}
      
      util.logDebugOptional('mime.split', 'adding formatted address: ' + addressField);
      addresses += addressField;
		}
		return addresses;
	} // split
};

SmartTemplate4.parseModifier = function(msg) {
	function matchText(regX, fromPart) {
	  try {
			if (prefs.isDebugOption('parseModifier')) debugger;
			let matchPart = msg.match(regX);
			if (matchPart) {
				for (let i=0; i<matchPart.length; i++) {
					if (!gMsgCompose.originalMsgURI) debugger;
					util.logDebugOptional('parseModifier','matched variable [' + i + ']: ' + matchPart[i]);
					let patternArg = matchPart[i].match(   /(\"[^"].*?\")/   ), // get argument (includes quotation marks) ? non greedy
							hdr = new SmartTemplate4.classGetHeaders(gMsgCompose.originalMsgURI),
							extractSource = '',
							rx = patternArg ? util.unquotedRegex(patternArg[0], true) : ''; // pattern for searching body
					switch(fromPart) {
						case 'subject':
							if (!hdr) {
								msg = msg.replace(matchPart[i], "");
								util.logToConsole("matchText() - matchTextFromSubject failed - couldn't retrieve header from Uri");
								return;
							}
							util.addUsedPremiumFunction('matchTextFromSubject');
							let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
									charset = messenger.msgHdrFromURI(gMsgCompose.originalMsgURI).Charset;
							extractSource = SmartTemplate4.mimeDecoder.decode(hdr.get("Subject"), charset);
							util.logDebugOptional('parseModifier',"Extracting " + rx + " from Subject:\n" + extractSource);
							break;
						case 'body':
							let rootEl = gMsgCompose.editor.rootElement;
							extractSource = rootEl.innerText;
							// util.popupLicenseNotification("matchTextFromBody", true, true);
							util.addUsedPremiumFunction('matchTextFromBody');
							util.logDebugOptional('parseModifier',"Extracting " + rx + " from editor.root:\n" + extractSource);
							break;
						default:
							throw("Unknown source type:" + fromPart);
					}
					if (patternArg) {
						let groupArg = matchPart[i].match( /\"\,([0-9]+)/ ), // match group number
						    removePat = false;
						if (extractSource) {
							let result = rx.exec(extractSource); // extract Pattern from body
							if (result && result.length) {
								let group = groupArg ? parseInt(groupArg[1]) : 0,
								    replaceGroupString = '';
								if (isNaN(group)) group = 0;
								if (group>result.length) {
									util.logToConsole("Your group argument [" + group + "] is too high, do you have enough (round brackets) in your expression?");
								}
								else {
									if (groupArg==null) { // [Bug 26634] third parameter is a replacement string
										// check for string arg - after second comma: %header.append.matchFromSubject(hdr,regex,"replaceText"])%
										let commaPos = matchPart[i].lastIndexOf(",\"");
										if (commaPos>0) {
											let thirdArg = matchPart[i].substring(commaPos), // search for end of string ")
											    endPos = thirdArg.indexOf("\")");
											if (endPos>0) {
												replaceGroupString = thirdArg.substring(2,endPos);
											}
											else {
												util.logToConsole("replaceText - last string parameter is not well formed.");
												replaceGroupString = ""; // not well formed
											}
										} 
										else
											replaceGroupString = "";
									}
									else
									  replaceGroupString = result[group];
									// retrieve the (..) group part from the pattern  - e..g matchTextFromBody("Tattoo ([0-9])",1) => finds "Tattoo 100" => generates "100" (one word)
								}
								util.logDebug('matchText(' + fromPart + ') - Replacing Pattern with:\n' + replaceGroupString);
								msg = msg.replace(matchPart[i], replaceGroupString);
							}
							else { // [Bug 26512] - if matchText is used multiple times, the result is blank
								removePat = true;
								msg = msg.replace(matchPart[i],"");
							}
						}
						else removePat = true;
						if(removePat) {
							util.logDebug("pattern not found in " + fromPart + ":\n" + regX);
							msg = msg.replace(matchPart[i],"");
						}
					} 
				}
			} // matches loop
		}	
		catch	(ex) {
			util.logException('matchText(' + regX + ', ' + fromPart +') failed:', ex);
		}
	}
	
	const util = SmartTemplate4.Util,
	      prefs = SmartTemplate4.Preferences,
				Ci = Components.interfaces,
				Cc = Components.classes;
	
  // %matchTextFromBody()% using * to generate result:
  // %matchTextFromBody(TEST *)% => returns first * match: TEST XYZ => XYZ
	// Insert replacement from body of QUOTED email!
	matchText(/%matchTextFromBody\(.*\)%/g, 'body');
	// Insert replacement from subject line
	matchText(/%matchTextFromSubject\(.*\)%/g, 'subject');

	// make 2 arrays, words to delete and replacement pairs.
	let matches = msg.match(/%deleteText\(.*\)%/g), // works on template only
	    matchesR = msg.match(/%replaceText\(.*\)%/g); // works on template only
	if (matches) {
		try {
			util.addUsedPremiumFunction('deleteText');
			for (let i=0; i<matches.length; i++) {
				// parse out the argument (string to delete)
				msg = msg.replace(matches[i],'');
				let dText = matches[i].match(   /(\"[^)].*\")/   ); // get argument (includes quotation marks)
				if (dText) {
					msg = msg.replace(util.unquotedRegex(dText[0], true), "");
				}
			}
		}
		catch (ex) {
			util.logException('%deleteText()%', ex);
		}
	}
  
	if (matchesR) { // replacements in place
	try {
    let dText1, dText2;
		util.addUsedPremiumFunction('replaceText');
		for (let i=0; i<matchesR.length; i++) {
			// parse out the argument (string to delete)
			msg = msg.replace(matchesR[i], '');
      let theStrings = matchesR[i].split(",");
      if (theStrings.length==2) {
        dText1 = theStrings[0].match(   /\"[^)].*\"/   ); // get 2 arguments (includes quotation marks) "Replace", "With" => double quotes inside are not allowed.
        dText2 = theStrings[1].match(   /\"[^)].*\"/   ); // get 2 arguments (includes quotation marks) "Replace", "With" => double quotes inside are not allowed.
        // %replaceText("xxx", %matchBodyText("yyy *")%)%; // nesting to get word from replied
        
					let errTxt = "Splitting replaceText(a,b) arguments could not be parsed.",
							errDetail;
					
					if (!dText1)
						errDetail = "1st argument missing.";
					else if (!dText2)
						errDetail = "2nd argument missing.";
					else if (dText1.length + dText2.length < 2) {
						errDetail = "arguments malformed.";
					}
					else if (dText1.length + dText2.length > 2) {
						errDetail = "Argument contains quote marks - not supported.";
					}
					else {
          msg = msg.replace(util.unquotedRegex(dText1[0], true), util.unquotedRegex(dText2[0]));
        }
					if(errDetail)
						util.logToConsole(errTxt
							+ '\n ' + errDetail
            + '\n Arguments have to be enclosed in double quotes.');
        }
      else {
        util.logDebug('Splitting replaceText(a,b) did not return 2 arguments. '
          + '\n Arguments may not contain comma or double quotes.'
          + '\n Special characters such as # must be escaped with backslash.');
      }
		}
	}
		catch (ex) {
			util.logException('%replaceText()%', ex);
		}
		
	}
	
	return msg;
}
	
// -------------------------------------------------------------------
// Regularize template message
// -------------------------------------------------------------------
SmartTemplate4.regularize = function regularize(msg, composeType, isStationery, ignoreHTML, isDraftLike) {
  const Ci = Components.interfaces,
        Cc = Components.classes,
				Cu = Components.utils,
        util = SmartTemplate4.Util,
        prefs = SmartTemplate4.Preferences,
				mainLicenser = util.Mail3PaneWindow.SmartTemplate4.Licenser;
				
	// make sure to use the licenser from main window, to save time.
	if (!mainLicenser.isValidated && mainLicenser.GracePeriod<=0) {
		let varX = RegExp(/%\S*%/); // any variable with no whitespaces in it
		if (varX.test(msg)) {
			const PreviewLength = 320,
			      startVars = msg.search(/%\S*%/),
						isTruncateStart = (startVars > 10); // cut off text before first %var%
			let txtAlert = util.getBundleString("SmartTemplate4.notification.license.required", 
			                 "SmartTemplate⁴ requires a license to continue working. Read more at the bottom of the compose window."),
					txtParseTitle = util.getBundleString("SmartTemplate4.notification.parsing", "Parsing variables:"),
			    parseString = 
						(isTruncateStart ? "…" : "") +
						msg.substr(isTruncateStart ? startVars : 0);
						
			parseString = txtParseTitle + '\n' +
			    parseString.substr(0, PreviewLength) +
					(parseString.length>PreviewLength ? "…" : "")
					
			// show a fancier "branded" alert:
			SmartTemplate4.Message.display(txtAlert + '\n\n' + parseString, 
				"centerscreen,titlebar,modal,dialog",
				{ ok: function() { ; }},
				Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("msgcomposeWindow") || window
			);
			debugger;
		}
	}
				
	function getSubject(current) {
		if (prefs.isDebugOption("tokens.deferred")) debugger;
		util.logDebugOptional('regularize', 'getSubject(' + current + ')');
		let subject = '';
		if (current){
			subject = document.getElementById("msgSubject").value;
			return SmartTemplate4.escapeHtml(subject); //escapeHtml for non UTF8 chars in %subject% but this don't work in this place for the whole subject, only on %subject(2)%
		}
		else {
			
			subject = mime.decode(hdr.get("Subject"), charset);
			if (hdr.composeType=="new" && !subject) {
				subject = util.wrapDeferredHeader("subject", subject, gMsgCompose.composeHTML);
				util.logDebugOptional("tokens.deferred",'regularize - wrapped missing header:\n' + subject);
			}
			return subject;
		}
	}

	function getNewsgroup() {
		util.logDebugOptional('regularize', 'getNewsgroup()');
		let acctKey = msgDbHdr.accountKey;
		//const account = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager).getAccount(acctKey);
		//dump ("acctKey:"+ acctKey);

		//return account.incomingServer.prettyName;
		return acctKey;
	}

	// AG: I think this function is designed to break out a more specialized variable
	// such as %toname()% to a simpler one, like %To%
	function simplify(aString) {
		// Check existence of a header related to the reserved word.
		// str = smartTemplate token, e.g. %subject%
		function classifyReservedWord(str, reservedWord, param) {
			try {
				if (str!="%X:=today%") {
				  util.logDebugOptional('regularize','regularize.classifyReservedWord(' + str + ', ' +  reservedWord + ', ' + param || '' + ')');
				}
				let el = (typeof TokenMap[reservedWord]=='undefined') ? '' : TokenMap[reservedWord],
				    s = (el == "reserved")
					? str
					: hdr.get(el ? el : reservedWord) != "" ? str : "";
				if (!el)
					util.logDebug('Removing non-reserved word: %' +  reservedWord + '%');
				else { // it's a reserved word, likely a header
					if (prefs.isDebugOption("tokens.deferred")) debugger;
					if (typeof s =='undefined' || (s=="" && composeType=='new')) {
						// if we are writing a NEW mail, we should insert some placeholders for resolving later.
						// wrap into <smarttemplate > for later deferral (works only in HTML)
						// use pink fields for new emails for the New Mail case - this var can not be used in...
						if (el != "reserved" && util.checkIsURLencoded(str)) { // unknown header? make sure it is not an URL encoded thing
							s = str;
						}
						else
							s = util.wrapDeferredHeader(str, el, gMsgCompose.composeHTML, (composeType=='new')); // let's put in the reserved word as placeholder for simple deletion
						util.logDebugOptional("tokens.deferred",'classifyReservedWord - wrapped missing header:\n' + s);
					}
				}
				return s;
			} 
			catch (ex) {
				if (prefs.isDebugOption("tokens.deferred")) debugger;
				// let's implement later resolving of variables for premium users:
				// throws "hdr is null"
				SmartTemplate4.Message.parentWindow = gMsgCompose.editor.document.defaultView;
				util.displayNotAllowedMessage(reservedWord);
				return "";
			}
		}

		function checkReservedWords(str, strInBrackets) {
			// I think this first step is just replacing special functions with general ones.
			// E.g.: %tomail%(z) = %To%(z)
      // also removes optional [[ CC ]] parts.
      // this replaces empty cc
      // problem if string contains ( or ) it won't work
			let generalFunction = strInBrackets.replace(/%([\w-:=]+)(\([^)]+\))*%/gm, classifyReservedWord);
			// next: if it contains %, delete the string
			return  generalFunction.replace(/^[^%]*$/, "");
		}
		
		if ((composeType != "new") && !gMsgCompose.originalMsgURI)  {
			util.popupAlert ("SmartTemplate4", "Missing message URI - SmartTemplate4 cannot process this message!");
			return aString;
		}

		util.logDebugOptional('regularize', 'simplify()');

		// [AG] First Step: use the checkReservedWords function to process any "broken out" parts that are embedded in {  .. } pairs
		// aString = aString.replace(/{([^{}]+)}/gm, checkReservedWords);
		aString = aString.replace(/\[\[([^\[\]]+)\]\]/gm, checkReservedWords);

		// [AG] Second Step: use classifyReservedWord to categorize reserved words (variables) into one of the 6 classes: reserved, To, Cc, Date, From, Subject
		return aString.replace(/%([\w-:=]+)(\([^)]+\))*%/gm, classifyReservedWord);
	}

  SmartTemplate4.regularize.headersDump = '';
	util.logDebugOptional('regularize','SmartTemplate4.regularize(' + msg +')  STARTS...');
	// var parent = SmartTemplate4;
	let idkey = util.getIdentityKey(document),
	    identity = Cc["@mozilla.org/messenger/account-manager;1"]
					 .getService(Ci.nsIMsgAccountManager)
					 .getIdentity(idkey),
	    messenger = Cc["@mozilla.org/messenger;1"]
					 .createInstance(Ci.nsIMessenger),
	    mime = this.mimeDecoder;

  // THIS FAILS IF MAIL IS OPENED FROM EML FILE:
  let msgDbHdr = null,
      charset,
			hdr = null;
			
  if (gMsgCompose.originalMsgURI.indexOf(".eml")>0) { 
		let messageWindow = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("mail:messageWindow"),
				messageHeaderSink = messageWindow.messageHeaderSink;
		charset = gMsgCompose.compFields.characterSet;
		// with .eml file, use gExpandedHeaderView[hdrName] collection?
		// see also messagepane-loaded event in msgHeaderView
		// see also gMessageDisplay.displayExternalMessage
		// messenger.msgHdrFromURI(sourceUri)
		// messageHeaderSink.dummyMsgHeader  (has author, recipients, subject, deliveredTo, messageId)
		// messageHeaderSink.dummyMsgHeader.__proto__  has more fields, such as flags, datee, ccList, accountKey, listPost, mime2DecodedSubject() getter...)
		msgDbHdr =  messageHeaderSink.dummyMsgHeader;
		try {
			hdr = (composeType != "new") ? new this.clsGetAltHeader(msgDbHdr) : null;
		}
		catch(ex) {
			util.logException('fatal error - clsGetAltHeader() failed', ex);
		}
	}
	else {
		try {
			msgDbHdr = (composeType != "new") ? messenger.msgHdrFromURI(gMsgCompose.originalMsgURI) : null;
			charset = (composeType != "new") ? msgDbHdr.Charset : null;
			// try falling back to folder charset:
			if (!charset && msgDbHdr) {
				msgDbHdr.folder.charset; 
			}
		}
		catch (ex) {
			util.logException('messenger.msgHdrFromURI failed:', ex);
			// doesn't return a header but throws!
			charset = gMsgCompose.compFields.characterSet;
		}
		try {
			hdr = (composeType != "new") ? 
			  new this.classGetHeaders(gMsgCompose.originalMsgURI) : 
				new this.clsGetAltHeader(gMsgCompose.compFields);
		}
		catch(ex) {
			util.logException('fatal error - classGetHeaders() failed', ex);
		}
	}
	// append composeType to hdr class.
	if(hdr) {
		hdr.composeType = composeType;
	}
  
  

  if (prefs.isDebugOption('regularize')) debugger;
	let date = (composeType != "new") ? msgDbHdr.date : null;
	if (composeType != "new") {
		// for Reply/Forward message
		let tz = new function(date) {
			this.str = ("+0000" + date).replace(/.*([+-][0-9]{4,4})/, "$1");
			this.h = this.str.replace(/(.).*/, "$11") * (this.str.substr(1,1) * 10 + this.str.substr(2,1) * 1);
			this.m = this.str.replace(/(.).*/, "$11") * (this.str.substr(3,1) * 10 + this.str.substr(4,1) * 1);
		} (hdr ? hdr.get("Date") : msgDbHdr.date);
	}
	// TokenMap["headerName"] = mail Header
	// TokenMap["reserved"] = ST4 function
	var TokenMap = {};
	// building a hash table?
	// addTokens("header", "reserved word",,,)
	function addTokens() { // build a map
		for (let i = 1; i < arguments.length; i++) {
			TokenMap[arguments[i]] = arguments[0]; // set the type of each token: reserved, To, Cc, Date, From, Subject
		}
	}
	// Reserved words that do not depend on the original message.
	// identity(name) is the new ownname
	// identity(mail) is the new ownmail
	addTokens("reserved", "ownname", "ownmail", "deleteText", "replaceText", "matchTextFromSubject", "matchTextFromBody",
					"Y", "y", "m", "n", "d", "e", "H", "k", "I", "l", "M", "S", "T", "X", "A", "a", "B", "b", "p",
					"X:=today", "X:=calculated", "X:=timezone", "dbg1", "datelocal", "dateshort", "dateformat", "date_tz", "tz_name", "sig", "newsgroup", "cwIso", 
					"cursor", "identity", "quotePlaceholder", "language", "quoteHeader", "smartTemplate", "internal-javascript-ref",
					"messageRaw", "file", "attach", //depends on the original message, but not on any header
          "header.set", "header.append", "header.prefix, header.delete",
					"header.set.matchFromSubject", "header.append.matchFromSubject", "header.prefix.matchFromSubject",
          "header.set.matchFromBody", "header.append.matchFromBody", "header.prefix.matchFromBody"
					);

	// Reserved words which depend on headers of the original message.
	addTokens("To", "to", "toname", "tomail");
	addTokens("Cc", "cc", "ccname", "ccmail");
  addTokens("Date", "X:=sent");
	addTokens("From", "from", "fromname", "frommail");
	addTokens("Subject", "subject");

	/*
	// move to Util.	
	// Convert PRTime to string
	// https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSPR/Reference/PRTime
	// 64bit value, measured in microseconds since NSPR epoch
	function prTime2Str(time, timeType, timezone) {
    ...
	}

	function zoneFromShort(short) {
		...
	}

	function getTimeZoneAbbrev(tm, isLongForm) {
		 ...
	}
	*/
	
	// Replace reserved words
	function replaceReservedWords(dmy, token, arg)	{
	  // calling this function just for logging purposes
		function finalize(tok, s, comment) {
			if (s) {
				let text = "replaceReservedWords( %" + tok + "% ) = " + s;
				if (comment) {
					text += '\n' + comment;
				}
				util.logDebugOptional ('replaceReservedWords', text);
			};
			return s;
		} 
		
    function testHTML(token, arg) {
      if ((token.indexOf('</a>')>=0)    // does token contain HTML link or encoded < >?
        ||
        (token.indexOf('&lt;')>=0)
        ||
        (token.indexOf('&gt;')>=0)
        ||
        (arg && util.isFormatLink(arg) || arg=='(mail)'))
        return true;
      return false;
    }
    
		// duplicate for now
		function matchText(regX, fromPart) {
			try {
				let matchPart = msg.match(regX);
				if (matchPart) {
					if (prefs.isDebugOption('parseModifier')) debugger;
					for (let i=0; i<matchPart.length; i++) {
						util.logDebugOptional('parseModifier','matched variable: ' + matchPart);
						let patternArg = matchPart[i].match(   /(\"[^"].*?\")/   ), // get argument (includes quotation marks) ? for non greedy to match first closing doublequote
								hdr,
								extractSource = '',
								rx = patternArg ? util.unquotedRegex(patternArg[0], true) : ''; // pattern for searching body

						hdr =	(gMsgCompose.originalMsgURI.indexOf(".eml")>0) ?
							new SmartTemplate4.clsGetAltHeader(msgDbHdr) :
							new SmartTemplate4.classGetHeaders(gMsgCompose.originalMsgURI);
						switch(fromPart) {
							case 'subject':
								if (!hdr) {
									util.logToConsole("matchText() - matchTextFromSubject failed - couldn't retrieve header from Uri");
									return "";
								}
								util.addUsedPremiumFunction('matchTextFromSubject');
								let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
										charset = messenger.msgHdrFromURI(gMsgCompose.originalMsgURI).Charset;
								extractSource = SmartTemplate4.mimeDecoder.decode(hdr.get("Subject"), charset);
								util.logDebugOptional('parseModifier',"Extracting " + rx + " from Subject:\n" + extractSource);
								break;
							case 'body':
								let rootEl = gMsgCompose.editor.rootElement;
								// we may still need to remove the div.moz-cite-prefix, let's look for a blockquote
								if (rootEl.childNodes.length) {
									for (let c=0; c<rootEl.childNodes.length; c++ ) {
										let el = rootEl.childNodes[c];
										if (el.tagName && el.tagName.toLowerCase() == 'blockquote') {
											extractSource = el.innerText;  // quoted material
										}
									}
								}
								if (!extractSource)
								  extractSource = rootEl.innerText;
								util.addUsedPremiumFunction('matchTextFromBody');
								util.logDebugOptional('parseModifier',"Extracting " + rx + " from editor.root:\n" + extractSource);
								break;
							default:
								throw("Unknown source type:" + fromPart);
						}
						if (patternArg) {
							let groupArg = matchPart[i].match( /\"\,([0-9]+)/ ), // match group number
									removePat = false;
							if (extractSource) {
								let result = rx.exec(extractSource); // extract Pattern from source
								if (result && result.length) {
									let group = groupArg ? parseInt(groupArg[1]) : 0;
									if (isNaN(group)) group = 0;
									// retrieve the (..) group part from the pattern  - e..g matchTextFromBody("Tattoo ([0-9])",1) => finds "Tattoo 100" => generates "100" (one word)
									util.logDebug('matchText(' + fromPart + ') - Replacing Pattern with:\n'
																+ result[group]);
									if (groupArg==null) { // third parameter is a replacement string
										// check for string arg - after second comma: %header.append.matchFromSubject(hdr,regex,"replaceText"])%
										let commaPos = matchPart[i].lastIndexOf(",\"");
										if (commaPos>0) {
											let thirdArg = matchPart[i].substring(commaPos), // search for end of string ")
											    endPos = thirdArg.indexOf("\")");
											if (endPos>0) {
												let txt = thirdArg.substring(2,endPos);
												return txt;
											}
											else {
												util.logToConsole("replaceText - last string parameter is not well formed.");
												return ""; // not well formed
											}
										} 
									}									
									return result[group];
								}
								else
									removePat = true;
									return "";
							}
							else removePat = true;
							if(removePat) {
								util.logDebug("pattern not found in " + fromPart + ":\n" + regX);
								return "";
							}
						} 
					}
				} // matches loop
			}	
			catch	(ex) {
				util.logException('matchText(' + regX + ', ' + fromPart +') failed:', ex);
			}
			return "";
		}
		
		// modify a number of header with either a string literal 
		// or a regex match (depending on matchFunction argument)
		// hdr: "subject" | "to" | "from" | "cc" | "bcc" | "reply-to"
		// cmd: "set" | "prefix" | "append" | "delete"
		// argString: 
		// matchFunction: "" | "matchFromSubject" | "matchFromBody"
    function modifyHeader(hdr, cmd, argString, matchFunction) {
      const whiteList = ["subject","to","from","cc","bcc","reply-to"],
            ComposeFields = gMsgCompose.compFields;
						
			if (prefs.isDebugOption('headers')) debugger;			
			util.addUsedPremiumFunction('header.' + cmd);
      let targetString = '',
          modType = '',
          argument = argString.substr(argString.indexOf(",")+1); 
			switch (matchFunction) {
				case "": // no matchFunction, so argString is literal
					argument = argument.substr(1, argument.lastIndexOf(")")-2);
				  break;
				case "matchFromSubject":
				case "matchFromBody":
					let regX = new RegExp("%header." + cmd + "." + matchFunction + "\(.*\)%", "g");
					
					if (matchFunction == 'matchFromBody') {
						// Insert replacement from body of QUOTED email!
						argument = matchText(regX, 'body');
					}
					else  {
						// Insert replacement from subject line
						argument = matchText(regX, 'subject');
					}
					// if our match returns nothing, then do nothing (prevent from overwriting existing headers).
					if (argument == '') return '';
				  break;
				default:
          util.logToConsole("invalid matchFunction: " + matchFunction);
          return '';
			}
      try {
        util.logDebug("modifyHeader(" + hdr +", " + cmd + ", " + argument+ ")");
        if (whiteList.indexOf(hdr)<0) {
          util.logToConsole("invalid header - no permission to modify: " + hdr + 
					  "\nSupported headers: " + whiteList.join(', '));
          return '';
        }
        // get
        modType = 'address';
        switch (hdr) {
          case 'subject':
            targetString = ComposeFields.subject;
            modType = 'string';
            break;
          case 'to':
            targetString = ComposeFields.to;
            break;
          case 'cc':
            targetString = ComposeFields.cc;
            break;
          case 'bcc':
            targetString = ComposeFields.bcc;
            break;
          case 'from':
            targetString = ComposeFields.from;
            break;
          case 'reply-to':
            targetString = ComposeFields.replyTo;
            break;
          default:
            modType = '';
            break;
        }
        // modify
        switch (modType) {
          case 'string': // single string
            switch (cmd) {
              case 'set':
                targetString = argument; 
                break;
              case 'prefix':
                let replyPrefix = targetString.lastIndexOf(':'),
                    testSubject = targetString;
                if (replyPrefix>0) { // caveat: won't work well if subject also contains a ':'
                  // cut off Re: Fwd: etc.
                  testSubject = targetString.substr(0, replyPrefix).trim();
                  if (testSubject.indexOf(argument)>=0) break; // keyword is (anywhere) before colon?
                  // cut off string after last prefix to restore original subject
                  testSubject = targetString.substr(replyPrefix+1).trim(); // where we can check at the start...
                }
                // keyword is immediately after last colon, or start of original subject
                if (testSubject.indexOf(argument)!=0)  { // avoid duplication!
                  targetString = argument + targetString; 
                }
                break;
              case 'append':
                // problem - if there are encoding breaks, will this comparison fail?
                let argPos = targetString.toLowerCase().trim().lastIndexOf(argument.toLowerCase().trim()); // avoid duplication
                if (argPos < 0 || argPos < targetString.length-argument.length ) 
                  targetString = targetString + argument; 
                break;
							case 'delete': // remove a substring, e.g. header.delete(subject,"(re: | Fwd: ")
							  let pattern = util.unquotedRegex(argument, true);
							  targetString = targetString.replace(pattern,"").replace(/\s+/g, ' '); // remove and then collapse multiple white spaces
							  break;
            }
            break;
          case 'address': // address field
            switch (cmd) {
              case 'set': // overwrite address field
                targetString = argument.toString(); 
                break;
              case 'prefix':
                // targetString = argument.toString() + ' ' + targetString; 
                // invalid!
                break;
              case 'append': // append an address field (if not contained already)
                             // also omit in Cc if already in To and vice versa
                if (hdr=='cc' && ComposeFields.to.toLowerCase().indexOf(argument.toLowerCase())>=0)
                  break;
                if (hdr=='to' && ComposeFields.cc.toLowerCase().indexOf(argument.toLowerCase())>=0)
                  break;
                
                if (targetString.toLowerCase().indexOf(argument.toLowerCase())<0) {
                  targetString = targetString + ', ' + argument; 
                }
                break;
            }
            break;
        }
        
        // set
        // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIMsgCompFields
        switch (hdr) {
          case 'subject':
					  // replace newline characters with spaces and trim result!
					  let subjectString = targetString.replace(new RegExp("[\t\r\n]+", 'g'), " ").trim();
            document.getElementById("msgSubject").value = subjectString;
            ComposeFields.subject = subjectString;
            break;
          case 'to':
            ComposeFields.to = targetString;
            break;
          case 'cc':
            ComposeFields.cc = targetString;
            break;
          case 'bcc':
            ComposeFields.bcc = targetString;
            break;
          case 'from':
            ComposeFields.from = targetString;
            break;
          case 'reply-to':
            ComposeFields.replyTo = targetString;
            break;
        }
        // try to update headers - ComposeFieldsReady()
        // http://mxr.mozilla.org/comm-central/source/mail/components/compose/content/MsgComposeCommands.js#3971
        if (modType == 'address')
          CompFields2Recipients(ComposeFields);
      }
      catch(ex) {
        util.logException('modifyHeader()', ex);
      }
      return ''; // consume
    }
    
		function checkIsURLencoded(tok) {
			debugger;
			if (tok.length>=4) {
				let t = tok.substr(1,2);
				if (/[0-9a-fA-F]+/.test(t)) {
					return true;
				}
			}
			return false;
		}
					

		let originalToken = token;
		
    let tm = new Date(),
		    d02 = function(val) { return ("0" + val).replace(/.(..)/, "$1"); },
		    expand = function(str) { return str.replace(/%([\w-]+)%/gm, replaceReservedWords); };
		if (!SmartTemplate4.calendar.bundle)
			SmartTemplate4.calendar.init(null); // default locale
		let cal = SmartTemplate4.calendar,
		    nativeUtcOffset = tm.getTimezoneOffset(); // UTC offset for current time,  in minutes

		
		// what if we go over date boundary? (23:59)
		let msOffset = (SmartTemplate4.whatIsHourOffset ? SmartTemplate4.whatIsHourOffset*60*60*1000 : 0)
		               + (SmartTemplate4.whatIsMinuteOffset ?  SmartTemplate4.whatIsMinuteOffset*60*1000 : 0),
		    dayOffset = SmartTemplate4.whatIsDateOffset;
				
		if (SmartTemplate4.whatIsTimezone) {
			let forcedTz = util.getTimezoneOffset(SmartTemplate4.whatIsTimezone);
			msOffset = msOffset + forcedTz*60*60*1000 - nativeUtcOffset*60*1000;
			util.logDebug("Adding timezone offsets:\n" +
			  "UTC Offset: " + nativeUtcOffset/(-60) + "\n" +
				"Forced Timezone:" + forcedTz);
		}
		
		// date is sent date when replying!
		// in new mails or if offset is applied we use dateshort
		if (msOffset || dayOffset || (util.getComposeType()=='new')) {
			if (token=="date") 
				token = "dateshort";
		}
		
		// Set %A-Za-z% to time of original message was sent.
		if (SmartTemplate4.whatIsX == SmartTemplate4.XisSent) 
			tm.setTime((date / 1000) + msOffset);
		else
			tm.setTime(tm.getTime() + msOffset);
		
		// note: date variable comes from header!
		if (dayOffset) {
			tm.setDate(tm.getDate() + dayOffset);
		}

		let debugTimeStrings = (prefs.isDebugOption('timeStrings'));
		if (!arg) arg='';
		try {
			// for backward compatibility
			switch (token) {
				case "fromname":  token = "From"; arg = "(name)";   break;
				case "frommail":  token = "From"; arg = "(mail)";   break;
				case "toname":    token = "To";   arg = "(name)";   break;
				case "tomail":    token = "To";   arg = "(mail)";   break;
				case "ccname":    token = "Cc";   arg = "(name)";   break;
				case "ccmail":    token = "Cc";   arg = "(mail)";   break;
			}

      if (prefs.isDebugOption('tokens') && token != "X:=today") debugger;
			let isUTC = SmartTemplate4.whatIsUtc, params;
			switch(token) {
				case "deleteText": // return unchanged
				case "replaceText": // return unchanged
				case "matchTextFromSubject": // return unchanged
				case "matchTextFromBody": // return unchanged
					return '%' + token + arg + '%';
				case "dateformat":
					tm = new Date();
					let defaultTime = util.dateFormat(tm.getTime() * 1000, arg, 0);
				  token = util.wrapDeferredHeader(token + arg, defaultTime,  gMsgCompose.composeHTML, (util.getComposeType()=='new'));
					return token; 
				case "datelocal":
				case "dateshort":
				  if (debugTimeStrings) debugger;
					if (SmartTemplate4.whatIsX == SmartTemplate4.XisToday) {
						tm = new Date(); // undo offset for this case.
						token = util.prTime2Str(tm.getTime() * 1000, token, 0);
						return finalize(token, SmartTemplate4.escapeHtml(token));
					}
					else {
						token = util.prTime2Str(date, token, 0);
						return finalize(token, SmartTemplate4.escapeHtml(token));
					}
				case "timezone":
				case "date_tz":
					let matches = tm.toString().match(/([+-][0-9]{4})/);
					return finalize(token, SmartTemplate4.escapeHtml(matches[0]));
				// for Common (new/reply/forward) message
				case "ownname": // own name
					token = identity.identityName.replace(/\s*<.*/, "");
					break;
				case "ownmail": // own email address
					token = identity.email;
					break;
				case "smartTemplate":  // currently only useful when put into a Stationery template.
				  return   "<span class=\"smartTemplate-placeholder\"></span>";
				case "quoteHeader":  // currently only useful when put into a Stationery template.
				  return   "<span class=\"quoteHeader-placeholder\"></span>";
				case "quotePlaceholder":  // currently only useful when put into a Stationery template.
          // apparently Stationery inserts the blockquote after
          // <span class="quoteHeader-placeholder"></span> <br>
				  return   "<span stationery=\"content-placeholder\">"
					       +   "<blockquote type=\"cite\"> ... "
								 +   "</blockquote>"
							   + "</span>";
				  break;
				case "T": // today
				case "X":                               // Time hh:mm:ss
					return finalize(token, expand("%H%:%M%:%S%"));
				case "y":                               // Year 13... (2digits)
				case "Y":                               // Year 1970...
				  if (debugTimeStrings) debugger;
				  let year = isUTC ? tm.getUTCFullYear().toString() : tm.getFullYear().toString();
					if (token=="y")
						return finalize(token, "" + year.slice(year.length-2), "tm.getFullYear.slice(len-2)");
					return finalize(token, "" + year, "tm.getFullYear");
				case "n":                               // Month 1..12
				case "m":                               // Month 01..12
				case "B": 
				case "b":
				  if (debugTimeStrings) debugger;
				  let month = isUTC ? tm.getUTCMonth() : tm.getMonth();
					switch(token) {
						case "n":
						  return finalize(token, "" + (month+1), "tm.getMonth()+1");
						case "m":
						  return finalize(token, d02(month+1), "d02(tm.getMonth()+1)");
						case "B":
						  return finalize(token, cal.monthName(month), "cal.monthName(" + month +")");   // locale month
						case "b":
						  return finalize(token, cal.shortMonthName(month), "cal.shortMonthName(" + month +")");   // locale month (short)
					}
					break;
				case "e":                               // Day of month 1..31
				case "d":                               // Day of month 01..31
				  if (debugTimeStrings) debugger;
					let day = isUTC ? tm.getUTCDate() : tm.getDate();
					switch(token) {
						case "e":
						  return finalize(token, "" + day, "tm.getDate(" + day + ")");
						case "d":
						  return finalize(token, d02(day), "d02(" + day + ")");
					}
					break;
				case "A":                               // name of day 
				case "a":
				  if (debugTimeStrings) debugger;
				  let weekday = tm.getDay();
					switch(token) {
						case "A":
						  return finalize(token, cal.dayName(weekday), "cal.dayName(" + weekday + ")");       // locale day of week
						case "a":
							return finalize(token, cal.shortDayName(weekday), "cal.shortDayName(" + weekday + ")");  // locale day of week(short)
					}
					break;
				case "k":                               // Hour 0..23
				case "H":                               // Hour 00..23
				case "l":                               // Hour 1..12
				case "I":                               // Hour 01..12
				case "p":
					if (debugTimeStrings) debugger;
				  let hour = isUTC ? tm.getUTCHours() : tm.getHours();
					switch(token) {
						case "k":
							return finalize(token, "" + hour, "tm.getHours()");
						case "H":
							return finalize(token, d02(hour), "d02(tm.getHours()");
						case "l":
							return finalize(token, "" + (((hour + 23) % 12) + 1));
						case "I":
							return finalize(token, d02(((hour + 23) % 12) + 1));
						case "p":
							switch (arg) {
								case "(1)":
									return finalize(token + "(1)", hour < 12 ? "a.m." : "p.m."); // locale am or pm
								case "(2)":
									return finalize(token + "(2)", hour < 12 ? "A.M." : "P.M."); // locale am or pm
								case "(3)":
								default:
									return finalize(token, hour < 12 ? "AM" : "PM");     // locale am or pm
							}
			    }
					break;
				case "M":                               // Minutes 00..59
				  if (debugTimeStrings) debugger;
				  let minute = isUTC ? tm.getUTCMinutes() : tm.getMinutes();
					return finalize(token, d02(minute), "d02(tm.getMinutes())");
				case "S":                               // Seconds 00..59
					return finalize(token, d02(tm.getSeconds()), "d02(tm.getSeconds())");
				case "tz_name":                         // time zone name (abbreviated) tz_name(1) = long form
				  if (isUTC) return "(UTC)";
					return finalize(token, util.getTimeZoneAbbrev(tm, (arg=="(1)")), "getTimeZoneAbbrev(tm, " + (arg=="(1)") + ")");
				case "sig":
				  if (arg && arg.indexOf('none')>=0) return "";
					let isRemoveDashes = arg ? (arg=="(2)") : false;
          let retVal;
				  if (isStationery) {
            retVal = '<sig class="st4-signature" removeDashes=' + isRemoveDashes + '>' + dmy + '</sig>' // 
					}
          else {
					  // BIG FAT SIDE EFFECT!
						if (prefs.isDebugOption('composer')) debugger;
            let rawsig = util.getSignatureInner(SmartTemplate4.signature, isRemoveDashes);
						retVal = SmartTemplate4.smartTemplate.getProcessedText(rawsig, idkey, composeType, true);
            if (!retVal) retVal=''; // empty signature
            util.logDebugOptional ('replaceReservedWords', 'replaceReservedWords(%sig%) = getSignatureInner(isRemoveDashes = ' + isRemoveDashes +')');
          }
          util.logDebugOptional ('signatures', 'replaceReservedWords sig' + arg + ' returns:\n' + retVal);
					return retVal;
				case "subject":
					let current = (arg=="(2)"),
					    ret = getSubject(current);
					if (!current)
						ret = SmartTemplate4.escapeHtml(ret);
					return finalize(token, ret);
				case "newsgroup":
					return finalize(token, getNewsgroup());
				case "language":
				  SmartTemplate4.calendar.init(arg.substr(1,arg.length-2)); // strip ( )
					return "";
				case "dbg1":
					return finalize(token, cal.list());
				case "cwIso": // ISO calendar week [Bug 25012]
					let offset = parseInt(arg.substr(1,1)); // (0) .. (6) weekoffset: 0-Sunday 1-Monday
					return finalize(token, "" + util.getIsoWeek(tm, offset));
				// Change time of %A-Za-z%
				case "X:=sent":
				  if (debugTimeStrings) debugger;
					SmartTemplate4.whatIsX = SmartTemplate4.XisSent;
					SmartTemplate4.whatIsUtc = (arg && arg=='(UTC)');
					util.logDebugOptional ('replaceReservedWords', "Switch: Time = SENT - UTC = " + SmartTemplate4.whatIsUtc);
					return "";
				case "X:=today":
				  if (debugTimeStrings) debugger;
					SmartTemplate4.whatIsX = SmartTemplate4.XisToday;
					SmartTemplate4.whatIsUtc = false;
					//util.logDebugOptional ('replaceReservedWords', "Switch: Time = NOW");
					return "";
				case "X:=calculated":  // calculated(numberOfDays)
				  if (debugTimeStrings) debugger;
					params = arg.substr(1,arg.length-2).split(',');
				  let dateOffset = (params.length>0) ? parseInt(params[0] || "0" ) : 0,
							tOffset = (params.length>1) ? params[1] : "00:00";
					let hm = tOffset.split(':'),
					    hourOffset = parseInt(hm[0]),
							minOffset = (hm.length>1) ? parseInt(hm[1]) : 0; // reset wit calculated(0)
				  SmartTemplate4.whatIsDateOffset = dateOffset;
				  SmartTemplate4.whatIsHourOffset = hourOffset;
					SmartTemplate4.whatIsMinuteOffset = minOffset;
					
					util.logDebugOptional ('timeStrings', "Setting date offset to " + dateOffset + " days, " + hourOffset + ":" + minOffset + " hours.");
					return "";
				case "X:=timezone":
				  if (debugTimeStrings) debugger;
					params = arg.substr(1,arg.length-2).split(',');
				  SmartTemplate4.whatIsTimezone = params[0];
				  return "";
				case "cursor":
					util.logDebugOptional ('replaceReservedWords', "%Cursor% found");
					//if(isStationery)
					//	return dmy;
					return '<span class="st4cursor">&nbsp;</span>'; 
			  case "internal-javascript-ref":
			    return javascriptResults[/\((.*)\)/.exec(arg)[1]];
				// any headers (to/cc/from/date/subject/message-id/newsgroups, etc)
				case "messageRaw": //returns the arg-th first characters of the content of the original message
				  return hdr.content(arg?/\((.*)\)/.exec(arg)[1]*1:2048);
				case "attach":
					util.addUsedPremiumFunction('attach');
          attachFile(arg);
					return "";
        case "file":
					util.addUsedPremiumFunction('file');
					// do not process images that are returned - insertFileLink will already turn them into a DataURI
          let fileContents = insertFileLink(arg),
              parsedContent = fileContents.startsWith("<img") 
							  ? fileContents
							  : SmartTemplate4.smartTemplate.getProcessedText(fileContents, idkey, composeType, true);
          return parsedContent;
				case "identity":
				  /////
          if (identity.fullName && identity.email) {
            let fullId = identity.fullName + ' <' + identity.email + '>';
            // we need the split to support (name,link) etc.
            token = mime.split(fullId, charset, arg, true); // disable charsets decoding!
            // avoid double escaping
            if (testHTML(token, arg))
              return token;
          }
          else {
            logDebug("Problem with identity:\n" +
                     "fullName = " + identity.fullName +"\n" +
                     "email = " + identity.email);
            return "identity - undefined";
          }
					break;
				default:
          // [Bug 25904]
          if (token.indexOf('header')==0) {
            let args = arg.split(","),
                modHdr = args.length ? args[0].toLowerCase().substr(1) : ''; // cut off "("
            if (args.length<2) {
              util.logToConsole("modifyHeader() second parameter missing");
              return '';
            }
						let toks = token.split("."),
						    matchFunction = toks.length>2 ? toks[2] : ""; // matchFromSubject | matchFromBody
            switch (toks[1]) {
              case "set": // header.set
                return modifyHeader(modHdr, 'set', arg, matchFunction);
              case "append":
                return modifyHeader(modHdr, 'append', arg, matchFunction);
              case "prefix":
                return modifyHeader(modHdr, 'prefix', arg, matchFunction);
              case "delete":
								if (prefs.isDebugOption('parseModifier')) debugger;
                modifyHeader(modHdr, 'delete', arg, ''); // no match function - this works within the same header (e.g. subject)
								return '';
              default: 
                util.logToConsole("invalid header command: " + token);
                return '';
            }
          }
					let isStripQuote = RegExp(" " + token + " ", "i").test(
					                   " Bcc Cc Disposition-Notification-To Errors-To From Mail-Followup-To Mail-Reply-To Reply-To" +
					                   " Resent-From Resent-Sender Resent-To Resent-cc Resent-bcc Return-Path Return-Receipt-To Sender To "),
              theHeader = hdr.get(token),
							isFwdArg = false;
							
					if (util.getComposeType()=='fwd') {
						let fmt = util.splitFormatArgs(arg); // returns array of { field: "fwd", modifier: "" }
						// e.g. %to(firstname,fwd)%
						for (let i=0; i<fmt.length; i++) {
							if (fmt[i].field == 'fwd') {
								isFwdArg = true;
								break;
							}
						}
					} 
					
					// wrap variables that can't be resolved at the moment
					if (typeof theHeader == "undefined" || isFwdArg) {
						if (!arg) arg='';
							
						if (!util.checkIsURLencoded(token)) {
							token = util.wrapDeferredHeader(token + arg, (isStripQuote ? "" : "??"), gMsgCompose.composeHTML, (util.getComposeType()=='new'));
						}
						return token; // this is HTML: we won't escape it.
					}
					// <----  early exit for non existent headers, e.g. "from" in Write case
					else {
						// make sure empty header stays empty for this special case
						if (!theHeader && RegExp(" " + token + " ", "i").test(" Bcc Cc "))
							return '';
					}
					if (token=="date" && isUTC) {
						if (debugTimeStrings) debugger;
						try {
							let x = new Date(theHeader);
							theHeader = x.toUTCString();
						}
						catch(ex) {
							util.logException('Cannot convert date to UTC: ' + token, ex);
						}
					}
					let headerValue = isStripQuote ?
					    mime.split(theHeader, charset, arg) :
							mime.decode(theHeader, charset);
					// allow HTML as to(link) etc. builds a href with mailto
					if (testHTML(headerValue, arg)) // avoid double escaping
						return headerValue;
					token = headerValue;
					break;
			}
		}
		catch(ex) {
			util.logException('replaceReservedWords(dmy, ' + token + ', ' + arg +') failed - unknown token?', ex);
			if (!util.checkIsURLencoded(token))
				token = util.wrapDeferredHeader(token + arg, "??", gMsgCompose.composeHTML);
			else
				return token;
		}
		return SmartTemplate4.escapeHtml(token);
	} // end of replaceReservedWords  (longest add-on function written ever)
	
  // [Bug 25871]
  function insertFileLink(txt) {
    util.logDebug("insertFileLink " + txt);
    // determine file type:
    let html,
        arr = txt.substr(1,txt.length-2).split(','),  // strip parentheses and get optional params
        path = arr[0],
        type = path.toLowerCase().substr(path.lastIndexOf('.')+1);
    if (type.match( /(png|apng|jpg|jpeg|jp2k|gif|tif|bmp|dib|rle|ico|svg|webp)$/))
      type='image';
    util.logDebug("insertFile - type detected: " + type);
    switch(type) {
      case 'htm':
      case 'html':
      case 'txt':
        // find / load file and expand?
        let data = "",
            //read file into a string so the correct identifier can be added
            fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream),
            cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream),
            countRead = 0;
        //let sigFile = Ident.signature.QueryInterface(Ci.nsIFile); 
        try {
          let FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils,
              isFU = FileUtils && FileUtils.File,
              localFile = isFU ?   // not in Postbox
                          new FileUtils.File(path) :
                          Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile),
              str = {};
          util.logDebug("localFile.initWithPath(" + path + ")");
          if (!isFU)
            localFile.initWithPath(path);
          
          fstream.init(localFile, -1, 0, 0);
          /* sigEncoding: The character encoding you want, default is using UTF-8 here */
          let encoding = (arr.length>1) ? arr[1] : 'UTF-8';
          util.logDebug("initializing stream with " + encoding + " encoding...");
          cstream.init(fstream, encoding, 0, 0);
          let read = 0;
          do {
            read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
            data += str.value;
            countRead += read;
          } while (read != 0);
          cstream.close(); // this closes fstream
          html = data.toString();
					// if we compose in html and file is txt we need to replace all line breaks with <br>
					if (type=='txt') {
						html = html.replace(/(?:\r\n|\r|\n)/g, '<br>');
					}
        }
        catch (ex) {
          util.logException("insertFileLink() - read " + countRead + " characters.", ex);
          if (countRead) {
            html = data.toString();
          }
          else
            html = "<div style='border:1px solid #DDDDDD; color:#CCCCCC; background-color: #AA0000; max-width:600px;'> Error reading file: " + path + "<br>"
                   + "Please check error console for detail</div>";
        }
        break;
      case 'image':
        let alt = (arr.length>1) ? 
                  (" alt='" + arr[1].replace("'","") + "'") :    // don't escape this as it should be pure text. We cannot accept ,'
                  "",
						filePath = "file:///" + path.replace('\\','/');
				// change to data URL
				filePath = util.getFileAsDataURI(filePath)
        html = "<img src='" + filePath + "'" + alt + " >";
        break;
      default:
        alert('unsupported file type in %file()%: ' + type + '.');
        html='';
        break;
    }
    return html;
  } 
  
	// [Bug 26552] find the file and add it to the attachments pane
	function attachFile(args) {
		const util = SmartTemplate4.Util,
		      Ci = Components.interfaces,
					Cc = Components.classes,
					{OS} = (typeof ChromeUtils.import == "undefined") ?
						Cu.import("resource://gre/modules/osfile.jsm", {}) :
						ChromeUtils.import("resource://gre/modules/osfile.jsm", {});
						
    let arr = args.substr(1,args.length-2).split(','),  // strip parentheses and get optional params
        pathUri = arr[0],
		    composerWin = Cc["@mozilla.org/appshell/window-mediator;1"]
		      .getService(Ci.nsIWindowMediator).getMostRecentWindow("msgcomposeWindow") || window,
		    attachments=[];
		try {
			// https://dxr.mozilla.org/comm-central/source/mail/components/compose/content/MsgComposeCommands.js#2508
			/*
			let nsFile = Services.io.getProtocolHandler("file")
				.QueryInterface(Ci.nsIFileProtocolHandler)
				.getFileFromURLSpec(uri); // img.src
			*/
				
			let FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
			
			if (!FileUtils) {
				alert("No FileUtils in this platform - %attach% is not supported. Are you on an old version of " + util.Application + "?");
				return;
			}
      let localFile = new FileUtils.File(pathUri);				
			
			if (!localFile.exists()) {
				alert("file not found: " + pathUri);
				return;
			}
			
			let contentType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(localFile),
			    attachment = Cc["@mozilla.org/messengercompose/attachment;1"].createInstance(Ci.nsIMsgAttachment);
			// from https://dxr.mozilla.org/comm-central/source/mail/components/compose/content/MsgComposeCommands.js#2721
			// if (nsFile instanceof Ci.nsIFile) {..}
			attachment.url = "file://" + localFile.path;
			attachment.contentType = contentType;
			attachment.name = localFile.leafName;
			
			attachments = [attachment]; // make a 1 member array of nsIMsgAttachment
			composerWin.AddAttachments(attachments);
			
			
		}
		catch(ex) {
			util.logException("attachFile(" + pathUri + ")", ex);
		}
	}
	
	let sandbox;
	// [Bug 25676]	Turing Complete Templates - Benito van der Zander
  // https://www.mozdev.org/bugs/show_bug.cgi?id=25676
	// we are allowing certain (string) Javascript functions in concatenation to our %variable%
	// as long as they are in a script block %{%    %}%
	// local variables can be defined within these blocks, only 1 expression line is allowed per block,
	// hence best to wrap all code in (function() { ..code.. })()  
  // function must return "" in order not to insert an error
	function replaceJavascript(dmy, script) {
    util.logDebugOptional('sandbox', 'replaceJavascript(' + dmy +', ' + script +')');
	  if (!sandbox) {
	    sandbox = new Cu.Sandbox(
        window,
        {
        //  'sandboxName': aScript.id,
          'sandboxPrototype': window,
          'wantXrays': true
        });
        
      //useful functions (especially if you want to change the template depending on the received message)
      sandbox.choose = function(a){return a[Math.floor(Math.random()*a.length)]};
      sandbox.String.prototype.contains = function(s, startIndex){return this.indexOf(s, startIndex) >= 0};
      sandbox.String.prototype.containsSome = function(a){return a.some(function(s){return this.indexOf(s) >= 0}, this)};
      sandbox.String.prototype.count = function(s, startIndex){
        let count = 0; 
        let pos = this.indexOf(s, startIndex);
        while (pos != -1) { 
          count += 1; 
          pos = this.indexOf(s, pos + 1);
        }
        return count;
      };        
      sandbox.variable = function(name, arg) {
        arg = arg || "";
        if (prefs.isDebugOption('sandbox')) debugger;
        let retVariable = replaceReservedWords("", name, arg || "");
        util.logDebugOptional('sandbox','variable(' + name + ', ' + arg +')\n'
          + 'returns: ' + retVariable);
        return retVariable;
      };
      var implicitNull = {},
          stringFunctionHack = new Function(),
			// overloading our strings using sandbox
          props = ["charAt", "charCodeAt", "concat", "contains", "endsWith", "indexOf", "lastIndexOf", "localeCompare", "match", "quote", "repeat", "replace", "search", "slice", "split", "startsWith", "substr", "substring", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toUpperCase", "trim", "trimLeft", "trimRight",  "contains", "containsSome", "count"];
      for (let i=0; i<props.length; i++) {
        let s = props[i];
        stringFunctionHack[s] = sandbox.String.prototype[s];
      }
      stringFunctionHack.valueOf = function(){ return this(implicitNull); };
      stringFunctionHack.toString = function(){ return this(implicitNull); };
        
      for (let name in TokenMap) {
        sandbox[name] = (function(aname) {
					return function(arg){
            if (prefs.isDebugOption('sandbox')) debugger;
						if (typeof arg === "undefined") {
              util.logDebugOptional('sandbox','sandbox[] arg undefined, returning %' + aname +'()%');
              return "%"+aname + "()%"; //do not allow name() 
            }
						if (arg === implicitNull) arg = "";
						else arg = "("+arg+")";    //handles the case %%name(arg)%% and returns the same as %name(arg)%
            let sbVal = replaceReservedWords("", aname, arg);
            util.logDebugOptional('sandbox','sandbox[' + aname +'] returns:' + sbVal);
						return sbVal;
					};
				})(name);
        sandbox[name].__proto__ = stringFunctionHack; //complex hack so that sandbox[name] is a function that can be called with (sandbox[name]) and (sandbox[name](...))
        //does not work:( sandbox[name].__defineGetter__("length", (function(aname){return function(){return sandbox[aname].toString().length}})(name));
      }  // for
	  };  // (!sandbox)
	  //  alert(script);
	  var x;
	  try {
      if (prefs.isDebugOption('sandbox')) debugger;
	    x = Cu.evalInSandbox("(" + script + ").toString()", sandbox); 
			//prevent sandbox leak by templates that redefine toString (no idea if this works, or is actually needed)
	    if (x.toString === String.prototype.toString) {
			  x = x.toString(); 
			}
	    else { 
			  x = "security violation";
			}
	  } 
		catch (ex) {
	    x = "ERR: " + ex;
	  }
	  javascriptResults.push(x);
	  return "%internal-javascript-ref("+(javascriptResults.length-1)+")%"; //todo: safety checks (currently the sandbox is useless)
	}
	
	//process javascript insertions first, so the javascript source is not broken by the remaining processing
	let javascriptResults = []; //but cannot insert result now, or it would be double html escaped, so insert them later
	msg = msg.replace(/%\{%((.|\n|\r)*?)%\}%/gm, replaceJavascript); // also remove all newlines and unnecessary white spaces
	
	/*  deprecating bs code. */
	if (prefs.getMyBoolPref('xtodaylegacy')) {
		//Now do this chaotical stuff:
		//Reset X to Today after each newline character
		//except for lines ending in { or }; breaks the omission of non-existent CC??
		msg = msg.replace(/\n/gm, "%X:=today%\n");
		//replace this later!!
		// msg = msg.replace(/{\s*%X:=today%\n/gm, "{\n");
		// msg = msg.replace(/}\s*%X:=today%\n/gm, "}\n");
		msg = msg.replace(/\[\[\s*%X:=today%\n/gm, "[[\n");
		msg = msg.replace(/\]\]\s*%X:=today%\n/gm, "]]\n");
	}
	
	
	// ignoreHTML, e,g with signature, lets not do html processing
	if (!ignoreHTML) {
		// for Draft, let's just assume html for the moment.
		if (isDraftLike) {
			msg = msg.replace(/( )+(<)|(>)( )+/gm, "$1$2$3$4");
			if (SmartTemplate4.pref.isReplaceNewLines(idkey, composeType, false))   // [Bug 25571] let's default to NOT replacing newlines. Common seems to not save the setting!
				{ msg = msg.replace(/>\n/gm, ">").replace(/\n/gm, "<br>"); }
			//else
			//	{ msg = msg.replace(/\n/gm, ""); }
		} else {
			msg = SmartTemplate4.escapeHtml(msg);
			// Escape space, if compose is HTML
			if (gMsgCompose.composeHTML)
				{ msg = msg.replace(/ /gm, "&nbsp;"); }
		}
	}
  // replace round brackets of bracketMail() with <> - using the second (=inner) match group
  // this makes it possible to nest functions!
  // [Bug 26100] bracketMail wasn't working in optional [[ cc ]] block.
	msg = msg.replace(/(bracketMail\(([^)]*))\)/gm, "bracketMail\<$2\>");
	msg = msg.replace(/(bracketName\(([^)]*))\)/gm, "bracketName\<$2\>");
	// AG: remove any parts ---in curly brackets-- (replace with  [[  ]] ) optional lines
	msg = simplify(msg);	
  if (prefs.isDebugOption('regularize')) debugger;
  msg = msg.replace(/%([\w-:=.]+)(\([^%]+\))*%/gm, replaceReservedWords); // added . for header.set / header.append / header.prefix
	                                                                        // replaced ^) with ^% for header.set.matchFromSubject
	
	if (sandbox) Cu.nukeSandbox(sandbox);

  // dump out all headers that were retrieved during regularize  
  util.logDebugOptional('headers', SmartTemplate4.regularize.headersDump);
	util.logDebugOptional('regularize',"SmartTemplate4.regularize(" + msg + ")  ...ENDS");
	return msg;
}; // regularize


