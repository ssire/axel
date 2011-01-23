<?xml version="1.0" encoding="UTF-8"?>                       

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <xsl:output omit-xml-declaration="yes" method="xml" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd" encoding="UTF-8" media-type="text/html" indent="yes"/>
  
  <xsl:param name="base">.</xsl:param>

  <xsl:template match="/">           
    <xhtml:html>
      <xhtml:head>
        <xhtml:link rel="stylesheet" type="text/css" href="{$base}/Study.css" ></xhtml:link>          
      </xhtml:head>
      <xhtml:body>       
          <xsl:apply-templates/>
      </xhtml:body>
    </xhtml:html>
  </xsl:template>
  
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
  
  
  <!--Turns Key into @id-->
  <xsl:template 
    match="Key">
    <xhtml:span>
      <xsl:attribute name="id"><xsl:value-of select="."/></xsl:attribute>
      <xsl:copy-of select="."/>      
    </xhtml:span>      
  </xsl:template>

  <xsl:template 
    match="*|@*|text()">
    <xsl:copy>
      <xsl:apply-templates
       select="*|@*|comment()|processing-instruction()|text()"/>
    </xsl:copy>
  </xsl:template>
      
</xsl:stylesheet>
  
  