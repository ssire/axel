/** 
 * AXEL configuration file
 *
 * List of templates to insert by default in the editor application
 * The editor will try to overwrite files by reading the file system
 *
 */       

// Model data to construct template selection menus in editor application
// Please fill this data structure as you add more templates
// NOTE: do not use "_custom_" name (reserved)
function getDefaultTemplates () {
  return [
    { 
    name : 'plugins', // menu name
    path : '../templates/plugins/', // path to folder (MUST end with '/')
    files :  // available template files
      [
      "Content.xhtml",
      "Text.xhtml",
      "Select.xhtml",
      "Photo.xhtml",
      "Link.xhtml",
      "Video.xhtml"
      ]
    },
    {
    name : 'filters',
    path : '../templates/filters/',
    files : 
      [
      "Date.xhtml",
      "Image.xhtml",
      "Video.xhtml"
      ]
    },
    {
    name : 'basics',
    path : '../templates/basics/',
    files : 
      [
      "Use.xhtml",
      "Repeat.xhtml",
      "Option.xhtml",
      "Attribute.xhtml"
      ]
    },
    {
    name : 'samples',
    path : '../templates/samples/',
    files : 
      [
      "Article.xhtml",
      "Page.xhtml"
      ]
    },
    { 
    name : 'test',
    path : '../test/gui/',
    files : 
      [
      "Core.xhtml"
      ]
    }
  ]
}

/** Returns the list of templates and data file to show in demos/index.html 
  *
  * DEPRECATED : to be move out or replace by something (?)
  */                
function getDemoTemplates () {                
  return {
    'Article.xhtml' : {
      data: 'article/final.xml',
      description: 'is the template used to write XML Prague 2010 article on AXEL and XTiger XML. It works with an <em>image</em> filter which must be packaged inside the library. It also works with a <em>wiki</em> filter to allow simple formating in paragraphs and to enter hypertext links'
    },
    'Editors.xhtml' : {
      compatibility: 'not-on-ie',
      description: 'shows a tutorial with all the different kind of editors supported with the core library'
    }
  }
}
