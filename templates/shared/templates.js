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
      "Wiki.xhtml",
      "Image.xhtml",
      "Video.xhtml",
      "Style.xhtml",
      "Optional.xhtml"
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
      "Computed.xhtml",
      "Page.xhtml",
      "Template.xhtml"
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
