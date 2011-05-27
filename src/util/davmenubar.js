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

// TODO
// * ADD a pre-filled popup with all the XML data file names
// * EXTRACT stylesheet instruction from XML file pi from DOMDataSource and pass (required for wp1.xml demo)


/**
 * Hook called from within the XML data input window which is opened when pressing the "Input" button
 *
 * Pre-condition: do not forget to save the menubar inside xtiger.session(document) at load time
 *
 */
function handleInstanceData (data) {
  var m = xtiger.session(document).load('menubar');
  if (m) 
    m.handleInstanceData (data);  
}

/**
 * Creates a MenuBar linked with aForm 
 *
 * The menu bar manages URLs of the form like ...t=template.xtd&d=filename.xml&p=library_path...
 * So be careful to be compatible with this URL scheme if you want to use it
 * Loads filename.xml if autoload is true (otherwise it supposes it has already been loaded)
 * 
 */
xtiger.util.MenuBar = function (aForm, autoload) {
  var fn;
  this.curform = aForm;
  this.nbLoad = 0;
  this.curFilename = null;
  fn = this.getDataFileUrl (); // current XML data file URL
  if (fn) {
    if ((! autoload) || (this.doLoad(this.curFilename))) {
      this.curFilename = fn;
    }
  }
}

xtiger.util.MenuBar.prototype = { 
  
  ///////////////////////////////////////
  // Start of default URL decoder aspect
  ///////////////////////////////////////
    
  // Returns the XML data file name encoded in the URL if any
  getDataFileUrl : function () {
    var m = document.location.href.match(/^(.*?)&d=(.*(\.(xml|xhtml|html)))(&p=(.*))?$/);
    return (m && m[2]) ? m[2] : null;
  },
  
  // Adds filename as XML content data file to the URL
  setDataFileUrl : function (filename) {
    if (document.location.href.search(/&d=/) != -1) {
      document.location.href = document.location.href.replace(/&d=([^&]*)/, '&d=' + filename);
    } else {
      document.location.href += '&d=' + filename;
    }
    this.curFilename = filename;
  },  

  // Returns the template file name from the URL
  getTemplateName : function () {
    var m = document.location.href.match(/t=([^=]*?\.(xtd|xhtml))/);
    return m ? m[1] : null;   
  },
  
  // Removes the XM data file in the URL and reloads the page
  // Reloads the page even if there is no XML data file in the URL
  removeDataFileUrl : function () {
    // FIXME: could use substr operations to be more independent of URL syntax
    var m = document.location.href.match(/^(.*?)&d=(.*?)(&p=(.*))?$/);
    if (m) {
      var loc = m[1];
      if (m[3]) {
        loc += m[3];
      }
      document.location.href = loc;     
    }
    location.reload(true);    
  },  
  
  /////////////////////////////////////
  // End of default URL decoder aspect
  /////////////////////////////////////
  
  // Returns the file name in the input area of null
  getInputFileName : function () {
    var n = document.getElementById('fname');
    return (n.value && (n.value.search(/\S/) != -1)) ? n.value : null;
  },
  
  // Creates the menu bar container and adds it as the BODY first child with fixed positioning
  // This is called only if the bar is displayed without a container argument
  makeContainer : function () {
    var body = document.getElementsByTagName('body')[0];
    body.style.margin = "50px 10px 0 10px"; // makes room for the menu bar
    var bar = xtdom.createElement(document, 'p');
    xtdom.addClassName(bar, 'noprint');
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.background = 'lightgray';
    bar.style.margin = '0';
    bar.style.padding = '5px 40px 5px 40px';  
    body.appendChild(bar);
    return bar;
  },
  
  makeButton : function (name, margin) {
    var b = xtdom.createElement(document, 'input');   
    xtdom.setAttribute(b, 'type', 'button');
    xtdom.setAttribute(b, 'value', name); 
    b.style.margin = margin;
    return b;
  },
  
  // Creates the menu bar elements and display them inside container
  // Calls makeContainer if container is not defined
  // If wrapper is defined it must be the node containing the transformed template,
  // it will be use to dynamically add or remove a 'preview' class 
  display : function (container, wrapper) {
    this.container = container || this.makeContainer ();
    // Input file name field
    var input = xtdom.createElement(document, 'input');       
    xtdom.setAttribute(input, 'id', 'fname');
    xtdom.setAttribute(input, 'type', 'text');
    xtdom.setAttribute(input, 'maxlength', '50');
    xtdom.setAttribute(input, 'value', '');
    input.style.margin = "0 10px 0 10px";   
    var label = xtdom.createElement(document, 'label');
    var t = xtdom.createTextNode(document, 'Data file name :');             
    label.appendChild (t);
    label.appendChild (input);
    var dump = this.makeButton ("Dump", "0 0 0 20px");
    var input = this.makeButton ("Input", "0 10px 0 5px");
    var load = this.makeButton ("Load", "0 0 0 20px");
    var save = this.makeButton ("Save", "0 10px 0 5px");
    this.reload = this.makeButton ("Reload", "0 0 0 10px");
    this.reload.disabled = true;
    var reset = this.makeButton ("Reset", "0 0 0 5px");
    t = xtdom.createTextNode(document, 'WebDAV bar');             
    this.container.appendChild (t);
    this.container.appendChild (dump);
    this.container.appendChild (input);
    this.container.appendChild (label);
    this.container.appendChild (load);
    this.container.appendChild (save);
    if (this.stylesheet) {
      // Publish button
      t = xtdom.createTextNode(document, '/');                  
      this.container.appendChild (t);     
      var publish = this.makeButton ("Publish", "0 0 0 5px");
      this.container.appendChild (publish);
      xtdom.addEventListener(publish, 'click', function () { _this.doPublish() }, false);
    }
    this.container.appendChild (this.reload);
    this.container.appendChild (reset);
    if (wrapper) { // Preview mode 
      this.previewWrapper = wrapper;
      this.previewMode = 0; // Pushing preview will add 'preview' to wrapper class
      this.preview = this.makeButton ("Preview", "0 0 0 20px");
      this.container.appendChild (this.preview);
      xtdom.addEventListener(this.preview, 'click', function () { _this.doToggleViewMode() }, false);     
    }
    if (this.curFilename) {
      var n = document.getElementById('fname'); // sets file name input field
      if (n)  {
        n.value = this.curFilename;
      }
      this.reload.disabled = false; // enables reload button
    }   
    var _this = this; // closure
    xtdom.addEventListener(dump, 'click', function () { _this.doDump() }, false);
    xtdom.addEventListener(input, 'click', function () { _this.doInput() }, false);
    xtdom.addEventListener(load, 'click', function () { _this.doLoad() }, false);
    xtdom.addEventListener(save, 'click', function () { _this.doSave() }, false);
    xtdom.addEventListener(this.reload, 'click', function () { _this.doReload() }, false);
    xtdom.addEventListener(reset, 'click', function () { _this.doReset() }, false);
  },
  
  doDump : function () { 
    var log = new xtiger.util.LogWin ("XML instance data", 400, 600, true);
    // log.dump(this.curform, this.rootTag, this.stylesheet, this.getTemplateName()); 
    log.dump(this.curform);     
  },
  
  // Displays an input popup window and wait for inputWindowLoaded  
  doInput : function () {
    var params = "width=600,height=400,status=yes,resizable=yes,scrollbars=yes";
    var fname = xtiger.bundles.menubar.inputWindowURL;
    if (xtiger.cross.UA.IE) {
      this.inputPopupWindow = window.open(fname);
    } else {
      this.inputPopupWindow = window.open(fname, "Instance Data Input", params);
      this.inputPopupWindow.focus ();
    }
  },

  // Called when the user's has entered data in the input popup window and has clicked on load
  handleInstanceData : function (data) {    
    if (! this.curform.loadDataFromString (data)) {
      alert(this.curform.msg);
    }
  },
  
  doLoad : function (filename) { 
    if (this.curFilename) {
      alert('You have already loaded some data into the template, you must RESET the template first');
      return;
    }          
    var fname = filename || document.getElementById('fname').value;
    if (fname && (fname.search(/\S/) != -1)) {
      var result = new xtiger.util.Logger();
      this.curform.loadDataFromUrl (fname, result);
      if (result.inError()) { 
        alert(result.printErrors());
      } else {
        this.setDataFileUrl (fname);
        this.reload.disabled = false;
      }
    } else {
      alert('You must give a data file name first !')
    }
  },    
       
  // FIXME: do a xtiger.cross.saveDocument method ?
  doSave : function (isForPublication, moreText) {  
    var editor, root, log, data, xhr, buffer, template;
    var fn = this.getInputFileName();
    if (fn) {   
      if (this.curFilename && (this.curFilename == fn)) {
        var msg = 'Are you sure you want to override ' + this.curFilename + ' ?';
        if (moreText) {
          msg += '\n' + moreText;
        }
        var answer = confirm(msg);
        if (isForPublication && (!answer)) {
          msg = 'Do you want to publish the last version of the data anyway ?';
          msg += '\nYou will loose any change you may have made since then';
          answer = confirm(msg);          
          if (answer) {
           return true;
          }
        }
        if (! answer) {
          return false;
        }
      }
      // FIXME: maybe use a 
      // this.curform.setTemplateUrl( url );
      // this.curform.sendDataToServer('PUT', xtiger.cross.getXHRObject(), result)
      editor = this.curform.getEditor(); // XTiger Editor object
      root = this.curform.getRoot();         
      log = new xtiger.util.DOMLogger ();
      data = editor.serializeData (root, log);
      log.close();
      try {
        xhr = xtiger.cross.getXHRObject();
        xhr.open( "PUT", fn,  false);
        xhr.setRequestHeader("Content-Type", "application/xml; charset=UTF-8");
        buffer = "<?xml version=\"1.0\"?>\n" // encoding="UTF-8" ?
        if (this.stylesheet) {
          buffer += '<?xml-stylesheet type="text/xml" href="' + this.stylesheet + '"?>\n'
        }       
        template = this.getTemplateName();             
        if (template) {
          buffer += '<?xtiger template="' + template + '" version="1.0" ?>\n';
        }                                                   
        buffer += log.dump('*');
        xhr.send(buffer); // FIXME: not sure Javascript is UTF-8 by default ?
        if (xhr.readyState  == 4) {
           if((xhr.status  == 201) || (xhr.status  == 204)) {
            if (! isForPublication) {
              if (xhr.responseXML) {
                alert('Result ' + xhr.responseXML);
              } else {
                alert('Result ok (HTTP ' + xhr.status + ')');
              }
            }
            this.setDataFileUrl (fn);
            this.reload.disabled = false;
            return true;
            } else { 
            alert('Error ! Result code : ' + xhr.status);
          }
          }     
      } catch (e) {
        xhr.abort();
        alert('Can\'t save data to "' + fn + '". Exception : ' + e.name + '/' + e.message);
      }
    } else {
      alert('You must give a data file name first !')
    }
    return false;
  },
  
  doReset : function () {   
    if (confirm('Reset will make you loose any change you made to the document, do you confirm it ?')) {
      this.removeDataFileUrl();
    }
    this.reload.disabled = true;    
  },
  
  doReload : function () {
    var fn = this.getDataFileUrl();
    if (fn) {
      var msg = 'Reloading "' + fn + '" will make you loose any change you have done, do you confirm it ?';
      if (confirm(msg)) {
        location.reload(true);
      }
    }
  },  
  
  doToggleViewMode : function () {
    if (this.previewMode == 0) {
      xtdom.addClassName (this.previewWrapper, 'preview');
      xtdom.setAttribute(this.preview, 'value', 'Edit'); 
      this.previewMode = 1;
    } else {
      xtdom.removeClassName (this.previewWrapper, 'preview')
      xtdom.setAttribute(this.preview, 'value', 'Preview'); 
      this.previewMode = 0;
    }
  },  
  
  doPublish : function () {
    if (this.doSave(true, 'Note that you may need to do a page reload to get the latest version')) {
      document.location.href = this.curFilename;
      location.reload(true);
    }   
  } 
} 

// Resource registration
xtiger.resources.addBundle('menubar', 
  { 'inputWindowURL' : 'input.html' } );

