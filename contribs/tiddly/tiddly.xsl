<?xml version="1.0" encoding="utf-8"?>

<!-- This transformation displays an XML document associated with 
     an XTiger XML template inside a browser with an "Edit" button
     added to the top. The button triggers the downloading of the 
     template and transforms it to edit the XML document in place.
     Then it adds a "Save" button to save the document.
     
     The XML document MUST declare an "xtiger" processing
     instruction for the transformation to work. You MUST also 
     configure "axelBase" parameter in this script to point 
     to your AXEL installation.
     
     See the readme.xml file that comes with TiddlyAXEL for more details.   
     
     Tested with Safari, Firefox and Opera
     
     This file must be served from the same domain as the XML document 
     to work on Firefox and Opera. It is not sufficient to set
     security.fileuri.strict_origin_policy to false in about:config
     on Firefox.

     Stéphane Sire
     <s.sire@free.fr>

     Version 0.2
     23 Nov 2010
  -->

<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <xsl:output method="xml" version="1.0"
              doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
              doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
              omit-xml-declaration="yes" indent="yes"
              encoding="UTF-8" media-type="application/xhtml+xml"/>
  
  <!-- <xsl:param name="axelBase">/Users/stephane/Home/svn/xtigerforms/axel</xsl:param>  -->
  <!-- <xsl:param name="axelBase">http://media.epfl.ch/Templates/Latest/axel</xsl:param> -->
  <xsl:param name="axelBase">../../axel</xsl:param>
  
  <xsl:template match="/">
    
    <xsl:variable name="startRef">href="</xsl:variable>
    <xsl:variable name="endParam">"</xsl:variable>
    
    <!-- Extracts the xml-stylesheet processing instruction for including CSS file  
      in order to generate the corresponding link instruction in the ouput -->
    <xsl:variable name="cssInst"><xsl:value-of select="/processing-instruction('xml-stylesheet')[contains(.,'.css')]"/></xsl:variable>
    <xsl:variable name="css"
      select="substring-before(substring-after($cssInst, $startRef), $endParam)"/>
    
    <!-- Extracts the xml-stylesheet processing instruction to know the path to *this* script 
      in order to reserialize it in Javascript save/put functions -->
    <xsl:variable name="xslInst"><xsl:value-of select="/processing-instruction('xml-stylesheet')[contains(.,'.xsl')]"/></xsl:variable>
    <xsl:variable name="stylesheet"
      select="substring-before(substring-after($xslInst, $startRef), $endParam)"/>
    
    <!-- Extracts the axel-stylesheet processing instruction to know which template/css to apply 
      + to reserialize it in Javascript save/put functions -->
    <xsl:variable name="xtigerInst" select="/processing-instruction('xtiger')"/>
    <xsl:variable name="startTemplate">template="</xsl:variable>    
    <xsl:variable name="template"
      select="substring-before(substring-after($xtigerInst, $startTemplate), $endParam)"/>
    <xsl:variable name="editable" 
      select="(string-length($xtigerInst) != 0) and (string-length($template) != 0)"/>     
    
    <!-- *************************************************************
         Generates the output inside an XHTML document
         ___                                                          
         - adds Javscript code to enable edit / save
         - adds link to CSS stylesheet common to editing 
           and static viewing          
         *************************************************************       
      -->  
    
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <link rel="stylesheet" type="text/css" href="{$css}" ></link>
        <link rel="stylesheet" href="{$axelBase}/axel.css" type="text/css"></link>
        <script type="text/javascript" src="{$axelBase}/axel.js"></script>
        <script type="text/javascript">            
  var _axelBundlesPath = "<xsl:value-of select="$axelBase"/>/bundles";
  var _templatePath = "<xsl:value-of select="$template"/>";           
  
  // Processing instructions saved for regenerating them in XML output
  var _pi = ['<xsl:value-of select="$cssInst"/>',
             '<xsl:value-of select="$xslInst"/>',
             '<xsl:value-of select="$xtigerInst"/>'];  
<xsl:choose>
  <xsl:when test="string-length($xtigerInst) = 0">
  alert('Missing "xtiger" processing instruction\nThe document will not be editable');
  </xsl:when>          
  <xsl:when test="string-length($template) = 0">
  alert('Missing "template" parameter in "xtiger" processing instruction\nThe document will not be editable');
  </xsl:when>          
</xsl:choose>        
        </script>  
        <script type="text/javascript"><!--//--><![CDATA[//><!--                        
