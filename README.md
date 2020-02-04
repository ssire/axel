AXEL - Adaptable XML Editing Library
====================================

AXEL is a lightweight, open source (LGPL v2.1), Javascript library for
generating XML authoring applications that run inside the browser. Like
form-based systems, such as XForms, it turns a description of a Web page with
some editable fields into an editor. Unlike *form-oriented* systems, it is targeted
at generating semi-structured *document-oriented* user interfaces.

You should also check the [AXEL-FORMS](https://github.com/ssire/axel-forms) 
extensions to AXEL. They provide additional constructs to create more *form-oriented* 
user interfaces. They also provide microformat instructions to easily embed AXEL into 
web pages.

How does it work ?
------------------

AXEL works by transforming a *document template* (i.e. an XHTML file with
embedded [XTiger XML](http://ssire.github.com/xtiger-xml-spec/)
instructions) into an editable HTML page.

How to test it ?
----------------

This repository is also published as the [AXEL web site](http://ssire.github.com/axel/) 
thanks to the Git Hub project pages mechanism. From the web site you can directly
test AXEL inside your browser without any preliminary software installation.
Follow the instructions of the section "AXEL for the impatient" of the `index.html` file. 


Compatibility and Branches
--------

The core of AXEL is written in plain Javascript and should not depend on other libraries. 

Some plugins, filters and demos may require the jQuery library available in the 3rd-part folder. The Date filter also requires the jQuery-UI library. It is apparently compatible with jquery-ui-1.12.1 (although third part contains an older version).

The *master* branch is the stable release branch, it currently uses jquery-1.7.1 for some plugins, filters or demos

The *devel* branch is the development branch of current version, it currently uses jquery-1.7.1 for some plugins, filters or demos

Some versions have been tagged when we upgraded some components :

* version **1.4** uses jquery-1.7.1 for some plugins, filters or demos
* version **1.5** brings very few changes over version 1.5, however it is the last one using jquery-1.7.1 for some plugins, filters or demos

Note: current version should be edited in `distrib/release-nb.txt`, this is the number used when generating the library file

Where to start ?
----------------

This repository contains the full AXEL source code, documentation, examples
and utilities. It is targeted at integrators and developers that want to
use/debug/extend the library.

If you are just interested in using and deploying AXEL, all you need to do is
to copy the `axel` folder to your Web server. Then you can start deploying
your own document templates following the instructions in
`tutorial/index.xhtml`.

In all the cases, you should read the `readme.html` after you have cloned the 
AXEL git repo by running :

    git clone git://github.com/ssire/axel.git

The rule of thumb is that if you checkout the *master* branch it will contain
a built of the `axel/axel.js` library file lined up with the code. Be aware that if
you checkout the *devel* branch, you will need to rebuild the `axel.js` file 
following the instructions of the next section.

How to build the library ?
--------------------------

The library comes with the sources of the latest master branch concatenated 
and minified inside `axel/axel.js`. However it is wised to make a fresh version by running the
`build.lib` target in the scripts directory:

    cd scripts
    ant build.lib

You need to have or to install the [ant](http://ant.apache.org/) tool, 
which is already available on many operating systems. Ant is easy to install, 
you just need to copy its jars somewhere and to have it into your `$PATH`.

You also need to install the Yahoo UI compressor onto your machine (jar file), and
to edit the `scripts/ant.properties` file to point to it.

You can get the Yahoo UI compressor at [https://github.com/yui/yuicompressor](https://github.com/yui/yuicompressor)

Alternatively the `build.debug` target simply concatenates source files
together, so you can use it without installing the compressor.

How to extend the library ?
---------------------------

The basic archicture of the library is reflected into the structure of its
`src` folder. It contains the following sort of Javascript components:

* *plugins* (or *primitive editors*) manage user input at a single editing
  field level, the library currently offers some `select` (a drop-down
  selection list), `text`, `richtext`, `link`, `photo` and `video` plugins

* *filters* can be set on plugins to specialize their input and/or output
  vocabulary (e.g. the `wiki` filter turns a `text` entry field into a wiki
  entry field)

You can extend the library by writing your own plugins or filters.

How to contribute to the library ? 
----------------------------------

First, you can subscribe to the [axel-dev](http://groups.google.com/group/axel-dev) mailing list.  

Then you can contribute your bug fixes, enhancements and extensions by:

1. Forking
2. Creating a branch (`git checkout -b my_axel`)
3. Commit your changes (`git commit -am "My contribution"`)
4. Push to the branch (`git push origin my_axel`)
5. Create an [Issue](https://github.com/ssire/axel/issues) with a link to your branch     

Simple web server
-----------------

You can run the auto-test or the demonstration editor directly from the file system, 
however this may lead to some problems transforming the templates and/or loading 
XML data on some browsers. This is because they will not allow the editor to transform 
a template loaded inside an iframe, and/or to read files from the file system because 
of a strict application of security policies.

An alternative solution is to access the AXEL distribution from a web server. 

For instance, if you have ruby installed you may run a one line command into 
a terminal to start a web server serving the current directory and below
(at http://localhost:3000 on the example below) :

    ruby -r webrick -e "m = WEBrick::HTTPUtils::DefaultMimeTypes; m.update({'xhtml' => 'application/xhtml+xml'}); s = WEBrick::HTTPServer.new(:Port => 3000, :DocumentRoot => Dir.pwd, :MimeTypes => m); trap('INT') { s.shutdown }; s.start"

Don't forget to configure the server to serve XTiger XML template files with 
the 'application/xhtml+xml' MIME-TYPE, otherwise the browser will propose to save 
them as external documents and not transform them. 

Such commands exist with other languages (e.g. python).

Coding Guidelines 
-----------------
                                          
We currently do not have strong coding conventions as you will see by yourself
when browsing the source code, however respect at least these ones :

* soft tabs
* 2 spaces per tab
* remove spaces at the end of lines (you may use a filter such as `sed -E 's/[ ]+$//g'`)
* test source files with jslint

Each plugin should be documented in a self-describing template file inside 
the templates/plugins folder.

Each filter should be documented in a self-describing template file inside
the templates/filters folder.