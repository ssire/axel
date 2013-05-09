# Executive summary : How to write XTiger XML document templates for AXEL version 1 ? 

This document summarizes the <a href="http://ssire.github.io/xtiger-xml-spec/" target="xtiger-specification">XTiger XML specification</a> and its implementation in the AXEL library. Some of the links open the AXEL demonstration editor with a self-demonstrating template of the feature described. Open them and test the corresponding editor, then click on the Dump button of the editor to see the generated XML output document; with Firefox (recommended) click on the Source button to see the template source. Some other links open either the specification itself or some extra documentation.

## 1 You need to write the XTiger XML <a href="../editor/editor.xhtml#samples/Template" target="axel-demo-editor">template document</a> as an XHTML file with the `"xt"` namespace prefix associated with the `"http://ns.inria.org/xtiger"` namespace. 

Limitation: you MUST call the XTiger prefix `"xt"` 

Example:

    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:xt="http://ns.inria.org/xtiger">

## 2 You must declare an `xt:head` section inside the HTML head section. At least you must declare the name of the XML root element of the XML output document in a `label` attribute (<a href="http://ssire.github.io/xtiger-xml-spec/#head" target="xtiger-specification">spec</a>).

Example:

    <xt:head label="Document"/>

## 3 You can create simple entry fields with primitive editors. Primitive editors are implemented as Javascript classes that we call plugin (<a href="howto-plugins.html" target="_blank">howto</a>). AXEL comes with a pre-defined set of plugins: <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"text"</a>, <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"select"</a>, <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"photo"</a>, "file", <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"link"</a>, <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"video"</a>, <a href="../editor/editor.xhtml#plugins/Text" target="axel-demo-editor">"content"</a> (the last 5 are still unstable and subject to future change).

You can insert a primitive editor that generates some content in the XML output document with an <a href="../editor/editor.xhtml#basics/Use" target="axel-demo-editor">"xt:use"</a> element. The `types` attribute must contain the plugin name. The content of the `xt:use` element initializes the default content of the primitive editor. You can also declare a `label` attribute, it will open a new XML tag in the XML output document where the primitive editor will serialize its content (<a href="http://ssire.github.io/xtiger-xml-spec/#use" target="xtiger-specification">spec</a>). 

Example:

    <xt:use types="text" label="Name">Click to edit your name</xt:use>

To insert a primitive editor to generate an XML attribute you must use the <a href="../editor/editor.xhtml#basics/Attribute" target="axel-demo-editor">"xt:attribute"</a> element with a `types` attribute set to the plugin name and a `name` attribute set to the attribute name (<a href="http://ssire.github.io/xtiger-xml-spec/#attribute" target="xtiger-specification">spec</a>). 

Example:

    <xt:attribute types="text" name="Nickname">Click to edit your nickname</xt:use>
    
Limitation: when using the `xt:attribute` element with a plugin like the `"select"` plugin that defines a finite choice between different values defined by a `values` attribute, the default value MUST be declared inside a `default` attribute of the `xt:attribute` (and not in the `xt:attribute` content as with the `xt:use` element).

Example:

    <xt:attribute types="select" name="Color" values="red green blue" default="red"/>

Some plugins are not compatible with the `xt:attribute` element when their XML output content model is not a scalar value. This is the case for the "link" plugin for instance that generates two sibling XML elements that cannot be stored inside an XML attribute.

Each plugin defines its own parameters that you can set in the `param` attribute of the `xt:use` or `xt:attribute` element. See the demonstration template for each plugin in the "plugins" folder of the templates for a description of each parameter.

Note: AXEL-FORMS extends AXEL with two form-oriented plugins: <a target="axel-forms-demonstration-editor" href="http://ssire.github.io/axel-forms/editor/editor.xhtml#plugins/Input">"input"</a>, <a target="axel-forms-demonstration-editor" href="http://ssire.github.io/axel-forms/editor/editor.xhtml#plugins/Choice">"choice"</a>.

## 3bis You can specialize a primitive editor by applying filters. Each filter is implemented by a Javascript class and has a unique identifier (<a href="howto-filters.html" target="_blank">howto</a>). You set one or more filters on a primitive editor with the `filter` parameter of the `param` attribute. AXEL comes wit a set of pre-defined filters: <a href="../editor/editor.xhtml#filters/Date" target="axel-demo-editor">"date"</a>, <a href="../editor/editor.xhtml#filters/Wiki" target="axel-demo-editor">"wiki"</a>, <a href="../editor/editor.xhtml#filters/Style" target="axel-demo-editor">"style"</a>, <a href="../editor/editor.xhtml#filters/Optional" target="axel-demo-editor">"optional"</a>, <a href="../editor/editor.xhtml#filters/Image" target="axel-demo-editor">"image"</a>, <a href="../editor/editor.xhtml#filters/Video" target="axel-demo-editor">"video"</a> (the last 2 are unsupported and for illustrative purpose)

