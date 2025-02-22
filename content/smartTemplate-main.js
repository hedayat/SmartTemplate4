"use strict";
/* 
BEGIN LICENSE BLOCK

	SmartTemplate⁴ is released under the Creative Commons (CC BY-ND 4.0)
	Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
	For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


/* Version History  (chronological)

  Version 0.7.4 - Released 09/08/2011
	  # Supports: Tb 1.5 - 8.0a1
	  # Originally the X:=sent switch would change all variables after it's use for the remainder of the template unless X:=today was used 
		  to switch them back. That behavior is now changed such that the X:=sent command only affects the line on which it is being used.
		# %datelocal%, %dateshort%, %date_tz% are now affected by the X:=sent and X:=today variables.
		# fix CC line inner Brackets
				
  Version 0.7.5 - Released 28/08/2011
		# Supports: 1.5 - 8.0a1
    # Some users reported subject lines not being displayed correctly. Specifically there were line breaks causing the subject to span more than one line. This could also occur with other  headers but subject was the only one reported.
    # corrected issue where headers longer than 4096 were being truncated.
    # An option was added in settings called "Use OS date/time format instead of Thunderbird".
          Some users reported that SmartTemplate⁴ was not using the custom date format they had set in their operating system.
    # updated all helpfiles 'added recent changes'
    # implemented some coding changes suggested by the Mozilla AMO review team.
		
  Version 0.7.6 - Released 09/09/2011
		# Supports: Tb 1.5 - 8.0a1
    # Fixed issue if %datelocal% variable is used for new messages
    # a lot of small fixes
    # changes in locale pt-BR
    
  Version 0.7.7 - Released 04/11/2011
	  # Supports: Tb 1.5 - 10.0a1
    # where reply header was being put above the signature when signature is placed 'above the quote'.
    # automatically add line break in message compose window
    # %date_tz% variable was returning the local timezone instead of the senders timezone.
    # removed the 'automatically add two line breaks' that was added in 0.7.6. This affected many users and the correct way to add line breaks at the top of your message is to include them in your template.
  
  Version 0.7.8 - Released 04/11/2011
	  # Supports: Tb 1.5 - 10.0a1
		#  paste an list of all variables and in which case they can be used to all help files.
    #  SmartTemplate⁴ no longer crashes when variables are used incorrectly; an error is logged to the Error Console.
    # added a new variable %sig% to allow users to put their signature where it should be placed in the template. If %sig% is not defined in the template it will be placed in the default Thunderbird location (above reply or below reply based on TB settings). 'Include Signature on Reply/Forward" must be checked in Thunderbird options for the %sig% to work as expected.
    # added a new option to variable %subject% to show the subject of the message being replied to/forwarded or the subject of the current message being composed
    # %tz_name% variable has been added but it is system dependent and will have limited support. Some users will see abbreviated time zone names (EST, CDT) and some will see long names(Eastern Standard Time...) and some will not have any return depending on their operating system or the mailserver of the email being replied to.
    
	Version 0.7.9 - Released 24/12/2011
	  # Supports: Tb 1.5 - 12.0a1
		# corrected incorrect file encodings on many locale files. Incorrectly encoded errors.properties files caused ST4 to crash this has also been corrected.

  Version 0.8.0 - Released 02/02/2012
	  # Supports: Tb 1.5 - 12.0a1
		#  fixed bug where a quotation that is edited loses its formatting or disappears.
    #  made account list in option window easier to read
    #  some visual improvements to the help file
		
	Version 0.8.5.6 - Released 18/06/2012
	  # Supports: Tb 3.1.7 - 14*
		# Fixed compatibility Problem with Thunderbird 13.* which broke a lot of the extension's functionality in 0.8.0 and previous
		# Redesigned Help Window
    # Added inserting variables/keywords using mouse click
    # Added validation during insert (if variable cannot be used in "Write New" it will be rejected
    # Added fi locale
    # Most locales are reviewed and corrected (currently not all) incomplete translations are in English, as always. Many thanks to the translation team at BabelZilla!

  Version 0.9.1 - Released 16/08/2012
	  # Supports: Tb 3.1.7 - 14.*
    # Integrated variables help into options dialog
		# Statusbar button for quickly accessing template settings
		# Added Bugzilla support
		# When switching between accounts, the current Tab (e.g. Reply to) remains selected
    # When updating from an earlier versions, all settings and templates should be migrated automatically, Conversion Wizard
    # Fixed [Bug 24997] "Edit as New" Sometimes Loses Message Body
    # Fixed [Bug 25002] Signature will displayed two times
    # Fixed [Bug 24988] Message body not included replying to "plain-text" messages
    # Fixed [Bug 24991] Replace default quote header not working in some cases
		
  Version 0.9.2 - Released 22/11/2012
	  # Supports: Tb 3.1.7 - 17.* ,  Sm 2.0.0 - 2.16.*
    # Redesigned Settings Window to support signature settings from Thunderbird even better
		# Added support for Seamonkey
		# Added global settings in advanced options pane; includes new font size setting for template editor.
		# [Bug 25088] add option to hide status icon. Configuration setting extensions.smartTemplate4.statusIconLabelMode
		              0 - never show label
									1 - expand label on hover (default)
									2 - always show label
    # Redesigned About Window (Add-On Manager &#8658; rightclick on SmartTemplate⁴ &#8658; About)
		# Added uk-UA locale
		# Fixed Bug 25103]	0.9.1 inserts unwanted line break top of &lt;body&gt; in html mode
		# [Bug 25099] Support bottom reply with headers on top
		# [Bug 25097] Forward text message results in double header
    # [Bug 25095] 2 blank lines in plain text between header and quote
    # [Bug 25093] Signatur missing when replying below quote
    # [Bug 25092] Option window broken in Italian version
    # [Bug 25084] 0.9.1 regression: blank line is added before Reply template
    # [Bug 25089] Default forward quote can't be completely hidden - thanks to PeterM for providing a solution
    # [Bug 25117] Plaintext: Template always below the quoted message when replying
    # [Bug 25155] 0.9.1 regression - blank line is added AFTER Reply template
      	
  Version 0.9.3 - 31/07/2013
	  # toolbar button
		# fixed a problem with preference not updating (found by AMO reviewer Nils Maier)
	  # [FR 24990] Added %cursor% variable
		# [FR 25083] New option "Correct Lastname, Firstname" to swap firstname to the front. 
		# %deleteText()% and %replaceText()% functions
		# [FR 25248] Added %y% for two digit years
	  # parsing of variables in Signature - enable extensions.smartTemplate4.parseSignature
	  # Postbox support
		# stabilised signature code base
		# Added Stationery 0.8 support - works with the new event model of Stationery 0.8 - 
			template inserting is disabled if a Stationery Template of 0.7.8 or older is used
		# mailto link support for the main header fields that hold email address data: %to(mail,link)% %to(name,link)%$ %to(firstname,link)%  etc.
		# new %identity()%  function
		# added 24px icon
		# added change log
		# fix: redefinition of Thunderbird's nsIMsgAccount interface broke account dropdown in settings
		# suppressed displaying string conversion prompt when clicking on the version number in advanced options
		# added preferences textbox for default charset
		# [Bug 25483] when using %sig(2)% (option for removing dashes) - signature is missing on new mails in HTML mode 
		# [Bug 25104] when switching identity, old sig does not get removed.
		# [Bug 25486] attaching a plain text file as signature leads to double spaces in signature
		# [Bug 25272] reply below quote with signature placed cursor below signature (should be above signature and below quote)
		# added configuration setting for signature file character set. extensions.smartTemplate4.signature.encoding
		# added configuration setting adding dashes before text sig. extensions.smartTemplate4.signature.insertDashes.plaintext
		# fixed signature position when replying on top (must be below template)
		# hidden settings for adding --<br> before sig (html + plaintext separate).
		# added warning if originalMsgURI cannot be determined
		# added hidden UI on right-click on 'Process signature' option to manage signature settings

  Version 0.9.4 - 15/09/2013 
	  # Fixed [Bug 25523] Cannot use image as signature
		# Fixed [Bug 25526] if no Signature is defined, %sig% is not removed
		# Fixed: Background images in new / reply / forward tabs did not show up in groupbox on default theme in Windows
		# test option for not loading / showing examples tab
		# Reopened and Fixed [Bug 25088] by making status bar icon status more resilient
		# Fixed %subject% removing expressions in <brackets>
		
  Version 0.9.5 -	21/04/2014
	  # improved locale matching (allow matching en as en-US etc.)
		# [Bug 25571]  "replace line breaks with <br>" on when not enabled
		# Make sure that debug settings window stays on top
		# added UI for disabling space for %cursor%
    # Advanced Tab in options dialog
		# [Bug 25676] JavaScript parser added by Benito van der Zander
		# [Bug 25710] <div id=smartTemplate4-template> is inserted in Stationery body
    # [Bug 25643] Display Names from Address book
    # option: Capitalize Names
    # option: Nickname instead of First
    # Improved parsing of timezone string (remove brackets)
    # Fixed [Bug 25191] conflict with add-on Account Colors
    # Fixed a problem with name matching signature files - 
      depending on file name some textual signatures might be accidentally treated as images.
    # Fixed reading plain text signature files (linefeeds where lost) by inserting html line breaks
      to disable this behavior toggle extensions.smartTemplate4.signature.replaceLF.plaintext.br in about:config

  Version 0.9.5.1 - 24/04/2014
    # Fixed minver for SeaMonkey

  Version 0.9.5.2 - 08/05/2014
    # Fixed [Bug 25762] related to Replace Names from Addressbook (LDAP). Also disabled this feature on Postbox.
    
  Version 0.9.6 - 04/10/2014
    # Added a switch for removing emails when replacing Names from Address book
    # Added format %sig(none)% to completely suppress signature
    # [Bug 25089] (reopened) default quote header wasn't removed anymore in Tb 31.0
    # [Bug 25816] Missing names in reply caused by different Encodings - the Mime decoder fails when multiple addresses with varying encodings are contained
    # [Bug 25089] Default forward quote not hidden
    # variable %matchTextFromBody()% to find and replace pattern e.g. %matchTextFromBody(TEST *)% will retrieve '123' from 'TEST 123'
    
  Version 1.0 - 24/05/2015
  Features
    # [Bug 25871] %file()% - insert html, text or image from file (for customized signatures)
                  use a local file path in order to insert a file from the computer you are sending from
                  %file(fileName)%
                  %file(fileName,encoding)%
                  If the encoding parameter is omitted, we assume UTF-8 (recommended)
                  %file(imageName,altText)%
                  The optional altText is displayed at the recipient if the image cannot be displayed. It may not contain the characters ,)(><
                  
    # [Bug 25902], [Bug 26020] To support multiple mail addresses with more flexibility
                   bracketMail(arg) - use  within from() to() cc() etc. to "wrap" mail address with non-standard characters
                   bracketName(arg) - same using "name portion"
            usage: bracketMail(startDel;endDel)  startDel = characters before the mail portion 
                                                 endDel = characters after the mail portion
                                                 e.g. bracketMail(";")  not allowed are:  ; , < > ( ) [ ]
                   bracketMail()        =  <mail@domain.com>
                   bracketMail(angle)   =  <mail@domain.com>
                   bracketMail(round)   =  (mail@domain.com)
                   bracketMail(square)  =  [mail@domain.com]
    
  Bugfixes
    # [Bug 25902] %from% and %to% fail if no argument is given - Added Improvements + Stability + better List support
    # [Bug 25903] In address fields Quotation marks are escaped: \"
    # Fixed: Capitalize Names doesn't work if string is quoted. Makes the whole string lowercase.
             Also words with Names in brackets now.
    # Fixed: getSignatureInner inserts "undefined" in Postbox if no signature is defined for current identity.
    # [Bug 25951] ST4 not working in SeaMonkey 2.32 - Temporal Deadzone - This was caused by some code changes in the
      Mozilla code base that established different rules for variables declared with "var" causing addons to break
      which have the same variable declared with let or var&let multiple times (in the same scope)
    # [Bug 25976] Reply to List: variables not resolved - Stationery Patch available
    # [Bug 26008] Inserting Template in Postbox may fail with "XPCOMUtils not defined"
    # [Bug 25089] Default forward quote not hidden - in Postbox "Fred wrote:" was not removed in plain text mode.
                  Set extensions.smartTemplate4.plainText.preserveTextNodes = true for roll back to previous behavior
    # [Bug 26013] ST4 picks template from common settings instead of identity (Tb38)
    # [Bug 25911] Spaces in long subject headers [Decoding Problem] - WIP
    # Postbox 4: fixed removal of quote header (author wrote:) which is in a plain <span>

  Version 1.1 - 30/08/2015
  Features  
    # [Bug 26043] Save Template / Load Template feature
    # [Bug 25904] Functions to Modify Mail Headers: To, Cc, Bcc, Subject and Others
    #             %header.set(name,value)%
    #             %header.append(name,value)%
    #             %header.prefix(name,value)%
    #             supported headers: subject, to, from, cc, bcc, reply-to 
    # Removed automatic suppression of "mailTo" links and added an option for activating it
    # Postbox 4 compatibility. Raised minimum Verion for Thunderbird to 9

  Version 1.2.1 - 20/04/2016
    # [Bug 26100] Double brackets not working with %cc(name,bracketMail(angle))%
    # [Bug 26159] %cursor% variable breaks paragraphs style
		# [Bug 26126] Unwanted space added after cursor
		# [Bug 26139] Fix position of warning message for variables not allowed in New Emails 
		# [Bug 26197] Thunderbird 45 - unwanted paragraph after quote header
		
	Version 1.3 - 11/07/2016  
	  # [Bug 26207] Add option to delimit address list with semicolons
		# [Bug 26208] Lastname and Firstname arguments omit part of the name when broken up - WIP
		# [Bug 26257] Default quote header not removed in complex Stationery
		# Force Replacing default quote header in Stationery even if no %quoteHeader% variable is contained
		# [Bug 26215] Bad interaction between SmartTemplate⁴ and "When using paragraph format, the enter key creates a new paragraph"
		# [Bug 26209] Add option to wrap name in double quotes if it contains commas - WIP
    # When clicking on a mailto link from a web browser with a given text body, this was overwritten by SmartTemplate⁴
		  new behavior: bypass the SmartTemplate⁴ to avoid losing information from the web site. 
		# Added button to visit our Thunderbird Daily Youtube channel
		# Updated outdated links to language libraries from ftp to https
		# Release Video at: https://www.youtube.com/watch?v=xKh7FkU8A1w
	
	Version 1.3.1 - 23/09/2016
	  # [Bug 26261] Quote header not inserted in plain text mode
		# [Bug 26260] Browser's "EMail Link" feature doesn't copy link
		
		
  Version 1.4 - 22/01/2017
		# Postbox 5.0 compatibility
	  # Fixed: mailto links are missing signature
		# Extended %matchTextFromBody( )% function
		# New %matchTextFromSubject( )% function
		# Release video at: https://www.youtube.com/watch?v=u72yHAPNkZE
		
  Version 1.5 - 27/04/2018
	  # [Bug 26340] New "unmodified field" option for %To()%, %CC()% and %From()% %from(initial)% New initial keyword to avoid any changes of header; just displays the header as received.
	  # New: %header.set.matchFromSubject()% function to retrieve regex from subject line and set a (text) header
	  # New: %header.append.matchFromSubject()% function to retrieve regex from subject line and append to a (text) header
	  # New: %header.prefix.matchFromSubject()% function to retrieve regex from subject line and prefix to a (text) header
	  # New: %header.set.matchFromBody()% function to retrieve regex from email body and set a (text) header
	  # New: %header.append.matchFromBody()% function to retrieve regex from email body and append to a (text) header
	  # New: %header.prefix.matchFromBody()% function to retrieve regex from email body and prefix to a (text) header
		# New: %to(initial)% keyword to return unchanged address header
		# Fix: [Bug 25571] "replace line breaks with <br>" on when not enabled in Common settings
		# [Bug 26300] %cursor% leaves an unnecessary space character
    # [Bug 26345] Unexpected "Â" character in mail body
		# [Bug 26356] Thunderbird 52 - Forwarding an email inline adds empty paragraph on top
		# [Bug 26364] Inline Images are not shown
		# [Bug 26494] ESR 2018 readiness - Make SmartTemplate⁴ compatible with Tb 60
		# [Bug 26446] Thunderbird 57 hangs on start with SmartTemplate⁴ enabled 
		# [Bug 26483] Opening an .eml file SmartTemplate⁴ doesn't apply templates
		# Adding SmartTemplate⁴ Pro License
		# Thunderbird 57 deprecated nsILocaleService causing local date to fail
		# Thunderbird 57 deprecated nsIScriptableDateFormat causing most date functions (datelocal, dateshort) to dail [prTime2Str()]
		# Remember expanded / contracted status of setting dialog 
		# Close settings dialog when clicking on links in the support tab		
		
	Version 1.5.1 - 03/05/2018
	  # changed license to (CC BY-ND 4.0)
	  # [Bug 26518] Clicking on variables in the Variables Tab doesn't copy them
		# [Bug 26434] Forwarding email with embedded images removes images
		              (use insertFileLink? getFileAsDataURI? encodeURIComponent?)
									MsgComposeCommands uses loadBlockedImage() ?
	  # [Bug 26307] Extend dates variables with additional offset parameter for hours / minutes
		# [Bug 26465] Composer does not focus into body of mail
		
	Version 2.0 - 23/12/2018
		# [Bug 26494] ESR 2018 readiness - Make SmartTemplate⁴ compatible with Tb 60
	  # [Bug 26523] Remove extra <br> before blockquote if standard quote header is used.
		# [Bug 26524] %datelocal% and %dateshort% are broken in Tb 60
		# Completed various translations (ru, pl, nl, sr)
		# [Bug 26526] %file% causes rogue errors "The Variable %5C.. can not be used for new meessages" when including images
		# [Bug 26551] Add Domain License key support for SmartTemplate⁴ Pro
		# [Bug 26552] %attach% Variable for attaching [pdf] files
		# Moved links from addons.mozilla.org to addons.thunderbird.net
		# Address Book: Added feature to replace firstname with Display Name if no first name is recorded.
		# Added Indonesian Locale - thanks to Mienz Louveinski (Babelzilla.org)
		# [Bug 26596] Make extracting Name from (parentheses) optional - extensions.smartTemplate4.names.guessFromMail
		# [Bug 26595] Option to disable guessing Name Part
		# [Bug 26597] Add ?? operator to make parts of address header arguments optional, e.g. %from(name,??mail)%
		# Added option for default address variable format
		# [Bug 24993]</a> Premium Feature: Added support for using the following fields when composing a *new* Email:%subject% %from% %to% %cc% %bcc% %date% %dateformat()%
		
	Version 2.1 - 28/07/2019
	  # [Bug 26536] Support using SmartTemplate⁴ variables in Thunderbird Templates (Tb 60)
		# [Bug 26634] header.*.matchFrom* functions: append/prepend arbitrary text to field based on match.
		# [Bug 26677] %header.set.matchFromBody()% improvements for use with subject line.
		# [Bug 26629] %X:=timezone()% switch to set a specific time zone with date variables
		# [Bug 26626] "Edit As New" duplicates email content unless Stationery is installed
		# [Bug 26627] Signature was always removed when creating message from templates.
		# [Bug 26628] %dateshort% and %datelocal% omit time portion
		# [Bug 26632] Using %dateformat% in reply / forward: deferred fields are not automatically tidied up
		# [Bug 26635] Cursor when writing/forwarding not placed in "To:" Row 
		# %attach% command defaults to only append HTML files - should accept all file types.
		# Removed display of donate page on update.
		# Remember path for file picker when saving / loading templates
		# [Bug 26667] ESR 2019 Readyness - make SmartTemplate⁴ compatible with Thunderbird 68
		# Added mandatory Standard license	

	Version 2.1.1 - WIP
		# Some improvements with panel sizing on preferences dialog
	  # Added Support Tab (licensed users only - these can now send an email directly) 
		# ESR - Eliminated getCharPref / setCharPref
		# in Tb 68, some account specific options (use HTML, replace BR) are greyed out 
		  when opening the dialog and  have to be reactivated by enabling / disabling 
			"Apply the following template"
		#
			
=========================
  KNOWN ISSUES / FUTURE FUNCTIONS
  Version 2.2
    # Known issues: The "clean up button" is not automatically installed in the composer toolbar.

// investigate gMsgCompose.compFields!
=========================
*/

