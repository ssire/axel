/** 
 * AXEL configuration file for selecting which templates to use in the demos 
 * and to insert by default in the editor application if it cannot list
 * the content of the templates folder upon load
 */       

/** Returns the list of templates and data file to show in demos/index.html 
  *
  */                
function getDefaultTemplates () {
	var res = [
	"Article.xhtml",
	"Carte-Resto.xhtml",
	"Curriculum.xhtml",
	"Editors.xhtml",
	"Fiche-Projet.xhtml",
	"Hello-world.xhtml",
	"Meeting-Report.xhtml",
	"PageWeb.xhtml",
	"Photos.xhtml",
	"Plugins.xhtml",
	"Publications.xhtml",
	"Requirements.xhtml",
	"Services.xhtml",
	"Story.xhtml",
	"Suivi.xhtml",
	"Taches.xhtml",
	"Tickets.xhtml",
	"Workpackage.xhtml",
	"YouTube.xhtml"
	]	
	return res;
}	           
            
/** Returns the list of templates and data file to show in demos/index.html 
  *
  */                
function getDemoTemplates () {                
	var res = {
		'Curriculum.xhtml' : {
			data: 'cvHaddock.xml',
			description : 'shows a curriculum vitae'
		},
		'Carte-Resto.xhtml' : {
			data: 'carteResto2.xml',
			description: 'shows a restaurant menu card (<span class="warning">photo upload not functional in this demo</span>)'
		},
		'Article.xhtml' : {
			data: 'article/final.xml',
			description: 'is the template used to write XML Prague 2010 article on AXEL and XTiger XML. It works with an <em>image</em> filter which must be packaged inside the library. It also works with a <em>wiki</em> filter to allow simple formating in paragraphs and to enter hypertext links'
		},
		'Fiche-Projet.xhtml' : {
			data: 'ficheProjetW.xml',
			description: 'shows a student project description such as the one displayed at <a href="http://media.epfl.ch/Student%20Projects.html" target="_blank">MEDIA student projects</a>'
		},
		'Publications.xhtml' : {
			data: 'publications.xml',
			description: 'shows a bibliography'
		},
		'Taches.xhtml' : {
			compatibility: 'not-on-ie',
			description: 'shows a basic project task management record; in French'
		},
		'Tickets.xhtml' : {
			compatibility: 'not-on-ie',
			description: 'shows a basic ticket for a bug or feature tracking system'
		},
		'Story.xhtml' : {
			compatibility: 'not-on-ie',
			data: 'thailand.xml',
			description: 'shows an experimental template with an input filter that allows user\'s input to change the style of the document. It also uses the <em>image</em> filter that supports DnD on Firefox (3.6). Such template could be used to create pages in a Wiki for instance. It opens with a document that includes images on the Web, so you must have your Internet connection turned on'
		},
		'Editors.xhtml' : {
			compatibility: 'not-on-ie',
		 	description: 'shows a tutorial with all the different kind of editors supported with the core library'
		},
		'PageWeb.xhtml' : {
			compatibility: 'not-on-ie',
			data: 'pageWeb.xhtml',
			description: 'shows a generic Web page template with an XHTML subset target content model'
		}		
	}
	return res;	
}





