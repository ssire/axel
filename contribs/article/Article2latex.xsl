<?xml version='1.0' encoding="iso-8859-1"?>

<!-- This transformation generates the LaTeX code for an article to be
     published in the Proceedings of an ACM conference, following the
     LaTeX style sig-alternate.cls

     The source should be an XML document edited with the XTiger XML template
     Article.xhtml

     V. Quint, INRIA
     3 May 2010
-->

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  version="2.0">

  <xsl:output method="text" encoding="iso-8859-1" />
  <xsl:strip-space elements="Article" />
  <xsl:preserve-space elements="Code" />

  <xsl:template match="Article">
    <xsl:text>\documentclass{sig-alternate}
\usepackage[latin1]{inputenc}
\special{papersize=8.5in,11in}

\begin{document}
</xsl:text>
    <xsl:apply-templates />
    <xsl:text>

\bibliographystyle{abbrv}
\bibliography{DocEng2010} %% prepare a BibTeX file named DocEng2010.bib

\end{document}
</xsl:text>
  </xsl:template>

  <!-- translate references to the bibliography. Those are supposed to
       be written in the source XML documents as [ref xxx], where xxx is
       the label of the relevant entry in the BibTeX file
       Note: the 'replace' function requires an XSLT 2.0 engine -->
  <xsl:template match="text()">
    <xsl:value-of select="replace(., '\[ref (\S*)\]', '\\cite{$1}')"/>
  </xsl:template>

  <!-- replace character underscore by dash to avoid troubles with LaTeX -->
<!--
  <xsl:template match="text()">
    <xsl:value-of select="translate(., '_', '-')"/>
  </xsl:template>
-->

  <!-- add a backslash before a few special LaTeX characters -->
<!--
  <xsl:template match="text()">
    <xsl:value-of select="replace(., '\{', '\\{')"/>
  </xsl:template>
  <xsl:template match="text()">
    <xsl:value-of select="replace(., '\}', '\\}')"/>
  </xsl:template>
  <xsl:template match="text()">
    <xsl:value-of select="replace(., '%', '\\%')"/>
  </xsl:template>
  <xsl:template match="text()">
    <xsl:value-of select="replace(., '[', '\\[')"/>
  </xsl:template>
  <xsl:template match="text()">
    <xsl:value-of select="replace(., ']', '\\]')"/>
  </xsl:template>
