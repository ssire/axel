// Auto tests configuration file
// Use this file to create test configurations to be executed by the auto-tests in this folder

var tests = {
	// IE 7 testing: do not leave trainling commas at the end of Hash enumaration !
	
	'loadSave' : {
		
		// each entry of the form: template URL : XML data URL
        '../templates/Core.xhtml' : '../data/core.xml',
        '../templates/Choice.xhtml' : '../data/choice.xml',
        '../templates/Repeat.xhtml' : '../data/repeat.xml',
        '../templates/extras/Curriculum.xhtml' : '../data/extras/cvHaddock.xml',
        '../templates/extras/Carte-Resto.xhtml' : '../data/extras/carteResto1.xml',
        '../templates/extras/Publications.xhtml' : '../data/extras/publications.xml',
        '../templates/extras/Fiche-Cafe-Flow.xhtml' : '../data/extras/ficheCafeFlow.xml',
        '../templates/extras/Fiche-Projet.xhtml' : '../data/extras/ficheProjetW.xml',
        '../../templates/samples/Article.xhtml' : '../../data/article/final.xml',
        '../templates/Link.xhtml' : '../data/link.xml',
        '../templates/Video.xhtml' : '../data/video.xml',
        '../templates/Content.xhtml' : '../data/content.xml'
	}
}