Components.utils.import("resource://smarttemplate4/smartTemplate-stationery.jsm");


var SmartTemplate4 = {
	// definitions for whatIsX (time of %A-Za-z%)
	XisToday : 0,
	XisSent  : 1,
	signature : null,
	sigInTemplate : false,
	PreprocessingFlags : {
	  hasCursor: false,
		hasSignature: false,
    omitSignature: false,
		hasQuotePlaceholder: false,
		hasQuoteHeader: false,          // WIP
		hasTemplatePlaceHolder: false,  // future use
		isStationery: false,
		isThunderbirdTemplate: false
	},
	
	initFlags : function initFlags(flags) {
	  // independent initialisation so we can create an empty flags object
		flags.hasSignature = false;
    flags.omitSignature = false,
		flags.hasCursor = false;
		flags.isStationery = false;
		flags.hasQuotePlaceholder = false;
		flags.hasQuoteHeader = false;
		flags.hasTemplatePlaceHolder = false;
		flags.isThunderbirdTemplate = false;
	} ,

	stateListener: {
		NotifyComposeFieldsReady: function() {},
		NotifyComposeBodyReady: function(event) {
			const util = SmartTemplate4.Util,
			      prefs = SmartTemplate4.Preferences,
						msgComposeType = Components.interfaces.nsIMsgCompType;
		  let eventDelay = (gMsgCompose.type != msgComposeType.ForwardInline) 
			               ? 10 
										 : prefs.getMyIntPref("forwardInlineImg.delay"),
			    isNotify = false;
			util.logDebug('NotifyComposeBodyReady');
			// For Stationery integration, we need to  
			// its method of overwriting  stateListener.NotifyComposeBodyReady 
			if (prefs.isStationerySupported && 
			    (typeof Stationery_ != 'undefined'))
			{
			  // test existence of Stationery 0.8 specific function to test if we need to use the new event model.
				// added: New Stationery 0.9 uses promises
				
				if (Stationery.fireAsyncEvent || Stationery.waitForPromise) {
					if (gMsgCompose.type == msgComposeType.Template) {
						// force calling compose ready as Stationery does not support "template" case
						window.setTimeout(
							function(){ 
								util.logDebug("Template case with Stationery enabled: calling notifyComposeBodyReady()")
							  SmartTemplate4.notifyComposeBodyReady(); 
							}, 
							eventDelay);					
					}
					else {
						// new Stationery will instead call preprocessHTMLStationery through its preprocessHTML method
						util.logDebug('NotifyComposeBodyReady: Stationery 0.8+ - no action required.');
					}
					return;
				}

				// Stationery 0.7.8 and older
				let bypass = true,
				    oldTemplate = '';
				
				if (typeof Stationery.Templates.OnceOverride != "undefined") {
					if (Stationery.Templates.OnceOverride == '')
						bypass = false;
					else
						oldTemplate = Stationery.Templates.OnceOverride;
				}
				else { 
					if (Stationery.Templates.Current =='')  
						bypass = false;
					else
						oldTemplate = Stationery.Templates.Current;
				}
				if (bypass)
					util.logToConsole('An older version of Stationery (pre 0.8) is installed.\n'
					   + 'As you have selected the Stationery template ' + oldTemplate 
						 + ', SmartTemplate4 will be not used for this email.' );
				else {
					isNotify = true;
				}
			}
			else
				isNotify = true;
				
			if (isNotify) {
				// [BUG 26434] forwarding email with embedded images removes images
				// test delaying call for forward case
				window.setTimeout(
					function(){ SmartTemplate4.notifyComposeBodyReady(event); }, 
					eventDelay);
			}
		},
		
		ComposeProcessDone: function(aResult) {
			const util = SmartTemplate4.Util;
			util.logDebug('ComposeProcessDone');
		},
		
		SaveInFolderDone: function(folderURI) {
			const util = SmartTemplate4.Util;
			util.logDebug('SaveInFolderDone');
		}
	},

	initListener: function initListener(isWrapper) {
    const util = SmartTemplate4.Util,
		      prefs = SmartTemplate4.Preferences,
					msgComposeType = Components.interfaces.nsIMsgCompType;
    let log = util.logDebugOptional.bind(util);
		if (SmartTemplate4.isListenerInitialised) {
			log('composer','Listener is initialised - early exit.');
			return; // avoid calling 2x
		}
    let notifyComposeBodyReady = SmartTemplate4.notifyComposeBodyReady.bind(SmartTemplate4),
		    txtWrapper = isWrapper ? "Wrapper=true" : "compose-window-init event";
		SmartTemplate4.isListenerInitialised = true;
    log('composer', 'Registering State Listener [' + txtWrapper + ']...');
		if (prefs.isDebugOption('composer')) debugger;
    try {
      gMsgCompose.RegisterStateListener(SmartTemplate4.stateListener);
			// can we overwrite part of global state listener?
			// stateListener is defined in components/compose/content/MsgComposeCommands.js
			if (stateListener && stateListener.NotifyComposeBodyReady) {
				if (typeof gComposeType !== 'undefined' && !util.OrigNotify) {
					util.OrigNotify = stateListener.NotifyComposeBodyReady;
					let idKey = util.getIdentityKey(document);
					stateListener.NotifyComposeBodyReady = function() {
						// Bug 26356 - no notification on forward w. empty template
						if (gComposeType !== msgComposeType.ForwardInline
						   ||
							 (SmartTemplate4.pref.getTemplate(idKey, 'fwd', "")!="")
							  && 
								SmartTemplate4.pref.isProcessingActive(idKey, 'fwd', false))
						{
							util.OrigNotify();
						}
					}
				}
			}
    }
    catch (ex) {
      util.logException("Could not register status listener", ex);
    }
		// alternative events when 
		if (prefs.isStationerySupported) {
      log('composer' , 'Adding Listener for stationery-template-loaded...');
			window.addEventListener('stationery-template-loaded', function(event) {
				// Thunderbird uses gComposeType
				let eventDelay = (gMsgCompose.type != msgComposeType.ForwardInline) 
											 ? 10 
											 : prefs.getMyIntPref("forwardInlineImg.delay");
			  // async event
				log('composer,events', 'EVENT: stationery-template-loaded');
				// [BUG 26434] forwarding email with embedded images removes images
				// test delaying call for forward case
				window.setTimeout(
					function(){ notifyComposeBodyReady(event); }, 
					eventDelay
				);
			}, false);		
		}
    else {
      log('composer', 'not registering stationery-template-loaded event Preferences.isStationerySupported=false?');
    }
	},
	
	// Stationery 0.8 support!
  preprocessHTMLStationery: function preprocessHTMLStationery(t) {
    let util = SmartTemplate4.Util;
    util.logDebugOptional('stationery',
		     '=========================================\n'
		   + '=========================================\n'
			 + 'preprocessor for Stationery running...');
    let idKey = util.getIdentityKey(document);
    if(!idKey)
      idKey = gMsgCompose.identity.key;
    let st4composeType = util.getComposeType();
    if (st4composeType.indexOf('(draft)')) {
      st4composeType = st4composeType.substr(0,3);
    }
    // ignore html!
		SmartTemplate4.StationeryTemplateText = t.HTML;
		// do not do HTML escaping!
		// pass in a flag to leave %sig% untouched
		util.clearUsedPremiumFunctions();
    t.HTML = SmartTemplate4.smartTemplate.getProcessedText(t.HTML, idKey, st4composeType, true, true); 
		util.logDebugOptional('stationery', 'Processed text: ' + t.HTML);
    util.logDebugOptional('stationery',
		     '=========================================\n'
		   + '=========================================\n'
			 + 'Stationery preprocessor complete.');
  },	
	
	// -------------------------------------------------------------------
	// A handler to add template message
	// -------------------------------------------------------------------
	notifyComposeBodyReady: function notifyComposeBodyReady(evt) 	{
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util,
					Ci = Components.interfaces,
					msgComposeType = Ci.nsIMsgCompType;
		let dbg = 'SmartTemplate4.notifyComposeBodyReady()',
		    stationeryTemplate = null,
		    flags = this.PreprocessingFlags;
				
		// We must make sure that Thunderbird's own  NotifyComposeBodyReady has been ran FIRST!		
    // https://searchfox.org/comm-central/source/mail/components/compose/content/MsgComposeCommands.js#343
		if (prefs.isDebugOption('stationery') || prefs.isDebugOption('composer')) debugger;
		util.logDebugOptional('stationery', 'notifyComposeBodyReady()...');
		this.initFlags(flags);
		
		dbg += "\ngMsgCompose type: "  + gMsgCompose.type;
		// see https://dxr.mozilla.org/comm-central/source/comm/mailnews/compose/public/nsIMsgComposeParams.idl
		// New in Tb60 EditAsNew (15) and EditTemplate (16)
		if (gMsgCompose.type == (msgComposeType.EditAsNew || 15) 
		   ||
			 gMsgCompose.type == (msgComposeType.EditTemplate || 16) 
			 )
			return; // let's do no processing in this case, so we can edit SmartTemplate4 variables
			
		// Tb 52 uses msgComposeType.Template for "Edit as New""
		if (gMsgCompose.type == msgComposeType.Template && (typeof msgComposeType.EditTemplate == 'undefined')) {
			util.logDebug("omitting processing - composetype is set to Template and there is no EditTemplate defined (pre Tb60)")
		  return;
		}
			// this also means the hacky code around flags.isThunderbirdTemplate will now be obsolete.
		if (evt) {
			let targ = evt.currentTarget || evt.target;
			if (targ.Stationery_) {
			  let stationeryInstance = targ.Stationery_,
				    cur = null;
				stationeryTemplate = stationeryInstance.currentTemplate;
				dbg += '\nStationery is active';
				dbg += '\nTemplate used is:' + stationeryTemplate.url;
				if (stationeryTemplate.type !== 'blank') {
					try {
						let stationeryText = SmartTemplate4.StationeryTemplateText;
						flags.isStationery = true;
            let sigTest = this.smartTemplate.testSignatureVar(stationeryText);
						flags.sigType = sigTest;
						flags.hasSignature = (!!sigTest);
            flags.omitSignature = (sigTest=='omit');
						flags.hasCursor = this.smartTemplate.testCursorVar(stationeryText);
						flags.hasQuotePlaceholder = this.smartTemplate.testSmartTemplateToken(stationeryText, 'quotePlaceholder');
						flags.hasQuoteHeader = this.smartTemplate.testSmartTemplateToken(stationeryText, 'quoteHeader');
						flags.hasTemplatePlaceHolder = this.smartTemplate.testSmartTemplateToken(stationeryText, 'smartTemplate');
					}
					catch(ex) {
						util.logException("notifyComposeBodyReady - Stationery Template Processing", ex);
					}
				}
			}			
		}
		flags.isThunderbirdTemplate = 
		  (gMsgCompose.type == msgComposeType.Template);
		SmartTemplate4.StationeryTemplateText = ''; // discard it to be safe?
		util.logDebug(dbg);
		// Add template message
		/* if (evt && evt.type && evt.type =="stationery-template-loaded") {;} */
		// guard against this being called multiple times from stationery
		// avoid this being called multiple times
    let editor = util.CurrentEditor.QueryInterface(Ci.nsIEditor),
		    root = editor.rootElement,
		    isInserted = false;
		try {
			if (prefs.isDebugOption('stationery')) debugger;
			if (!root.getAttribute('smartTemplateInserted') || flags.isThunderbirdTemplate)  // typeof window.smartTemplateInserted === 'undefined' || window.smartTemplateInserted == false
			{ 
				isInserted = true;
				// if insertTemplate throws, we avoid calling it again
				this.smartTemplate.insertTemplate(!flags.isThunderbirdTemplate, flags); // if a Tb template is opened, process without removal
				// store a flag in the document
			  //let div = SmartTemplate4.Util.mailDocument.createElement("div");
				root.setAttribute("smartTemplateInserted","true");
				//editor.insertNode(div, editor.rootElement, 0);
				// window.smartTemplateInserted = true;
				this.smartTemplate.resetDocument(editor, true);
				
				util.logDebugOptional('functions', 'insertTemplate(startup) complete.');
			}
			else {
				util.logDebug('smartTemplateInserted is already set');
			}
			
			//set focus to editor
			let FocusElement, FocusId;
			// if we load a template ST4 processing will have been done before the template was saved.
			// composeCase is set during insertTemplate
			switch (this.smartTemplate.composeCase) {
				case 'tbtemplate':
				case 'new': // includes msgComposeType.Template and msgComposeType.MailToUrl
				case 'forward':
				  if (gMsgCompose.type == msgComposeType.MailToUrl) // this would have the to address already set
						FocusId = 'content-frame'; // Editor
					else {
						let foundTo = false;
						// find the "to" line
						for (let rowAddress=1; foundTo==false; rowAddress++) {
							let adColElement = window.document.getElementById("addressCol1#" + rowAddress.toString());
							if (adColElement.value=="addr_to") {
								foundTo = true;
								FocusId = 'addressCol2#' + rowAddress.toString();
								FocusElement = window.document.getElementById(FocusId);
								//test if to-address already contains a valid email address:
								let r = new RegExp(/(\b[a-zA-Z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,8}\b)/);
								if (r.test(FocusElement.value)) { // found valid email!
									FocusId = 'content-frame';
									break;
								}
							}
							// nothing found? assume something went wrong, go to default behavior
							if (!adColElement || rowAddress>1000) {
								FocusId = 'addressCol2#1'; 
								break;
							}
						}
					}
					break;
				default: // 'reply'  - what about mailto?
				  FocusId = 'content-frame'; // Editor
			}
			FocusElement = window.document.getElementById(FocusId);
			if (FocusElement) {
				FocusElement.focus();
			}
			
		}
		catch(ex) {
			util.logException("notifyComposeBodyReady", ex);
			if (isInserted)
				root.setAttribute("smartTemplateInserted","true");
		}
		util.logDebugOptional('stationery', 'notifyComposeBodyReady() ended.');
},

	// -------------------------------------------------------------------
	// A handler to switch identity
	// -------------------------------------------------------------------
	loadIdentity: function loadIdentity(startup, previousIdentity) {
		const prefs = SmartTemplate4.Preferences;		
		let isTemplateProcessed = false;
		SmartTemplate4.Util.logDebugOptional('functions','SmartTemplate4.loadIdentity(' + startup +')');
		if (startup) {
			// Old function call
			this.original_LoadIdentity(startup);
		}
		else {
		  // change identity on an existing message:
			// Check body modified or not
			let isBodyModified = gMsgCompose.bodyModified;
			// we can only reliable roll back the previous template and insert
			// a new one if the user did not start composing yet (otherwise danger
			// of removing newly composed content)
			if (!isBodyModified) {
				// Add template message - will also remove previous template and quoteHeader.
			  this.smartTemplate.insertTemplate(false);
				// [Bug 25104] when switching identity, old sig does not get removed.
				//             (I think what really happens is that it is inserted twice)
				isTemplateProcessed = true;
			}
			if (isBodyModified) {
				// if previous id has added a signature, we should try to remove it from there now
				// we do not touch smartTemplate4-quoteHeader or smartTemplate4-template
				// as the user might have edited here already! 
				// however, the signature is important as it should match the from address?
				if (prefs.getMyBoolPref("removeSigOnIdChangeAfterEdits")) {
					this.smartTemplate.extractSignature(gMsgCompose.identity, false);
				}
			}
			// AG 31/08/2012 put this back as we need it!
			// AG 24/08/2012 we do not call this anymore if identity is changed before body is modified!
			//               as it messes up the signature (pulls it into the blockquote)
			// if (!isTemplateProcessed)
				this.original_LoadIdentity(startup);
			if (!isBodyModified && gMsgCompose.bodyModified) {
				gMsgCompose.editor.resetModificationCount();
			}	// for TB bug?
		}
		
	},

	// -------------------------------------------------------------------
	// Escape to HTML character references
	// -------------------------------------------------------------------
	escapeHtml: function escapeHtml(str)
	{
		return str.replace(/&/gm, "&amp;").replace(/"/gm, "&quot;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/\n/gm, "<br>");
	},


	// -------------------------------------------------------------------
	// Initialize - we only call this from the compose window
	// -------------------------------------------------------------------
	init: function init()	{
		function smartTemplate_loadIdentity(startup){
			let prevIdentity = gCurrentIdentity;
			return SmartTemplate4.loadIdentity(startup, prevIdentity);
		}

		// http://mxr.mozilla.org/comm-central/source/mail/components/compose/content/MsgComposeCommands.js#3998
		if (typeof LoadIdentity === 'undefined') // if in main window: avoid init()
			return;
		SmartTemplate4.Util.logDebug('SmartTemplate4.init()');
		SmartTemplate4.Util.VersionProxy(); // just in case it wasn't initialized
		this.original_LoadIdentity = LoadIdentity;
		// overwriting a global function within composer instance scope
		// this is intentional, as we needed to replace Tb's processing
		// with our own (?)
		LoadIdentity = smartTemplate_loadIdentity;

		this.pref = new SmartTemplate4.classPref();

		// a class instance.
		this.smartTemplate = new SmartTemplate4.classSmartTemplate();
		// this.cal = new this.classCalIDateTimeFormatter(true);

		// Time of %A-Za-z% is today(default)
		this.whatIsX = this.XisToday;
		this.whatIsUtc = false;
		this.whatIsDateOffset = 0;
		this.whatIsHourOffset = 0;
		this.whatIsMinuteOffset = 0;
		this.whatIsTimezone = ""; //default timezone
		// flag for deferred vairables - once we add an event handler into the composer content script for clicking on
		// not (yet) existing headers [e.g. %To(Name)% in a new Email] we set this variable to true
		// (avoids having the function there multiple times)
		this.hasDeferredVars = false; 


		SmartTemplate4.Util.logDebug('SmartTemplate4.init() ends.');
	} ,
	
	setStatusIconMode: function setStatusIconMode(elem) {
	  try {
			this.Preferences.setMyIntPref('statusIconLabelMode', parseInt(elem.value));
			this.updateStatusBar(elem.parentNode.firstChild.checked);
		}
		catch (ex) {
			SmartTemplate4.Util.logException("setStatusIconMode", ex);
		}
	} ,
	
	updateStatusBar: function updateStatusBar(show) {
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util;
		try {
			util.logDebug('SmartTemplate4.updateStatusBar(' + show +')');
			let isDefault = (typeof show == 'undefined' || show == 'default'),
			    isVisible = isDefault ? prefs.getMyBoolPref('showStatusIcon') : show,
			    doc = isDefault ? document : util.Mail3PaneWindow.document,
			    btn = doc.getElementById('SmartTemplate4Messenger');
			if (btn) {
				btn.collapsed =  !isVisible;
				let labelMode = prefs.getMyIntPref('statusIconLabelMode'),
				    theClass = 'statusbarpanel-iconic-text';
				switch(labelMode) {
					case 0:
						theClass +=' hidden';
						break;
					case 1:
						//NOP;
						break;
					case 2:
						theClass +=' always';
						break;
				}
				btn.className = theClass;
				util.logDebugOptional('functions','SmartTemplate4Messenger btn.className = ' + theClass + ' , collapsed = ' + btn.collapsed);		
			}
			else
				util.logDebugOptional('functions','SmartTemplate4.updateStatusBar() - button SmartTemplate4Messenger not found in ' + doc);
    }
		catch(ex) {
			util.logException("SmartTemplate4.updateStatusBar() failed ", ex);
		}
	} ,

	startUp: function startUp() {
		let v = SmartTemplate4.Util.VersionProxy();
	} ,
	
	signatureDelimiter:  '-- <br>'

};  // Smarttemplate4