You can set several filters as a whitespace separated list. Some filters are exclusive of each other. Each filter adds its own parameters that you can declare inside the `param` attribute. Usually their name starts with the filter unique identifier followed by underscore. See the demonstration template for each filer in the "filters" folder of the templates for a description of each parameter.

Example:

    <xt:use types="text" param="filter=date">0/1/01/2012</xt:use>
    
Limitation: the "date" filter currently defines the user's language as French to display date, the self-describing template explains how to add other regions.

## 4 You can create XML hierarchical structures by declaring `xt:component` elements identified by a unique `name` attribute in the `xt:head` section of the template. Then you can insert those components at any position inside the document, or inside another component, with an `xt:use` element with a `types` attribute set to the name of the `xt:component` element (<a href="http://ssire.github.io/xtiger-xml-spec/#component" target="xtiger-specification">spec</a>).

Example:

    <xt:component name="a_contact">
      <xt:use types="text" label="Name">Name</xt:use> (<xt:use types="text" label="Phone">phone number</xt:use>)
    </xt:component>
    ...
    <xt:use types="a_contact" label="Person"/>

You can set the `label` attribute on the `xt:use` element to open a new XML tag in the XML output document where the output of the component will be inserted. This is the classical way to create hierarchical data structures : each time you set a label attribute on an `xt:use` element you generate one level deeper in the output hierarchy.

## 5 You can leave the choice between several XML structures to the end user by using a whitespace separated list of component names in the `types` attribute of the `xt:use` element used to insert the components. The alternatives will be presented to the end user with a popup menu to select between the different components.

Example:

    <xt:use types="a_parag a_list an_illustration"/>
    
The choice will open a new tag named after the selected component name into the XML output document. You can rewrite the tag name if you do not want it to match the component name by using a `label` attribute. In that case the label attribute must contain the tag names to be used for each component name.

Example:

    <xt:use types="a_parag a_list an_illustration" label="para list fig"/>

Limitation: you can not create alternatives between primitive editors since you can only instantiate one primitive editor at a time in an `xt:use` or an `xt:attribute` element. Consequently you cannot neither create mixed alternatives between XML structures and primitive editors. To create a choice between several primitive editors, you MUST wrap them into different components.

## 6 You can create repeatable document fragments with the <a href="../editor/editor.xhtml#basics/Repeat" target="axel-demo-editor">"xt:repeat"</a> element. You must either give it a label using a `label` attribute to open a new XML tag in the XML output document, or you must indicate in a `pseudoLabel` attribute the possible elements or attributes that will start a new fragment (<a href="http://ssire.github.io/xtiger-xml-spec/#repeat" target="xtiger-specification">spec</a>).

The `pseudoLabel` attribute is a hint for the XML loading algorithm. It contains a whitespace separated list of tokens. Each token that starts with `"@"` identifies an attribute name, the other one identify an element name. When loading XML data into the document each matching will produce a new fragment repetition. A matching element is either an element with a name found in the pseudo-label list, or an element carrying an attribute found in the pseudo-label list.

You can limit the number of repetitions with the `minOccurs` and `maxOccurs` attribute of the `xt:repeat` element.

Example:

    <xt:repeat minOccurs="0" maxOccurs="*" pseudoLabel="parag list illustration">
      <xt:use types="parag list illustration"/>
    </xt:repeat>

Limitation: currently `maxOccurs` only supports the values `1` and `*`, any other value is converted to `*` (unbounded repetition)

## 7 You can control the placement of the repetition menu position (+) and (-) with the `xt:menu-marker` element. The first `xt:menu-marker` element found inside an `xt:repeat` element will be replaced by the repetition menu (<a href="http://ssire.github.io/xtiger-xml-spec/#marker" target="xtiger-specification">spec</a>).

Example:

    <xt:repeat minOccurs="0" maxOccurs="*" label="Contacts">
      <fieldset>
        <legend>Contact <xt:menu-marker/></legend>
        <p><xt:use types="text" label="Name">Click to enter a name</xt:use></p>
      </fieldset>
    </xt:repeat>

## 8 You can change the default style of the AXEL editor using the predefined class attributes set by AXEL on the document element (<a href="http://ssire.github.io/xtiger-xml-spec/#styling" target="xtiger-specification">spec</a>).

Example:

    .axel-core-editable:hover {
      outline: solid 1px blue;  
    }