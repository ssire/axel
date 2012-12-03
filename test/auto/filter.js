/*****************************************************************************\
|                                                                             |
|  'test' plugin                                                              |
|                                                                             |
|  Only has a test() method to be filtered to test filters                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Generator = function ( aContainer, aXTUse, aDocument ) {
    var handle;
    return handle;
  };

  var _Editor = {

    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      window.console.log('Awake plugin instance "' + this.getUniqueKey() + '"');
    },

    onAwake : function () {
      window.console.log('Init plugin instance "' + this.getUniqueKey() + '"');
    },
    
    api : {
    },
    
    methods : {
      test : function (accu) {
        accu.push('plugin "' + this.getParam('name') + '" test()');
      }
    }
  };

  $axel.plugin.register(
    'test', 
    { filterable: true, optional: false },
    { 
     name : 'test'
    },
    _Generator,
    _Editor
  );
}($axel));

///////////////////
// First filter
///////////////////
(function ($axel) {
  var _Filter = {
    onAwake : function () {
      window.console.log('Awake plugin instance "' + this.getUniqueKey() + '" from filter1');
    },
    api : { },
    methods : {
      test : function (accu) {
        this.__filter1__test(accu);
        accu.push('filter1 "' + this.getParam('filter1_name') + '" test()');
      }
    }
  }

  $axel.filter.register(
    'filter1', 
    { chain : 'test' },
    { filter1_name : 'filter1 default name'},
    _Filter
  );
  $axel.filter.applyTo({'filter1' : 'test'});
}($axel));

///////////////////
// Second filter
///////////////////
(function ($axel) {
  var _Filter = {
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      window.console.log('Init plugin instance "' + this.getUniqueKey() + '" from filter2');
    },
    api : { },
    methods : {
      test : function (accu) {
        this.__filter2__test(accu);
        accu.push('filter2 "' + this.getParam('filter2_name') + '" test()');
      }
    }
  };

  $axel.filter.register(
    'filter2', 
    { chain : 'test' },
    { filter2_name : 'filter2 default name'},
    _Filter
  );
  $axel.filter.applyTo({'filter2' : 'test'});
}($axel));

// Helper function that simulates plugin instance creation
function createEditor ( plugins, name ) {
  var fakeXTSrcNode = document.getElementById(name),
      fakeContainer = null,
      factory = plugins.getEditorFor(fakeXTSrcNode, ['test']), // TODO: extract types from node
      handle = factory.createModel(fakeContainer, fakeXTSrcNode, document);
  return factory.createEditorFromTree (handle, fakeXTSrcNode, document)
}

// Helper function that simulates plugin instance cloning
function cloneEditor ( editor ) {
  var seed = editor.makeSeed(),
      factory = seed[0],
      clone = document.getElementById('fakeHandle'),
      aRepeater = null;
  return factory.createEditorFromSeed(seed, clone, document, aRepeater); 
}

function test1 ( logger ) {
  var plugins = new xtiger.editor.Plugin(),
      editor11 = createEditor(plugins, 'test1.1'),
      editor12 = createEditor(plugins, 'test1.2'),
      editor13 = createEditor(plugins, 'test1.3'),
      editor14 = createEditor(plugins, 'test1.4'),
      editor15 = createEditor(plugins, 'test1.5'),
      editor21 = cloneEditor(editor11),
      editor22 = cloneEditor(editor12),
      editor23 = cloneEditor(editor13),
      editor24 = cloneEditor(editor14),
      editor25 = cloneEditor(editor15),
      accu, truth;
  // test 1.1    
  accu = [];
  editor11.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.1" test()';
  assert_string("1.1", logger, res, truth, 'plugin without filter');
  // test 1.2    
  accu = [];
  editor12.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.2" test() filter1 "test1.2" test()';
  assert_string("1.2", logger, res, truth, 'plugin with one filter');
  // test 1.3
  accu = [];
  editor13.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.3" test() filter1 "test1.3" test() filter2 "test1.3" test()';
  assert_string("1.3", logger, res, truth, 'plugin with two filters');
  // test 1.4
  accu = [];
  editor14.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.4" test() filter1 "filter1 default name" test()';
  assert_string("1.4", logger, res, truth, 'plugin with one filter and no parameter declaration on template');
  // test 1.5
  accu = [];
  editor15.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.5" test() filter1 "filter1 default name" test() filter2 "filter2 default name" test()';
  assert_string("1.5", logger, res, truth, 'plugin with two filters and no parameter declaration on template');
  // test 2.1
  accu = [];
  editor21.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.1" test()';
  assert_string("2.1", logger, res, truth, 'clone of plugin without filter');
  // test 2.2    
  accu = [];
  editor22.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.2" test() filter1 "test1.2" test()';
  assert_string("2.2", logger, res, truth, 'clone of plugin with one filter');
  // test 2.3
  accu = [];
  editor23.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.3" test() filter1 "test1.3" test() filter2 "test1.3" test()';
  assert_string("2.3", logger, res, truth, 'clone of plugin with two filters');
  // test 2.4    
  accu = [];
  editor24.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.4" test() filter1 "filter1 default name" test()';
  assert_string("2.4", logger, res, truth, 'clone of plugin with one filter and no parameter declaration on template');
  // test 2.5
  accu = [];
  editor25.test(accu);
  res = accu.join(' ');
  truth =  'plugin "test1.5" test() filter1 "filter1 default name" test() filter2 "filter2 default name" test()';
  assert_string("2.5", logger, res, truth, 'clone of plugin with two filters and no parameter declaration on template');
}