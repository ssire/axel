<?xml version="1.0" encoding="UTF-8"?>                       

<!-- This transformation generates the DocBook code for an article to be
     published in the Proceedings of an XML Prague conference (or any other 
     conference which accepts docbook submissions)

     The source should be an XML document edited with the XTiger XML template
     Article.xhtml

     S. Sire, Media Research Group (EPFL)
     12 May 2010
-->

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0"
    xmlns="http://docbook.org/ns/docbook"
    xmlns:xl="http://www.w3.org/1999/xlink">
    
    <xsl:output method="xml" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:template match="/Article|/document">
    <article version="5.0" xml:lang="en">
    
        <info>
            <title><xsl:value-of select="article_title"/></title>
            <authorgroup>
                <xsl:apply-templates select="authors"/>
            </authorgroup>
        
            <keywordset>
                <keyword>XML</keyword>            
                <keyword>authoring</keyword>
                <keyword>document template</keyword>
                <keyword>client-side Javascript library</keyword>         
            </keywordset>
        
            <abstract>
                <xsl:apply-templates select="abstract"/>            
            </abstract>
        </info>
    
        <xsl:apply-templates select="sections/a_section"/>
    
        <xsl:apply-templates select="references"/>
    
    </article>
    </xsl:template>    
    
    <xsl:template match="authors">
        <xsl:apply-templates select="author"/>
    </xsl:template>
    
    <xsl:template match="author">
        <author>
            <personname><xsl:apply-templates select="name"/></personname>
            <email><xsl:value-of select="email"/></email>
            <affiliation>                
                <orgname><xsl:value-of select="address/line"/></orgname>
            </affiliation>
        </author>
    </xsl:template>
    
    <xsl:template match="abstract">
        <xsl:apply-templates select="Parag"/>
    </xsl:template>    
    
    <xsl:template match="a_section">
        <xsl:variable name="secnb"><xsl:value-of select="count(./preceding::a_section) + 1"/></xsl:variable>
        <section xml:id="Section-{$secnb}">
            <title><xsl:value-of select="heading"/></title>     
<!--            <xsl:apply-templates select="child::node()"/>-->            
            <xsl:for-each-group select="child::node()" group-starting-with="SubTitle">
                <xsl:choose>
                    <xsl:when test="./name() = 'SubTitle'">
                        <section xml:id="Section-{concat($secnb, '.', count(./preceding-sibling::SubTitle) + 1)}">
                            <title><xsl:value-of select="."/></title>
                            <xsl:apply-templates select="current-group()"/>
                        </section>                        
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates select="current-group()"/>
                    </xsl:otherwise>
                </xsl:choose>                
            </xsl:for-each-group>
        </section>            
    </xsl:template>
    
