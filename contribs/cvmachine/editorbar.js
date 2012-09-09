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
  
/////////////////////////////////////////////////////////////////////////////
// The following methods are used to enable buttons behaviors with buttons // 
// declared in templates. They should be grouped into a class soon.        //
/////////////////////////////////////////////////////////////////////////////

function getElementByIdInsideBody(tagname, identifier) {
  var b = document.getElementsByTagName('body')[0];
  var nodes = b.getElementsByTagName(tagname);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes.item(i).getAttribute('id') == identifier) {
      return nodes.item(i);
    }
  } 
}

function toggle(button, target, action) {
  var cur = button.firstChild.data;
  if ((! action) || (action && (cur == action))) {
    target.style.display = guiTrans[cur][0];
    button.firstChild.data = guiTrans[cur][1];
  }
}

function installButton (name) {       
  var n = getElementByIdInsideBody('span', name + 'Toggle');
  var m = getElementByIdInsideBody('p', name);
  if (n && m) {
     n.addEventListener('click', function (ev) { toggle(n, m) }, false);
     toggle(n, m, 'hide');
   } else {
    alert('Failed to install ' + name + ' button !');
   }
}

function installButtons () {       
  for (var i = 0; i < targets.length; i++) {
    installButton(targets[i]);
  } 
}   

////////////////////////////////////////////////////////
// A simple Editor Bar make a template auto-editable // 
///////////////////////////////////////////////////////
                                   