-->

  <!-- remove the bibliography: use BibTeX instead -->
  <xsl:template match="references">
  </xsl:template>

  <xsl:template match="Article/name">
    <xsl:text>\conferenceinfo{</xsl:text>
      <xsl:apply-templates/>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Article/date/text() | Article/loc/text() |
                       date/begin/text() | date/end/text()">
  </xsl:template>

  <xsl:template match="Article/date">
    <xsl:text> {</xsl:text>
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Article/date/begin">
    <xsl:apply-templates/>
    <xsl:text>--</xsl:text>
  </xsl:template>

  <xsl:template match="Article/date/end">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="month">
    <xsl:apply-templates/>
    <xsl:text> </xsl:text>
  </xsl:template>

  <xsl:template match="Article/loc">
    <xsl:text>, </xsl:text>
    <xsl:apply-templates/>
    <xsl:text>.}
</xsl:text>
  </xsl:template>

  <xsl:template match="city">
    <xsl:apply-templates/>
    <xsl:text>, </xsl:text>
  </xsl:template>

  <xsl:template match="country">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Article/copyright_year">
    <xsl:text>\CopyrightYear{</xsl:text>
      <xsl:apply-templates/>
    <xsl:text>}
</xsl:text>
  </xsl:template>

  <xsl:template match="Article/article_title">
    <xsl:text>
\title{</xsl:text>
      <xsl:apply-templates/>
    <xsl:text>}

</xsl:text>
  </xsl:template>

  <xsl:template match="Article/authors">
    <xsl:text>\numberofauthors{</xsl:text><xsl:value-of select="count(author)"/><xsl:text>}
\author{</xsl:text>
      <xsl:apply-templates/>
    <xsl:text>
}

</xsl:text>
  </xsl:template>

  <xsl:template match="Article/authors/text() | authors/author/text() |
                       author/address/text()">
  </xsl:template>

  <xsl:template match="author">
    <xsl:text>
   \alignauthor </xsl:text>
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="author/name">
    <xsl:apply-templates/>
    <xsl:text>\\</xsl:text>
  </xsl:template>

  <xsl:template match="author/address">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="address/line">
    <xsl:text>
   \affaddr{</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>}\\</xsl:text>
  </xsl:template>

  <xsl:template match="author/email">
    <xsl:text>
   \email{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Article/abstract/text()">
  </xsl:template>

  <xsl:template match="Article/abstract">
    <xsl:text>\maketitle

\begin{abstract}</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>
\end{abstract}
</xsl:text>
  </xsl:template>

  <xsl:template match="Article/categories/text()">
  </xsl:template>
  <xsl:template match="categories/category/text()">
  </xsl:template>
  <xsl:template match="category/list/text()">
  </xsl:template>
  <xsl:template match="sub_category/text()">
  </xsl:template>
  <xsl:template match="sub_sub_category/text()">
  </xsl:template>

  <xsl:template match="category">
    <xsl:text>
\category</xsl:text>
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="category/NUM">
    <xsl:text>{</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>.</xsl:text>
  </xsl:template>

  <xsl:template match="category/num">
    <xsl:apply-templates/>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="category/name">
    <xsl:text>{</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="sub_category/name">
    <xsl:text>{</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="sub_sub_category/names">
    <xsl:text>[</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>]</xsl:text>
  </xsl:template>

  <xsl:template match="terms">
    <xsl:text>
\terms{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="keywords">
    <xsl:text>
\keywords{</xsl:text><xsl:apply-templates/><xsl:text>}
</xsl:text>
  </xsl:template>

  <xsl:template match="sections/text()">
  </xsl:template>
  <xsl:template match="a_section/text()">
  </xsl:template>

  <xsl:template match="a_section/heading">
    <xsl:text>

\section{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="SubTitle">
    <xsl:text>

\subsection{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Parag/text()">
  </xsl:template>

  <xsl:template match="Parag">
    <xsl:text>

</xsl:text>
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Fragment">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Fragment[@FragmentKind='verbatim']">
    <xsl:text>\texttt{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Fragment[@FragmentKind='important']">
    <xsl:text>\textit{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Link/text()">
  </xsl:template>

  <xsl:template match="Link">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Link/LinkText">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="Link/LinkRef">
  </xsl:template>

  <xsl:template match="List/text()">
  </xsl:template>
  <xsl:template match="List/ListItem/text()">
  </xsl:template>

  <xsl:template match="List/ListHeader">
    <xsl:apply-templates/>
    <xsl:text>
\begin{itemize}</xsl:text>
  </xsl:template>

  <xsl:template match="List">
    <xsl:text>

</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>
\end{itemize}
</xsl:text>
  </xsl:template>

  <xsl:template match="List/ListItem">
    <xsl:text>
  \item </xsl:text>
    <xsl:apply-templates />
  </xsl:template>

  <xsl:template match="Code/text()">
  </xsl:template>

  <xsl:template match="Code">
    <xsl:text>

\begin{figure}[ht]
\begin{verbatim}</xsl:text>
    <xsl:apply-templates />
    <xsl:text>
\end{figure}</xsl:text>
  </xsl:template>

  <xsl:template match="Code/caption">
    <xsl:text>
\end{verbatim}
\caption{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="Figure/text()">
  </xsl:template>

  <xsl:template match="Figure">
    <xsl:text>

\begin{figure}[ht]
\centering</xsl:text>
    <xsl:apply-templates />
    <xsl:text>
\end{figure}</xsl:text>
  </xsl:template>

  <xsl:template match="Figure/caption">
    <xsl:text>
\caption{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
  </xsl:template>

  <!-- all images must be converted to eps format before making the
       transformation -->
  <xsl:template match="image">
    <xsl:text>
\psfig{file=</xsl:text>
    <xsl:value-of select="substring-before(string(@Source),'.png')"/>
    <xsl:value-of select="substring-before(string(@Source),'.gif')"/>
    <xsl:value-of select="substring-before(string(@Source),'.jpg')"/>
    <xsl:value-of select="substring-before(string(@Source),'.jpeg')"/>
    <xsl:text>.eps, width=8.45cm,}</xsl:text>
  </xsl:template>

</xsl:stylesheet>
