<?xml version="1.0" encoding="utf-8"?>

<!-- First pass for the transformation of an XTiger XML template into an
     XML Schema. See transformation XTiger2Schema.xsl for the second pass.

     This first pass removes most of the XHTML code from an XTiger XML template
     as well as all text contents. The output is a "clean" XTiger XML template.

     Vincent Quint, INRIA
     <vincent.quint@inria.fr>

     Version 0.3
     21 April 2010

     This transformation can be run with an XSLT 1.0 engine.
  -->

<xsl:transform version="1.0"
               xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
               xmlns:xt="http://ns.inria.org/xtiger"
               xmlns:ht="http://www.w3.org/1999/xhtml">
  <xsl:output method="xml" version="1.0"
              omit-xml-declaration="no" indent="yes"
              encoding="utf-8" media-type="application/xml"/>

  <!-- from the HTML namespace, keep only the root html element and the body -->
  <xsl:template match="/ht:html">
     <xsl:copy>
       <xsl:apply-templates />
     </xsl:copy>
  </xsl:template>
  <xsl:template match="ht:body">
     <xsl:copy>
       <xsl:apply-templates />
     </xsl:copy>
  </xsl:template>

  <!-- remove all text contents -->
  <xsl:template match="text()"/>

  <!-- remove all xt:menu-marker elements -->
  <xsl:template match="xt:menu-marker"/>

  <!-- keep all other XTiger elements with their attributes -->
  <xsl:template match="@* | xt:*">
     <xsl:copy>
       <xsl:apply-templates select="@*|node()"/>
     </xsl:copy>
  </xsl:template>

  <!-- keep the 'param' attribute only if it contains "filter=wiki" or
       "filter=image", and in that case, keep only the filter and its value -->
  <xsl:template match="@param">
    <xsl:if test="contains(., 'filter=wiki')">
      <xsl:attribute name="param">
        <xsl:text>filter=wiki</xsl:text>
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="contains(., 'filter=image')">
      <xsl:attribute name="param">
        <xsl:text>filter=image</xsl:text>
      </xsl:attribute>
    </xsl:if>
  </xsl:template>

</xsl:transform>
