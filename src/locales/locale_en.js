/**
 * AXEL English translation.
 *
 * Author: Stéphane Sire <s.sire@oppidoc.fr>
 */
(function ($axel) {
  $axel.addLocale('en',
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
      cmdSelectFile : "Upload",
      cmdUpload : "Save",

      /////////////////////
      //  'file' module  //
      /////////////////////

      hintFileSend : function (args) {
        return 'Click on the "Save" button to upload "' + args.filename +  '" to the server (' + args.size + ')'; },
      hintFileSendAs : function (args) {
        return 'Click on the "Save" button to upload "' + args.filename +  '" (' + args.size + ') to the server <br/>as "' + args.name + '" (you can modify its name before uploading)'; },
      hintFileSendInProgress : function (args) {
        return 'Uploading "' + args.filename + '"'; },
      hintFileSendFailure : function (args) {
        return 'Failed to upload "' + args.filename + '" because :<br/><i>' + args.error + '</i>'; },
      hintFileSendSuccess : function (args) {
        return '"' + args.filename +'" has been uploaded as  <a href="' + args.href + '" target="_blank">' + args.anchor + '</a>'; },
      hintFileReplace : function (args) {
        return 'Click on the file icon to replace  <a href="' + args.href + '" target="_blank">' + args.anchor + '</a>' + args.delInfo; },
      hintFileDeleteInProgress : function (args) {
        return 'Deleting "' + args.filename + '"'; },
      hintFileDeleteFailure : function (args) {
        return 'Failed to delete "' + args.filename + '" because :<br/><i>' + args.error + '</i>'; },
      warnFileSizeLimit : function (args) {
        return 'File "' + args.filename + '  " too big (' + args.size + ') ! Please select a file below ' + args.limit; },
      askFileDelete : function (args) {
        return 'Are you sure you want to delete "' + args.filename + '" from the server ?'; },

      hintFileDelete : "<br/>Click on the cross to delete it",
      hintFileDeleteSuccess : "The file has been deleted",
      hintFileSelect : "Click on the file icon to select a file for upload",
      infoFileNoFile : "no file",
      infoFileSendInProgress : "upload in progress",
      infoFileSendFailure : "upload failure",
      infoFileSendSuccess : "upload success",
      infoFileDeleteInProgress: "delete in progress",
      infoFileDeleteFailure : "delete failure",
      infoFileDeleted : "file deleted",
      warnFileTypeDefault : "You must select a PDF file",
      warnFileTooManyOperations : "Another file operation is already in progress, please wait until it finishes before starting a new one"
    }
  );
}($axel));
