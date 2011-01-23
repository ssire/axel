<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
<xsl:template match="/Article">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <title><xsl:value-of select="article_title"/></title>
  <link rel="stylesheet" type="text/css" href="Article.css"/>
</head>    
<body>            
<p class="conferenceinfo">
  <span class="conferencename"><xsl:value-of select="name"/>,</span>
  <span class="conferencedateandloc"><xsl:apply-templates select="date"/>, <xsl:apply-templates select="loc"></xsl:apply-templates>,</span>
  <span class="copyrightyear"><xsl:value-of select="copyright_year"/></span>
</p>

<h1><xsl:value-of select="article_title"/></h1>

<div class="authors">
    <xsl:apply-templates select="authors"/>
</div>

<div class="abstract">
    <p class="heading">ABSTRACT</p>
    <xsl:apply-templates select="abstract"/>
</div>

<xsl:apply-templates select="descr"/>

<xsl:apply-templates select="sections/a_section"/>

<h2>References</h2>
<xsl:apply-templates select="references"/>
</body>
</html>
</xsl:template>
    
    <xsl:template match="date">
        from <xsl:apply-templates select="begin"/> to <xsl:apply-templates select="end"/>
    </xsl:template>        
    
    <xsl:template match="begin|end">
        <xsl:value-of select="month"/>-<xsl:value-of select="day"/>
    </xsl:template>        

    <xsl:template match="loc">
        <xsl:value-of select="city"/>, <xsl:value-of select="country"/>   
    </xsl:template>
    
    <xsl:template match="authors">
        <xsl:apply-templates select="author"/>
    </xsl:template>
    
    <xsl:template match="author">
        <p class="vcard">
            <xsl:apply-templates select="name"/>
            <xsl:apply-templates select="address"/>
            <span class="email">
                <xsl:value-of select="email"/>
            </span>
        </p>        
    </xsl:template>

    <xsl:template match="name">
        <span class="fn">
            <xsl:value-of select="."/>
        </span>
        <br/> 
    </xsl:template>
    
    <xsl:template match="address">
        <xsl:apply-templates select="line"/>        
    </xsl:template>
    
    <xsl:template match="line">
        <span class="addr">
            <xsl:value-of select="."/>
        </span>
        <br/>
    </xsl:template>    
    
    <xsl:template match="abstract">
        <xsl:apply-templates select="Parag"/>
    </xsl:template>    
    
    <xsl:template match="a_section">
         <h2>
            <xsl:value-of select="heading"/>
         </h2>     
         <xsl:apply-templates select="child::node()"/>
    </xsl:template>        
    
    <xsl:template match="references">
         <xsl:apply-templates select="reference"/>
    </xsl:template>       
        
    <!--///////////////////////
         Rich Text block 
        ///////////////////////-->
    
    <xsl:template match="heading"/>    
    
    <xsl:template match="SubTitle">
        <h3>
            <xsl:value-of select="."/>                
        </h3>
    </xsl:template>            
        
    <xsl:template match="Parag">
        <p class="parag">
            <xsl:apply-templates select="Fragment"/>                
        </p>
    </xsl:template>            

    <xsl:template match="Fragment[@FragmentKind = 'verbatim']">
        <span class="verbatim"><xsl:value-of select="."/></span>
    </xsl:template>    

    <xsl:template match="Fragment[@FragmentKind = 'important']">
        <span class="important"><xsl:value-of select="."/></span>
    </xsl:template>
    
    <xsl:template match="Fragment">
        <xsl:value-of select="."/>
    </xsl:template>
    
    <xsl:template match="List">
        <xsl:apply-templates select="ListHeader"/>
        <ul>
            <xsl:apply-templates select="./ListItem | ./SubList"/>
        </ul>
    </xsl:template>    
    
    <xsl:template match="ListHeader">
        <p>
            <xsl:value-of select="."/>
        </p>
    </xsl:template>    
    
    <xsl:template match="ListItem|SubListItem">
        <li>
            <xsl:value-of select="."/>
        </li>
    </xsl:template>
    
    <xsl:template match="SubList">
        <ul>
            <xsl:apply-templates/>
        </ul>
    </xsl:template>
    
    <xsl:template match="SubListItem">
        <ul>
            <xsl:apply-templates/>
        </ul>
    </xsl:template>
    
    <xsl:template match="SubListHeader">
        <li>
            <xsl:value-of select="."/>
        </li>
    </xsl:template>
    
    <xsl:template match="Figure">    
        <div class="figure">
            <div class="center">
            <img src="{image/@Source}"/>
            <p class="figure-caption"><xsl:value-of select="caption"/></p>
            </div>
        </div>
    </xsl:template>
    
    <xsl:template match="Code">
        <div class="code">
            <pre>
            <xsl:value-of select="code"/>
            </pre>
            <p class="code-caption"><xsl:value-of select="caption"/></p>
        </div>
    </xsl:template>    

    <!--///////////////////////
        Bibliography 
        ///////////////////////-->       
    
    <xsl:template match="refbook|refarticle|refreport">
         <p class="biblio-entry">    
             <xsl:apply-templates select="authors|title|publisher|conf|url" mode="biblio"/>                                
         </p>                
    </xsl:template>

    <xsl:template match="authors" mode="biblio">
        <xsl:apply-templates select="author" mode="biblio"/>
    </xsl:template>

    <xsl:template match="author" mode="biblio">
        <xsl:value-of select="."/>,
    </xsl:template>
    
    <xsl:template match="title" mode="biblio">
        <span class="title"><xsl:value-of select="."/></span>,        
    </xsl:template>        
        
    <xsl:template match="publisher" mode="biblio">
        <span class="publication"><xsl:value-of select="."/></span>        
    </xsl:template>            

    <xsl:template match="conf" mode="biblio">
        <span class="publication"><xsl:value-of select="."/></span>        
    </xsl:template>        

    <xsl:template match="url" mode="biblio">
        <a href="{.}" target="_blank"><xsl:value-of select="."/></a>        
    </xsl:template>            

<!--        <xt:component name="descr">
            <p class="left-repeater">                              
                <xt:menu-marker/>
            </p>            			
            <div class="descr">    
                <p class="heading">Categories and Subject Descriptors</p>
                <xt:repeat minOccurs="0" label="categories">
                    <xt:use types="category" label="category" />
                </xt:repeat>
                <p class="heading">General Terms</p>
                <p class="terms"><xt:use types="string" label="terms" option="unset"> </xt:use></p>
                <p class="heading">Keywords</p>
                <p class="keywords"><xt:use types="string" label="keywords" option="set"> </xt:use></p>
            </div>   
        </xt:component>
                
        <xt:component name="subsubcategory">
            &#x2014;
            <span class="catlevel4"><xt:use types="string" label="names">name, name</xt:use></span>
        </xt:component>
        
        <xt:component name="subcategory">
            <span class="catlevel3"><xt:use types="string" label="name">name</xt:use></span>
            <xt:use types="subsubcategory" label="sub_sub_category" option="set" />
        </xt:component>
        
        <xt:component name="category">
            <p class="category">
                <xt:menu-marker size="20"/>	
                <span class="catnumlevel1and2"><xt:use types="string" label="NUM">X</xt:use>.<xt:use types="string" label="num">n</xt:use></span>
                [<span class="catnamelevel1and2"><xt:use types="string" label="name">Name</xt:use></span>]:
                <xt:repeat minOccurs="1" label="list">
                    <xt:use types="subcategory" label="sub_category" />
                </xt:repeat>				
            </p>
        </xt:component>
 -->       
        
</xsl:stylesheet>
