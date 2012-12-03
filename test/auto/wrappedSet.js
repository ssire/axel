function prewrap ( version, logger, template, data, results) {
  var result = new xtiger.util.Logger(),
      ready = false,
      editor;
  try { // load and transform template
    logAction(logger, version + ' loading template', template);
    editor = xtiger.debug.loadDocument(template, result);
    if (editor) {
      form = new xtiger.util.Form('../../axel/bundles');
      form.setTemplateSource (editor); 
      form.setTargetDocument (document, 'editor', true)
      if (form.transform (result)) {
        [].forEach.call(document.querySelectorAll('#editor [genid]'), function (n) { n.setAttribute('id', n.getAttribute('genid')) });      
        ready = true;
      }
    } 
  } catch (e) {
    result.logError('exception ' + e.name + e.message);
  }
  if (result.inError()) { 
    logError('error while transforming template (' + result.printErrors() + ')');
  }  
  // load XML data
  if (data && ready) {
    // logAction(this.logEntry, 'loading data', this.xmlFile)
    // var xmlDoc = loadDocument(this.xmlFile, result);
    // if (xmlDoc) {
    //   var dataSrc = new xtiger.util.DOMDataSource(xmlDoc[1]);
    //   form.setLoader(this.xmlLoader);
    //   if (form.loadData(dataSrc, result)) {
    // 
  }
}

// TO BE DONE (define $axel.().text(false) boolean parameter to join or not string result...)
function assert_array (version, logger, data, truth) {
  var i, success = true;
  if (data.length !== truth.length) {
    logFailure(version + ' wrapped set length ' + data.length + ' instead of ' + truth.length);
  } else {
    for (i = 0; i < truth.length; i++) {
      if (data[i] !== truth[i]) {
        logFailure(version + ' got mismatch at token ' + i);
        success = false;
        break;
      }
    }
    if (success) {
      logSuccess(version);
    }
  }
}

function test1 ( logger ) {
  var set, truth;
  prewrap("1. ", logger, '../templates/WrappedSet.xhtml');
  truth =  'Hello World';
  set = $axel(document.getElementById('test-1')).text();
  assert_string("1.1", logger, set, truth, 'getElementById');
  set = $axel($('#test-1').get()).text();
  assert_string("1.2", logger, set, truth, 'DOM node array');
  set = $axel('#test-1').text();
  assert_string("1.3", logger, set, truth, 'jQuery selector');
}