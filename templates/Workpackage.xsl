<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="partner" match="Partner/PartnerCode" use="normalize-space(.)"/>  
    <!-- partners contains the list of partners -->
    <xsl:variable name="partners" select="/Workpackage/DescriptionOfWork/TaskList/Task/PartnerList/Partner/PartnerCode[generate-id(.)=generate-id(key('partner', normalize-space(.)))]"/>       
    
    <xsl:template match="/">
        <html>
            <head>
                <title>WP Description</title>
                <style>
                    body {
                        margin: 15mm;
                        font-size: 11pt;
                    }
                    table {                     
                    border-collapse: collapse;                  
                    width: 18cm;
                    }
                    .cellData {
                    font-weight: normal;
                    }
                    .partnerCell {
                    min-width: 50px;
                    }        
                    #edit {                     
                        position: absolute;
                        top: 5px;
                        right: 20px;
                    } 
                @media print {                  
                        #edit {                     
                            display: none;
                        } 
                    }
                </style>  
                <script type="text/javascript">
                    // We assume XML content is in a sibling folder of the demo/ folder called data/
                    function edit (template) { 
                        var m = document.location.href.match(/([^\/]*\.(xml|xhtml))/);
                      if (m[0]) {   document.location.href =  '../demos/launch.xhtml#t=' + template + '<xsl:text disable-output-escaping="yes">&amp;</xsl:text>d=' + '../data/' + m[0]; }
                    }
                </script>                   
            </head>
            <body>    
                <p id="edit"><xsl:apply-templates select="processing-instruction()"/></p>
                <xsl:apply-templates select="Workpackage" mode="summary"/>
                <br/>
                <xsl:apply-templates select="Workpackage" mode="content"/>
            </body>
        </html>
    </xsl:template>     
    
    <xsl:template match="processing-instruction('xtiger')">
        <xsl:variable name="template">
             <xsl:value-of select="substring-before(substring-after(.,'template=&quot;'),'&quot;')"/>
        </xsl:variable>
        <a href='javascript:edit(&quot;{$template}&quot;)'>Edit</a>     
    </xsl:template> 

    <xsl:template match="Workpackage" mode="summary">
        <xsl:variable name="wpNB">
            <xsl:choose>
                <xsl:when test="number(Number) = 'NaN'">0</xsl:when>
                <xsl:otherwise><xsl:value-of select="Number"/></xsl:otherwise>
             </xsl:choose>
        </xsl:variable>
        <xsl:variable name="max"><xsl:value-of select="count(/Workpackage/Partners/Partner)"></xsl:value-of></xsl:variable>
        <xsl:variable name="start">
            <xsl:for-each select="DescriptionOfWork/TaskList/Task/Start">
                <xsl:sort select="normalize-space(DescriptionOfWork/TaskList/Task/Start)" order="ascending" data-type="number"/>
                <xsl:if test="position()=1"><xsl:value-of select="normalize-space(.)"/></xsl:if>
            </xsl:for-each>
        </xsl:variable>         
        <!-- header -->
        <table border="1" style="font-weight: bold" cellpadding="4px">
            <tbody>
                <tr>
                    <td>Workpackage number</td>
                    <td><xsl:value-of select="./Number"/></td>
                    <td colspan="{$max - 2}">Start date or starting event</td>
                    <td class="cellData">T<xsl:value-of select="$start"/></td>
                </tr>
                <tr>
                    <td colspan ="{$max + 1}">
                        <xsl:text>Workpage title: </xsl:text><xsl:value-of select ="./Title"/>
                    </td>
                </tr>
                <tr>
                    <td colspan="{$max+ 1}">
                        <xsl:text>Activity type: </xsl:text>
                        <xsl:value-of select="./ActivityType"/>
                    </td>
                </tr>
                <tr>
                    <td>Participant id</td>
                    <xsl:for-each select="/Workpackage/Partners/Partner">
                        <td class="cellData partnerCell"><xsl:value-of select="No"/></td>                   
                    </xsl:for-each>     
                </tr>
                <tr>
                    <td>Participant short name</td>
                    <xsl:for-each select="/Workpackage/Partners/Partner">
                        <td class="cellData partnerCell"><xsl:value-of select="normalize-space(./Name)"/></td>                  
                    </xsl:for-each>
                </tr>
                <tr>
                <td>Person-months per participant</td>
                <xsl:for-each select="/Workpackage/Partners/Partner">   
                    <xsl:variable name="partnerName"><xsl:value-of select="normalize-space(Name)"/></xsl:variable>              
                    <td class="cellData partnerCell"><xsl:value-of select="sum(//Workpackage[child::Number = $wpNB]//pm[normalize-space(preceding-sibling::PartnerCode) = $partnerName])"/></td>                        
                </xsl:for-each>
                </tr>
            </tbody>
        </table>
        <br/>
        <!-- End of header -->          
    </xsl:template>     
    

    <xsl:template match="Workpackage" mode="content">
    
    
    <!-- Objectives -->
    <table border="1" cellpadding="10px">
        <tbody>
            <tr>
                <td><b>Objectives</b>
                <xsl:apply-templates select="./Objectives"/></td>
            </tr>
        </tbody>
    </table>
    <!-- End of Objectives -->
    <br/>
    <!-- Description of work -->
    <table border="1"  cellpadding="10px">
        <tbody>
            <tr>
                <td>
                <p><b>Description of work</b></p>
                <xsl:apply-templates select="./DescriptionOfWork"/>
                </td>
            </tr>
        </tbody>
    </table>
    <!-- End of Description of work -->
    <br/>   
    <!-- Deliverables -->
        <table border="1" cellpadding="10px">
        <tbody>
            <tr>
                <td>
                    <p><b>Deliverables</b></p>
                    <xsl:apply-templates select="./DeliverableList"/>
                </td>
            </tr>
        </tbody>
    </table>
    <!-- Deliverables -->
    </xsl:template>


