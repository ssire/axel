/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * A logger for keeping error messages while performing error-prone actions
 */
xtiger.util.Logger = function () {
  this.errors = [];
} 

xtiger.util.Logger.prototype = {    

  // Returns true if the logger has recorded some error message
  inError : function () {
    return (this.errors.length > 0);
  },
    
  // If msg contains '$$$', it will be substituted with the file name contained in optional url  
  logError : function (msg, url) {
    if (msg.indexOf('$$$') != -1) {
      var m = url.match(/([^\/]*)$/); // should extract trailing file name
      var name = m ? m[1] : url;
      this.errors.push (msg.replace('$$$', '"' + name + '"'));
    } else {
      this.errors.push (msg);     
    }
  },

  // Returns a concatenation of error messages
  printErrors : function () {
    return this.errors.join(';');
  }
}                  

/**
 * A window for logging data
 */
xtiger.util.LogWin = function (name, width, height, isTranscoding) {
  var params = "width=" + width + ",height=" + height + ",status=yes,resizable=yes,scrollbars=yes,title=" + name;
  if (xtiger.cross.UA.IE) {
    this.window = window.open('about:blank');
  } else {
    this.window = window.open(null, name, params);    
  }
  this.doc = this.window.document;
  this.doc.open();
  this.isTranscoding = isTranscoding;
}

xtiger.util.LogWin.prototype = {       
  
  // Dumps a form inside this LogWin
  // Assumes form has been configured to dump schemas
  dumpSchema : function (form, stylesheet, template) {
    var dump = new xtiger.util.SchemaLogger ();   
    var data = form.serializeData (dump);
    this.write(dump.dump('*'));
    this.close();     
  },    
  // Dumps a form inside this LogWin
  // stylesheet is an optional stylesheet filename, if present it adds a stylesheet processing instruction
  // filename is the optional name of the XML content file, if present it is added as a 'filename' attribute
  //  on the root node
  dump : function (form, stylesheet, template) {
    var buffer;
    var dump = new xtiger.util.DOMLogger ();
    // form.setSerializer(new xtiger.editor.BasicSerializer ());
    var data = form.serializeData (dump);
    buffer = "<?xml version=\"1.0\"?>\n" // encoding="UTF-8" ?
    if (stylesheet) {
      buffer += '<?xml-stylesheet type="text/xml" href="' + stylesheet + '"?>\n';
    }
    if (template) {
      buffer += '<?xtiger template="' + template + '" version="1.0" ?>\n';
    }                                           
    buffer += dump.dump('*');
    this.write(buffer);
    this.close();     
  },
  transcode : function (text) {
    var filter1 = text.replace(/</g, '&lt;');
    var filter2 = filter1.replace(/\n/g, '<br/>');    
    var filter3 = filter2.replace(/ /g, '&nbsp;');    
    return filter3;
  },
  //  
  // openTag : function (name) {
  //  if (this.isTranscoding) {
  //    this.doc.writeln ('&lt;' + name + '>');     
  //  } else {
  //    this.doc.writeln ('<' + name + '>');            
  //  }
  // },
  // 
  // closeTag : function (name) {
  //  if (this.isTranscoding) {
  //    this.doc.writeln ('&lt;/' + name + '><br/>');     
  //  } else {
  //    this.doc.writeln ('</' + name + '>');
  //  }
  // },
  // 
  write : function (text) {     
    var t = this.isTranscoding ? this.transcode(text) : text;
    this.doc.writeln(t);
  },
  
  close : function (text) {
    this.doc.close();
  },  
  dispose : function () {
    this.doc.close(); 
  } 
}

// FireFox only method     
// Opens a dialog for opening a local file or folder depending on the mode
// Uses a filter if not null and specifies the msg to display in the dialog box
// See https://developer.mozilla.org/en/nsIFilePicker
// Returns a FireFox file object or false if the selection was cancelled
xtiger.util.fileDialog = function (mode, filter, msg) {
  var fp;
  try {  
     netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
  } catch (e) {  
     alert("Permission to get enough privilege was denied.");  
     return false;
  }  
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  if (filter) {
    fp.appendFilter("My filter", filter);       
  }                  
  var m;
  if (mode == 'open') {
    m = nsIFilePicker.modeOpen;
  } else if (mode == 'save') {
    m = nsIFilePicker.modeSave;     
  } else { // assumes 'folder'
    m = nsIFilePicker.modeGetFolder;
  }
  fp.init(window, msg, m);    
  var res = fp.show();
  if ((res == nsIFilePicker.returnOK) || (res == nsIFilePicker.returnReplace)){
    return fp.file.path;
  } else {
    return false;
  }
}           