var form;
var xtDoc; // XML document template holder
function load (filename) {
	var result = new xtiger.util.Logger();
	xtDoc = xtiger.cross.loadDocument(filename, result);
	if (result.inError()) {	
		alert(result.printErrors()); 
	}
} 
function feed (filename) {
	var result = new xtiger.util.Logger();
	var data = xtiger.cross.loadDocument(filename, result);
	if (data) {
		var dataSrc = new xtiger.util.DOMDataSource(data);
		form.loadData(dataSrc, result);
	}
	if (result.inError()) {	alert(result.printErrors()); }
	var n = document.getElementById('save');
	xtdom.removeClassName(n,'axel-core-off');
	n = document.getElementById('edit');
	n.firstChild.data = 'reset';
    if (xtiger.cross.UA.gecko && 
       (-1 == document.location.href.indexOf('file://'))) {
        n = document.getElementById('toDisk');
        xtdom.removeClassName(n,'axel-core-off');
    }	
}
// Writes buffer to filename with an XPCOM component (nsILocalFile)
// FireFox only
function write (filename, buffer) {
  try {  
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
  } catch (e) { 
  	alert('Permission to write file "' + filename + '" denied : ' + e.name + '/' + e.message);
  }  
  try {  
  	// creates and/or saves file		
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);  
    file.initWithPath(filename);
    if (file.exists() == false) {  
      file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );  
    }  
    var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]  
             .createInstance(Components.interfaces.nsIFileOutputStream);  
    outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );   
    //UTF-8 convert  
    var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]  
      .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);  
    uc.charset = "UTF-8";  
    var data_stream = uc.ConvertFromUnicode(buffer);
    var result = outputStream.write(data_stream, data_stream.length );  
    outputStream.close();
  	alert('Data saved sucessfully');	
  } catch (e) { 
  	alert('Cannot save data to file "' + filename + '" : ' + e.name + '/' + e.message);
  }  
}
function put (url, buffer) {
  try {
    xhr = xtiger.cross.getXHRObject();
    xhr.open("PUT", url,  false);
    xhr.setRequestHeader("Content-Type", "application/xml; charset=UTF-8");
    xhr.send(buffer); // FIXME: not sure Javascript is UTF-8 by default ?
    if (xhr.readyState == 4) {
      if((xhr.status == 201) || (xhr.status == 204)) {
        alert('Data saved successfully (' + xhr.responseXML || xhr.status + ')');
      } else { 
        alert('XMLHTTPRequest Error (' + xhr.status + ')');
      }
    }  		
  } catch (e) {
    xhr.abort();
    alert('Can\'t save data to "' + fn + '". Exception : ' + e.name + '/' + e.message);
  }    
}
function save (toDisk) {
    var filePath;
	var dump = new xtiger.util.DOMLogger ();
	form.serializeData (dump);
	var xmlString = dump.dump();
	var procInst  = "<?xml-stylesheet " + _pi[0] + "?>\n" +
	                "<?xml-stylesheet " + _pi[1] + "?>\n" + 
                    "<?xtiger " + _pi[2] + "?>\n";   	
	if (toDisk) {
	    filePath = xtiger.util.fileDialog('save', "*.xml; *.xhtml; *.html", "Select a file to save XML data");              
	    if (filePath) {
	        write(filePath, procInst + xmlString); 
	    }	
	} else if ((0 == document.location.href.indexOf('file://')) && xtiger.cross.UA.gecko) {
	   // converts URL to absolute local path (removes file:// prefix)
	   write(document.location.href.substr(7), procInst + xmlString);
	} else {
	   put(document.location.href, procInst + xmlString);
	}	
}
function edit() {
  load(_templatePath);
  form = new xtiger.util.Form(_axelBundlesPath);
  form.setTemplateSource(xtDoc);
 	form.setTargetDocument (document, 'editor', true);
  form.enableTabGroupNavigation();
  if (! form.transform()) { 
    alert(this .form.msg); 
  } else {    
    feed(document.location.href);
  }
} 
//--><!]]></script>          
      </head>
      <body>
          <xsl:if test="number($editable) = 1">
            <a id="edit" href="javascript:edit()">edit</a> <span id="save" class="axel-core-off"> | <a href="javascript:save()">save</a><span id="toDisk" class="axel-core-off"> | <a href="javascript:save(true)">save to disk</a></span></span> <span style="float: right"><a href="http://media.epfl.ch/Templates/" target="_blank">AXEL</a> powered</span>         
            <hr/>
          </xsl:if>
          <div id="editor"> 
            <xsl:apply-templates/>
          </div>
      </body>
    </html>
  </xsl:template>      
  
  <!-- *************************************************************
       Custom Rules  
       ___
       Add custom Rules below that may be specific to your templates
       *************************************************************       
    -->  
  
  <xsl:template 
    match="Image">             
    <xhtml:img class="figure" src="{@Source}"/>
  </xsl:template>  

  <!--Links from wiki filter-->
  <xsl:template 
    match="Link">             
    <xhtml:a href="{LinkRef}" target="_blank">
      <xsl:value-of select="LinkText"/>
    </xhtml:a>
  </xsl:template>  
  
  <!--Links from link editor-->
  <xsl:template 
    match="RefUrl/Link">             
    <xhtml:a href="{linkRef}" target="_blank">
      <xsl:value-of select="linkText"/>
    </xhtml:a>
  </xsl:template>  
                                
 
  <!-- *************************************************************
       Duplication 
       ___          
       Duplicates all the XML content as is
       *************************************************************       
    -->  
  <xsl:template 
    match="*|@*|text()">
    <xsl:copy>
      <xsl:apply-templates
       select="*|@*|comment()|processing-instruction()|text()"/>
    </xsl:copy>
  </xsl:template>
      
</xsl:stylesheet>
  
  