<!--    <xsl:template match="references">
         <xsl:apply-templates select="reference"/>
    </xsl:template> -->      
        
    <!--///////////////////////
         Rich Text block 
        ///////////////////////-->
    
    <xsl:template match="heading"/>    
    
    <xsl:template match="SubTitle"/>
        
    <xsl:template match="Parag">
        <para><xsl:apply-templates select="Fragment|Link"/></para>
    </xsl:template>            

    <xsl:template match="Fragment[@FragmentKind = 'verbatim']">
        <computeroutput><xsl:value-of select="."/></computeroutput>
    </xsl:template>    

    <xsl:template match="Fragment[@FragmentKind = 'important']">
        <emphasis><xsl:value-of select="."/></emphasis>
    </xsl:template>
    
    <xsl:template match="Fragment">
        <xsl:analyze-string select="." regex="\[(.*?)\]">
            <xsl:matching-substring>
                <citation><xsl:value-of select="regex-group(1)"/></citation>
            </xsl:matching-substring>
            <xsl:non-matching-substring>
                <xsl:call-template name="filter-fig-ex">
                    <xsl:with-param name="content"><xsl:value-of select="."/></xsl:with-param>
                </xsl:call-template>
            </xsl:non-matching-substring>    
        </xsl:analyze-string>  
    </xsl:template>
    
    <xsl:template name="filter-fig-ex">
        <xsl:param name="content"/>
        <xsl:analyze-string select="$content" regex="[Ff]igure (\d\d?)">
            <xsl:matching-substring>
                <xref linkend="Fig-{regex-group(1)}"/>
            </xsl:matching-substring>
            <xsl:non-matching-substring>
                <xsl:analyze-string select="." regex="[Ee]xample (\d\d?)">
                    <xsl:matching-substring>
                        <xref linkend="Ex-{regex-group(1)}"/>
                    </xsl:matching-substring>
                    <xsl:non-matching-substring>
                        <xsl:analyze-string select="." regex="[Ss]ection (\d)(\.(\d))?">
                            <xsl:matching-substring>
                                <xsl:choose>
                                    <xsl:when test="regex-group(3)">
                                        <xref linkend="Section-{concat(regex-group(1),'.', regex-group(3))}"/> 
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xref linkend="Section-{regex-group(1)}"/>                                        
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:matching-substring>
                            <xsl:non-matching-substring>
                                <xsl:value-of select="."/>
                            </xsl:non-matching-substring>
                        </xsl:analyze-string>
                    </xsl:non-matching-substring>
                </xsl:analyze-string>
            </xsl:non-matching-substring>
        </xsl:analyze-string>                
    </xsl:template>
    
    <xsl:template match="Link">        
        <link xl:href="{./LinkRef}"><xsl:value-of select="./LinkText"/></link>
    </xsl:template>  
    
    <xsl:template match="List">
        <xsl:apply-templates select="ListHeader"/>
        <itemizedlist>
            <xsl:apply-templates select="./ListItem | ./SubList"/>
        </itemizedlist>
    </xsl:template>    
    
    <xsl:template match="ListHeader">
        <para><!-- ListHeader converted to para-->
            <xsl:value-of select="."/>    
        </para>            
    </xsl:template>    
    
    <xsl:template match="ListItem|SubListItem">
        <listitem>
            <para>
                <xsl:apply-templates select="./child::node()"></xsl:apply-templates>
            </para>
        </listitem>
    </xsl:template>
    
    <xsl:template match="SubList">
        <itemizedlist>
            <xsl:apply-templates/>
        </itemizedlist>
    </xsl:template>
        
    <xsl:template match="SubListHeader">
        <para><!-- SubListHeader converted to para-->
            <xsl:value-of select="."/>
        </para>
    </xsl:template>
        
    <xsl:template match="Figure">
        <figure xml:id="Fig-{count(./preceding::Figure) + 1}">
            <title><xsl:value-of select="caption"/></title>
            <mediaobject>
                <imageobject>
                    <imagedata fileref='{image/@Source}' align="center" scalefit="1" width="14cm"/>
                </imageobject>
            </mediaobject>
        </figure>        
    </xsl:template>
    
    <xsl:template match="Code">
        <example xml:id="Ex-{count(./preceding::Code) + 1}">
            <title>
                <xsl:call-template name="filter-fig-ex">
                    <xsl:with-param name="content"><xsl:value-of select="caption"/></xsl:with-param>
                </xsl:call-template>
            </title>            
            <programlisting><xsl:text disable-output-escaping="yes">&lt;![CDATA[</xsl:text>                
<xsl:value-of  disable-output-escaping="yes" select="code"/><xsl:text  disable-output-escaping="yes">]]&gt;</xsl:text></programlisting>
        </example>
    </xsl:template>    

    <!--///////////////////////
        Bibliography 
        ///////////////////////-->       
    
    <xsl:template match="references">
        <bibliography xml:id="references">
            <xsl:apply-templates select="reference"/>
        </bibliography>            
    </xsl:template>    
    
    <xsl:template match="reference">                    
        <xsl:variable name="name">
            <xsl:analyze-string select=".//authors/author[1]/name" regex="(\w\.\s){{0,2}}([\w\s]+)">
                <xsl:matching-substring>
                    <xsl:value-of select="regex-group(2)"/>                    
                </xsl:matching-substring>
                <xsl:non-matching-substring>
                </xsl:non-matching-substring>
            </xsl:analyze-string>            
        </xsl:variable>
        <xsl:variable name="yy">
            <xsl:if test=".//conf">
                <xsl:analyze-string select=".//conf" regex="\d\d(\d\d)" flags="">
                    <xsl:matching-substring>
                        <xsl:if test="position() = 2">
                            <xsl:value-of select="regex-group(1)"/>
                        </xsl:if>
                    </xsl:matching-substring>
                    <xsl:non-matching-substring>
                    </xsl:non-matching-substring>
                </xsl:analyze-string>
            </xsl:if>
        </xsl:variable>                
        <bibliomixed>                        
            <abbrev><xsl:value-of select="$name"/><xsl:value-of select="$yy"/></abbrev>
            <xsl:apply-templates select="refbook|refarticle|refreport"/>
        </bibliomixed>            
    </xsl:template>        
    
    <xsl:template match="refbook|refarticle|refreport">
        <xsl:apply-templates select="authors|title|publisher|conf|url" mode="biblio"/>                                
    </xsl:template>

    <xsl:template match="authors" mode="biblio">
        <xsl:apply-templates select="author" mode="biblio"/>
    </xsl:template>

    <xsl:template match="author[count(following-sibling::author) &gt; 0]" mode="biblio">
        <xsl:value-of select="."/><xsl:text> – </xsl:text> 
    </xsl:template>
    
    <xsl:template match="author[position() = last()]" mode="biblio">
        <xsl:value-of select="."/>:
    </xsl:template>
    
    <xsl:template match="title" mode="biblio">
        <title><xsl:value-of select="."/></title>.        
    </xsl:template>        
        
    <xsl:template match="publisher" mode="biblio">
        <xsl:value-of select="."/>        
    </xsl:template>            

    <xsl:template match="conf" mode="biblio">
        <xsl:value-of select="."/>        
    </xsl:template>        

    <xsl:template match="url" mode="biblio">
        <bibliomisc><link xl:href="{.}"/></bibliomisc>
    </xsl:template>            
         
<!-- The transformation is unfinished at this point
     as it doesn't transforms the following components  -->

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
