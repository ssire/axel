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

/**
 * This is a Firefox only simple menu bar (Dump, Load, Save)
 *
 * It uses the local file selection dialog box (if privilege are granted by user) to access local files on the disk
 * If you prefer have a look at davmenubar.js that uses XHR requests and that runs in more browsers
 * 
 */
xtiger.util.MenuBar = function (aForm) {
  this.curform = aForm;
  this.installBar ();   
  this.nbLoad = 0;                             
}                    

xtiger.util.MenuBar.prototype = { 
  
  checkFireFox : function () {
    if (! xtiger.cross.UA.gecko) {
      alert('This option is only available on Firefox');
      return false;
    } 
    return true;
  },

  installBar : function () {
    var body = document.getElementsByTagName('body')[0];
    body.style.margin = "40px 10px 0 10px";
    var bar = xtdom.createElement(document, 'p');            
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.background = 'lightgray';
    bar.style.margin = '0';
    bar.style.padding = '5px 40px 5px 40px';  
    // Dump button
    var dump = xtdom.createElement(document, 'input');   
    xtdom.setAttribute(dump, 'type', 'button');
    xtdom.setAttribute(dump, 'value', 'Dump'); 
    dump.style.margin = "0 0 0 20px";
    // Load button
    var load = xtdom.createElement(document, 'input');   
    xtdom.setAttribute(load, 'type', 'button');
    xtdom.setAttribute(load, 'value', 'Load'); 
    load.style.margin = "0 0 0 20px";
    // Save button
    var save = xtdom.createElement(document, 'input');   
    xtdom.setAttribute(save, 'type', 'button');
    xtdom.setAttribute(save, 'value', 'Save'); 
    save.style.margin = "0 0 0 20px";
    var t = xtdom.createTextNode(document, 'XTiger Forms bar : ');             
    bar.appendChild (t);
    bar.appendChild (dump);
    bar.appendChild (load);
    bar.appendChild (save);
    body.appendChild(bar);            
    var _this = this; // closure
    xtdom.addEventListener(dump, 'click', function () { _this.doDump() }, false);
    xtdom.addEventListener(load, 'click', function () { _this.doLoad() }, false);
    xtdom.addEventListener(save, 'click', function () { _this.doSave() }, false);
  },

  doDump : function () {
    var log = new xtiger.util.LogWin ("XML instance data", 400, 600, true);
    log.dump(this.curform); 
  },

  doLoad : function () { 
    if (this.checkFireFox()) {    
      if (this.nbLoad > 0) {
        var doIt = confirm('You have already loaded some data into the template, it is recommended to reload the template before loading again some data, please confirm');
        if (! doIt) {
          return;
        }
      }
      var filePath = xtiger.util.fileDialog('open', "*.xml", "Select a file to load XML data from");
      if (filePath) {            
        var name = filePath.match(/[^\/]*\.xml$/)[0];
        if (! this.curform.loadDataFromFile(filePath, xtiger.cross.getXHRObject()) ) {
           alert('Failure "' + name + '" returns: ' + this.curform.msg, 1 );
        }
        this.nbLoad++;
      }
    }
  },
  
  doSave : function () { 
    if (this.checkFireFox()) {    
      var filePath = xtiger.util.fileDialog('save', "*.xml", "Select a file to save XML data");
      if (filePath) { 
        var name = filePath.match(/[^\/]*\.xml$/)[0];
        if (! this.curform.saveDataToFile (filePath)) { 
          alert(this.curform.msg, 1);
        }       
      }
    }
  }
  
} 
