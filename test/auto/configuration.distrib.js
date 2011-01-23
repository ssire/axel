// Auto tests configuration file
// Use this file to create test configurations to be executed by the auto-tests in this folder

var tests = {
	// IE 7 testing: do not leave trainling commas at the end of Hash enumaration !
	
	'loadSave' : {
		
		// each entry of the form: template URL : XML data URL
        '../templates/Core.xhtml' : '../data/core.xml',
        '../templates/Choice.xhtml' : '../data/choice.xml',
        '../templates/Repeat.xhtml' : '../data/repeat.xml',
        '../../templates/Hello-world.xhtml' : '../data/hello.xml',
        '../../templates/Curriculum.xhtml' : '../../data/cvHaddock.xml',
        '../../templates/Carte-Resto.xhtml' : '../../data/carteResto1.xml',
        '../../templates/Publications.xhtml' : '../../data/publications.xml',
        '../../templates/Fiche-Projet.xhtml' : '../../data/ficheProjetW.xml',
        '../../templates/Article.xhtml' : '../../data/article/final.xml'
	}
}