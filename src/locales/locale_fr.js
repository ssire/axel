/**
 * AXEL French translation.
 *
 * Author: Stéphane Sire <s.sire@oppidoc.fr>
 */
(function ($axel) {
  $axel.addLocale('fr',
    {
      /////////////////////
      // Generic strings //
      /////////////////////

      // Functions with values
      errNoXML : function (values) { 
        return values.url + " loaded but it contains no XML data"; },
      errLoadDocumentStatus : function (values) { 
        return "HTTP error" + (values.url ? " while loading " + values.url : "") + " status code " + values.xhr.status; },
      errException : function (values) { 
        var msg = values.e ? "exception " + values.e.name + " " + values.e.message : "unkown exception";
        return msg + (values.url ? " while loading " + values.url : "") + (values.status ? " status code " + values.status : "");
       },
      errTransformNoTarget : function (values) { 
        return "transformation aborted because target container " + values.id + " not found in target document"; },
    
      // Simple strings
      errTransformIframeSecurity : "the editor could not be generated because browser security restrictions prevented access to window iframe content",
      errDataSourceUndef : "undefined or missing XML data source",
      errEmptySet4Template : "cannot load template into empty wrapped set",
      errNoBundlesPath : "missing bundlesPath declaration to transform template",
      errNoSerializer : "missing XML serializer algorithm",
      errNoLoader : "missing XML loader algorithm",
      errEmptySet4XML : "cannot load XML data source into empty wrapped set",
      errTemplateNoBody : "Could not get <body> element from the template to transform",
      errTemplateUndef : "The document containing the template is null or undefined",
      errNoTemplate : "no template to transform",
      errTargetNoHead : "cannot inject editor's style sheet because target document has no head section",
      errDataSourceNoData : "data source empty",

      //////////////
      //  Labels  //
      //////////////
      cmdSelectFile : "Sélectionner",
      cmdDeleteFile : "Supprimer",
      cmdUpload : "Enregistrer",

      /////////////////////
      //  'file' module  //
      /////////////////////
    
      hintFileSend : function (args) { 
        return 'cliquez sur "Enregistrer" pour sauvegarder "' + args.filename +  '" (' + args.size + ')'; },
      hintFileSendAs : function (args) { 
        return 'cliquez sur "Enregistrer" pour sauvegarder "' + args.filename +  '" (' + args.size + ')<br/>sous "' + args.name + '" (vous pouvez éditer le nom avant)'; }, 
      hintFileSend : function (args) { 
        return 'enregistrement de "' + args.filename + '" (%) en cours'; },
      hintFileSendFailure : function (args) { 
        return 'échec de l\'enregistrement de "' + args.filename + '"<br/> :' + args.error; },
      hintFileSendSuccess : function (args) { 
        return '"' + args.filename +'" a été enregistré en tant que <a href="' + args.href + '" target="_blank">' + args.anchor + '</a>'; },
      hintFileReplace : function (args) { 
        return 'cliquez pour remplacer <a href="' + args.href + '" target="_blank">' + args.anchor + '</a>'; },
        
      hintFileSelect : "cliquez pour choisir un fichier",
      infoFileSendInProgress : "enregistrement en cours",
      infoFileSendFailure : "échec de l'enregistrement",
      infoFileSendSuccess : "enregistrement réussi",
      warnFileTypeDefault : "Vous devez sélectionner un fichier PDF",
      warnFileTooManyUploads : "D'autre(s) téléchargement(s) sont en cours, attendez qu'ils se terminent ou bien annulez en un pour pouvoir démarrer un nouveau téléchargement"
    }
  );
}($axel));
