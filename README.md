AXEL - Adaptable XML Editing Library
====================================

AXEL is a lightweight, open source (LGPL v2.1), Javascript library for
generating XML authoring applications that run inside the browser. Like
form-based systems, such as XForms, it turns a description of a Web page with
some editable fields into an editor. Unlike form-based systems, it is targeted
at generating a broader scope of user interfaces from *data-centric* ones to
*document-centric* ones.

How does it work ?
------------------

AXEL works by transforming a *document template* (i.e. an XHTML file with
embedded [XTiger XML](http://media.epfl.ch/Templates/XTiger-XML-spec.html)
instructions) into an editable HTML page.

Where to start ?
----------------

This repository contains the full AXEL source code, documentation, examples
and utilities. It is targeted at integrators and developers that want to
use/debug/extend the library. It is also used to generate the stripped-down
AXEL distribution that you can find at [http://media.epfl.ch/Templates/]().

If you are just interested in using and deploying AXEL, all you need to do is
to copy the `axel` folder to your Web server. Then you can start deploying
your own document templates following the instructions in
`examples/tutorial/tutorial.xhtml`.

In all the cases, once you have cloned the main AXEL git repo by running `git
clone git://github.com/ssire/axel.git`, you should read the `readme.html`.

How to build the library ?   
--------------------------

The library comes with the latest sources concatenated and minified inside
`axel/axel.js`. However it is wised to make a fresh version by running the
`build.lib` target in the scripts directory:

    cd scripts
    ant build.lib

This requires that you have the [ant](http://ant.apache.org/) tool available
on your system, which is already the case on many operating systems.

This requires that you install the Yahoo UI compressor onto your machine, and
that you edit the `scripts/ant.properties` file to point to it.

You can get the Yahoo UI compressor at [http://developer.yahoo.com/yui/compressor/]()

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

* *services* can be spreaded within the document tree to gather data and to
  trigger external actions with side effects while editing (e.g. you can setup
  a service to translate some text)
 
You can extend the library by writing your own plugins, filters or services.

How to contribute to the library ? 
----------------------------------

First, you can subscribe to the [axel-dev](http://groups.google.com/group/axel-dev) mailing list.  

Then you can contribute your bug fixes, enhancements and extensions by:

1. Forking
2. Creating a branch (`git checkout -b my_axel`)
3. Commit your changes (`git commit -am "My contribution"`)
4. Push to the branch (`git push origin my_axel`)
5. Create an [Issue](https://github.com/ssire/axel/issues) with a link to your branch     

Coding Guidelines 
-----------------
                                          
We currently do not have strong coding conventions as you will see by yourself
when browsing the source code, however respect at least that one:
**Soft Tabs at 2 spaces per Tab !**.




