<xsl:template match="Task">
    <xsl:variable name="theTaskLeaderNo" select=".//Partner[normalize-space(child::TaskLeader) = 'true']/PartnerCode"/>
    <p> <b>
    <xsl:text>Task </xsl:text><xsl:value-of select="./TaskNo"/>
    <xsl:text> - </xsl:text>
    <xsl:value-of select="./Name"/>
    <xsl:text> [Leader: </xsl:text>
        <xsl:value-of select="normalize-space($theTaskLeaderNo)"/>
    <xsl:text>] </xsl:text>
    <xsl:text>  (</xsl:text>
    <xsl:apply-templates select="./PartnerList/Partner">
    </xsl:apply-templates>
    <xsl:text>)</xsl:text>
    <xsl:text> [T</xsl:text><xsl:value-of select="./Start"/>
    <xsl:text> - T</xsl:text><xsl:value-of select="./End"/>
    <xsl:text>]</xsl:text>
    </b>
    </p>
    <xsl:apply-templates select="./Description"/>
</xsl:template>

<xsl:template match="Partner">
    <xsl:variable name ="theCurrentPartner" select="./PartnerCode"/>
    <xsl:value-of select="./PartnerCode"/>
    <xsl:text> </xsl:text>
    <xsl:value-of select ="./pm"/>
    <xsl:text> pm,  </xsl:text>
</xsl:template>

<xsl:template match="Partner[position() = last()]">
    <xsl:variable name ="theCurrentPartner" select="./PartnerCode"/>
    <xsl:value-of select="./PartnerCode"/>
    <xsl:text> </xsl:text>
    <xsl:value-of select ="./pm"/>
    <xsl:text> pm</xsl:text>
    <xsl:text>  </xsl:text>
</xsl:template>

<xsl:template match ="Parag">
    <p><xsl:value-of select ="."/></p>
</xsl:template>

<xsl:template match="List">
    <xsl:apply-templates select="ListHeader"/>
    <ul>
        <xsl:apply-templates select="./ListItem | ./SubList"/>
    </ul>
</xsl:template>

    <xsl:template match ="SubListItem">
        <ul>
            <xsl:apply-templates/>
        </ul>
    </xsl:template>
    
<xsl:template match="ListItem|SubListItem">
    <li><xsl:value-of select="."/></li>
</xsl:template>

<xsl:template match="ListHeader">
    <p><xsl:value-of select="."/></p>
</xsl:template>

<xsl:template match="SubListHeader">
    <li>
        <xsl:value-of select ="."/>
    </li>
</xsl:template>

<xsl:template match="SubList">
    <ul>    
        <xsl:apply-templates/>
    </ul>
</xsl:template>

<xsl:template match="Deliverables">
    <xsl:apply-templates/>
</xsl:template>

<xsl:template match="Deliverable">
    <p>
        <xsl:value-of select="./Code"/>
        <xsl:text> (</xsl:text>
        <xsl:apply-templates select="./DeliveryMonth"/>
        <xsl:text>)</xsl:text>
        <xsl:text> </xsl:text>
        <xsl:value-of select="normalize-space(./Name)"/>
        <xsl:text>, </xsl:text><xsl:value-of select="./Nature"/><xsl:text>, </xsl:text><xsl:value-of select="./DisseminationLevel"/>
        
    </p>
</xsl:template>

<xsl:template match="DeliveryMonth">
    <xsl:text>T</xsl:text>
    <xsl:value-of select="."/>
    <xsl:text>, </xsl:text>
</xsl:template>

<xsl:template match="DeliveryMonth[position() = last()]">
    <xsl:text>T</xsl:text><xsl:value-of select="normalize-space(.)"/>
</xsl:template>

<xsl:template match="Comment">
    <xsl:apply-templates/>
</xsl:template>
</xsl:stylesheet>