// -------------------------------------------------------------------
// Get day name and month name (localizable!)
// locale optional for locale
// -------------------------------------------------------------------
// this was classCalIDateTimeFormatter
SmartTemplate4.calendar = {
    currentLocale : null,
		bundle: null,
		list: function list() {
			let str = "";
			for (let i=0;i<7 ;i++){
				str+=(cal.dayName(i)  +"("+cal.shortDayName(i)  +")/");
			} 
			str += "\n";
			for (let i=0;i<12;i++){
				str+=(cal.monthName(i)+"("+cal.shortMonthName(i)+")/");
			}
			return str;
		},
		
		init: function init(forcedLocale) {
			const util = SmartTemplate4.Util;

			let strBndlSvc = Components.classes["@mozilla.org/intl/stringbundle;1"].
							 getService(Components.interfaces.nsIStringBundleService);
			// validate the passed locale name for existence
			// https://developer.mozilla.org/en-US/docs/How_to_enable_locale_switching_in_a_XULRunner_application
			if (forcedLocale) {
				let availableLocales = util.getAvailableLocales("smarttemplate4"), // smarttemplate4-locales
						found = false,
						listLocales = '';
				while (availableLocales.hasMore()) {
					let aLocale = availableLocales.getNext();
					listLocales += aLocale.toString() + ', ';
					if (aLocale.indexOf(forcedLocale)==0) {  // allow en to match en-UK, en-US etc.
					  forcedLocale = aLocale;
					  found = true;
					}
				}
				if (!found) {
				  let errorText =   'Invalid %language% id: ' + forcedLocale + '\n'
					                + 'Available in SmartTemplate4: ' + listLocales.substring(0, listLocales.length-2);
					util.logError(errorText, '', '', 0, 0, 0x1);
					SmartTemplate4.Message.display(errorText,
		        "centerscreen,titlebar",
		        { ok: function() { ; } }
		      );
					
					forcedLocale = null;
				}
				else {
					util.logDebug('calendar - found extension locales: ' + listLocales + '\nconfiguring ' + forcedLocale);
				}
      }			
			this.currentLocale = forcedLocale;
			let bundleUri = forcedLocale 
				? "chrome://smarttemplate4-locales/content/" + forcedLocale 
				: "chrome://smarttemplate4/locale";
			this.bundle = strBndlSvc.createBundle(bundleUri + "/calender.properties");
		},
		
		dayName: function dayName(n){ 
			return this.bundle.GetStringFromName("day." + (n + 1) + ".name"); 
		},
		
		shortDayName: function shortDayName(n) { 
			return this.bundle.GetStringFromName("day." + (n + 1) + ".short"); 
		},
		
		monthName: function monthName(n){ 
			return this.bundle.GetStringFromName("month." + (n + 1) + ".name"); 
		},
		
		shortMonthName: function shortMonthName(n) { 
			return this.bundle.GetStringFromName("month." + (n + 1) + ".short"); 
		}
};   // SmartTemplate4.calendar 
	