var EditorBar = function Editor (spec) {     
  
  var my = {};      
  // form: form object                                         
  // errLog: error logger
  // xmlFileName: file name of instance XML data to load / save
  
  ////////////////////////////////////////
  // Template and Instance manipulation //
  ////////////////////////////////////////
  
  var transform = function transform () {  
    my.form = new xtiger.util.Form(spec.bundles_URL);
    my.form.setTemplateSource(document);
    my.form.enableTabGroupNavigation();
    return my.form.transform(my.errLog);
  }     
  
  var load = function load () {  
    var filePath, name, data, dataSrc, startt, endt, duration;
    if (false && xtiger.cross.UA.gecko) {  // FIXME: should do that only from file:// 
      filePath = xtiger.util.fileDialog('open', "*.xhtml; *.xml; *.html", "Select a file to load");
      if (filePath) {            
        startt = new Date();
        name = filePath.match(/[^\/]*\.(xml|xhtml|html)$/)[0];
        data = xtiger.debug.loadDocument(filePath, my.errLog);
        if (data) {
          dataSrc = new xtiger.util.DOMDataSource(data);
          if (my.form.loadData(dataSrc, my.errLog)) {
            endt = new Date();                     
            duration = endt.getTime() - startt.getTime();
            // alert( 'File "' + name + '" loaded in ' + duration + 'ms');
          }
        }
        if (my.errLog.inError()) {
          alert(my.errLog.printErrors());
        }        
      }
    } else {                     
      show_nofileapi_dialog(continue_load);
    }    
  }                         

  var show_nofileapi_dialog = function show_nofileapi_dialog (continuation) {
    var params = "width=600,height=400,status=yes,resizable=yes,scrollbars=yes";
    if (xtiger.cross.UA.IE) {
      alert('This is not supported on IE !');
      return;
      // my.popup = window.open(spec.nofileapi_URL);
    } else {
      my.popup = window.open(spec.nofileapi_URL, "Load / Save File Dialog", params);
      my.popup.focus ();
    }                      
    my.todonext = continuation;
  }

  var continue_load = function continue_load () {
    my.todonext = null;
    my.popup_ctrl = my.popup.NoFileAPI({'load' : true, 'callback' : load_document });
  }
    
  // Reveices a String with an XML document and loads it inside the editor
  var load_document = function load_document (aDataString) {
    if (! my.form.loadDataFromString(aDataString)) 
      alert('Error ' + my.form.msg);
  }
  
  var save = function save () {
    var filtePath, name, startt, endt, duration;
    if (false && xtiger.cross.UA.gecko) { // FIXME: should do that only from file://
      filePath = xtiger.util.fileDialog('save', "*.xhtml; *.xml; *.html", "Select a file for saving");
      if (filePath) {         
        name = filePath.match(/[^\/]*\.(xhtml|xml|html)$/)[0];        
        startt = new Date();
        if (my.form.saveDataToFile (filePath)) { 
          endt = new Date();                     
          duration = endt.getTime() - startt.getTime();         
          alert('File "' + name + '" saved in ' + duration + 'ms', 0);
        } else {
          alert('Failed to save "' + name + '" : ' + my.form.msg, 1);
        }
      }
    } else {     
      show_nofileapi_dialog(continue_save);
    }
  }                

  var continue_save = function continue_save () {     
    my.todonext = null; 
    var dump = new xtiger.util.DOMLogger ();
    my.form.serializeData (dump);
    var xmlString = dump.dump();
    my.popup_ctrl = my.popup.NoFileAPI({'save' : true, data : xmlString });
  }
  
  var togglePreview = function togglePreview () {
    if (my.previewMode == 0) {
      xtdom.addClassName (my.previewHandle, 'preview');
      xtdom.setAttribute(my.previewButton, 'value', 'Edit'); 
      my.previewMode = 1;
    } else {
      xtdom.removeClassName (my.previewHandle, 'preview')
      xtdom.setAttribute(my.previewButton, 'value', 'Preview'); 
      my.previewMode = 0;
    }
  }
  
  /////////////////////
  // UI Construction //
  /////////////////////
             
  var makeButton = function makeButton (name, margin) {
    var b = xtdom.createElement(document, 'input');   
    xtdom.setAttribute(b, 'type', 'button');
    xtdom.setAttribute(b, 'value', name); 
    b.style.margin = margin;
    return b;
  }
                           
  // FIXME: changer le label en "create" si pas de nom d'instance
  var installMenu = function installMenu () {                    
    var button, br;
    if (spec.load) {
      button = makeButton("Load", "0 10px 10px 10px");
      my.menu.appendChild(button);
      xtdom.addEventListener(button, 'click', load, false);
    }                
    if (spec.layout == 'vertical') {
      br = xtdom.createElement(document, 'br');   
      my.menu.appendChild(br);      
    }
    if (spec.save) {
      button = makeButton("Save", "0 10px 10px 10px");
      my.menu.appendChild(button);
      xtdom.addEventListener(button, 'click', save, false);
    }                
    if (spec.layout == 'vertical') {
      br = xtdom.createElement(document, 'br');   
      my.menu.appendChild(br);      
    }
    if (spec.preview) {  
      my.previewHandle = document.getElementsByTagName('body')[0];
      my.previewButton = makeButton("Preview", "10px 10px 0 10px");
      my.menu.appendChild(my.previewButton);
      xtdom.addEventListener(my.previewButton, 'click', togglePreview, false);
      my.previewMode = 0;
    }
  }
  
  var initialize = function initialize () {
    my.errLog = new xtiger.util.Logger();
    // 1. transforms template
    transform();
    if (my.errLog.inError()) {
      alert(my.errLog.printErrors()); 
      // FIXME: improve feedback
    }                   
    // 2. installs menu buttons
    if (spec.menuId) {
      my.menu = document.getElementById(spec.menuId);
      if (my.menu)
        installMenu();
    }
  }

  var editorBarPostMessage = function (msg) {
    if ((msg == 'loaded') && my.todonext) {
       my.todonext();  
    }
  }
                            
  //////////////////
  // Installation //
  //////////////////          
  if (spec.manual) {
    xtdom.addEventListener(window, 'load', initialize, false);  
  }                 

  // Horrible trick  
  // To be rewritten with postMessage API I guess
  window.editorBarPostMessage = editorBarPostMessage;
    
  return {                  
      install : initialize // alias 
  }
}
