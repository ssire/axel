function prewarp1 ( version, logger, template) {
  var result = new xtiger.util.Logger(),
      ready = false,
      editor;
  try { // load and transform template
    logAction(logger, version + ' loading template', template);
    editor = universalLoadDocument(template, result);
    if (editor) {
      form = new xtiger.util.Form('../../axel/bundles');
      form.setTemplateSource (editor); 
      form.setTargetDocument (document, 'editor-test-1', true)
      if (form.transform (result)) {
        // [].forEach.call(document.querySelectorAll('#editor-test-1 [genid]'), function (n) { n.setAttribute('id', n.getAttribute('genid')) });      
        ready = true;
      }
    } 
  } catch (e) {
    result.logError('exception ' + e.name + e.message);
  }
  if (result.inError()) { 
    logError('error while transforming template (' + result.printErrors() + ')');
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
  prewarp1("1. ", logger, '../templates/WrappedSet.xhtml');
  truth =  'Hello World';
  set = $axel(document.getElementById('editor-test-1').getElementsByClassName('test')[0]).text();
  assert_string("1.1", logger, set, truth, 'getElementById');
  set = $axel($('#editor-test-1 p.test').get()).text();
  assert_string("1.2", logger, set, truth, 'DOM node array');
  set = $axel('#editor-test-1 p.test').text();
  assert_string("1.3", logger, set, truth, 'jQuery selector');
}

function test2 ( logger ) {
  var set, truth;
  logAction(logger, '2. loading template', '../templates/WrappedSet.xhtml');
  truth =  'Hello World';
  set = $axel('#editor-test-2').transform('../templates/WrappedSet.xhtml').text();
  assert_string("2.1", logger, set, truth, '$axel(-sel-).transform(-url-)');
  truth =  "<Test><Text>Hello</Text><Text>World</Text></Test>";
  set = $axel('#editor-test-2').xml();
  assert_string("2.2", logger, canonical(set).join(''), canonical(truth).join(''), '$axel(-sel-).xml');
  truth =  "<Test><Text>Bonjour</Text><Text>Tout le monde</Text></Test>";
  set = $axel('#editor-test-2').load(truth).xml();
  assert_string("2.3", logger, canonical(set).join(''), canonical(truth).join(''), '$axel(-sel-).load(-string-)');
  truth =  "<Test><Text>Buenas</Text><Text>noches</Text></Test>";
  set = $axel('#editor-test-2').load('../data/wrappedset.xml').xml();
  assert_string("2.4", logger, canonical(set).join(''), canonical(truth).join(''), '$axel(-sel-).load(-url-)');
}

function test3 ( logger ) {
  var set, truth
      cases = [
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Repetition><Item>a</Item><Item>b</Item><Item>c</Item></Repetition></WrappedSet>'
         ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1',
         '<WrappedSet><Repetition><Item>UN</Item></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 0',
         '<WrappedSet/>'
        ],
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Repetition><Item>D</Item><Item>E</Item><Item>F</Item><Item>G</Item></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with no change in struture (only primitive content change)',
         '<WrappedSet><Repetition><Item>d</Item><Item>e</Item><Item>f</Item><Item>g</Item></Repetition></WrappedSet>'
        ]
      ];
  truth =  ''; // 'click to edit an item';
  set = $axel('#editor-test-3').transform().text();
  assert_string("3.1", logger, set, truth, '$axel(-sel-).transform()');
  
  for (i = 0; i < cases.length; i++) {
    truth = cases[i][1];
    set = $axel('#editor-test-3').load(truth).xml();
    assert_string("3." + (i + 2), logger, canonical(set).join(''), canonical(truth).join(''), cases[i][0]);
  }
}

function test4 ( logger ) {
  var set, truth
      cases = [
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Item>a</Item><Item>b</Item><Item>c</Item></WrappedSet>'
         ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1',
         '<WrappedSet><Item>UN</Item></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 0',
         '<WrappedSet/>'
        ] ,
        ['$axel(-sel-).load(-string-) with repetition expansion',
        '<WrappedSet><Item>D</Item><Item>E</Item><Item>F</Item><Item>G</Item></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with no change in content',
        '<WrappedSet><Item>D</Item><Item>E</Item><Item>F</Item><Item>G</Item></WrappedSet>'
        ]
      ];
  truth =  ''; // 'click to edit an item';
  set = $axel('#editor-test-4').transform().text();
  assert_string("4.1", logger, set, truth, '$axel(-sel-).transform()');

  for (i = 0; i < cases.length; i++) {
    truth = cases[i][1];
    set = $axel('#editor-test-4').load(truth).xml();
    assert_string("4." + (i + 2), logger, canonical(set).join(''), canonical(truth).join(''), cases[i][0]);
  }
}

function test5 ( logger ) {
  var set, truth, i,
      cases = [
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Letter>a</Letter><Number>1</Number><Letter>c</Letter><Message>Hello World</Message><Repetition><Letter>a</Letter><Number>1</Number><Letter>c</Letter></Repetition></WrappedSet>'
         ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1',
         '<WrappedSet><Number>UN</Number><Repetition><Number>UN</Number></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 0',
         '<WrappedSet></WrappedSet>'
        ] ,
        ['$axel(-sel-).load(-string-) with repetition expansion',
        '<WrappedSet><Number>UN</Number><Letter>D</Letter><Number>DEUX</Number><Number>TROIS</Number><Letter>E</Letter><Message>Fail if you can read this message !</Message><Repetition><Number>4</Number><Letter>DD</Letter><Number>5</Number><Letter>EE</Letter><Letter>FF</Letter></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with no change in content',
        '<WrappedSet><Number>UN</Number><Letter>D</Letter><Number>DEUX</Number><Number>TROIS</Number><Letter>E</Letter><Message>Fail if you can read this message !</Message><Repetition><Number>4</Number><Letter>DD</Letter><Number>5</Number><Letter>EE</Letter><Letter>FF</Letter></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with lot of changes',
        '<WrappedSet><Number>2013</Number></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with lot of changes',
        '<WrappedSet><Message>Success if you can read only that message !</Message></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1',
         '<WrappedSet><Number>UN</Number><Repetition><Number>UN</Number></Repetition></WrappedSet>'
        ]                        
      ];
  truth =  ''; // 'click to edit an item';
  set = $axel('#editor-test-5').transform().text();
  assert_string("5.1", logger, set, truth, '$axel(-sel-).transform()');
  
  for (i = 0; i < cases.length; i++) {
    truth = cases[i][1];
    set = $axel('#editor-test-5').load(truth).xml();
    assert_string("5." + (i + 2), logger, canonical(set).join(''), canonical(truth).join(''), cases[i][0]);
  }
}

function test6 ( logger ) {
  var set, truth, i,
      cases = [
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Letter>a</Letter><Number>1</Number><Letter>c</Letter><Message>Hello World</Message><Repetition><Letter>a</Letter><Number>1</Number><Letter>c</Letter></Repetition></WrappedSet>'
         ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1 or unset',
         '<WrappedSet><Number>UN</Number><Repetition><Number>UN</Number></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition expansion',
        '<WrappedSet><Number>UN</Number><Letter>D</Letter><Number>DEUX</Number><Number>TROIS</Number><Letter>E</Letter><Repetition><Number>4</Number><Letter>DD</Letter><Number>5</Number><Letter>EE</Letter><Letter>FF</Letter></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with no change in content',
        '<WrappedSet><Number>UN</Number><Letter>D</Letter><Number>DEUX</Number><Number>TROIS</Number><Letter>E</Letter><Repetition><Number>4</Number><Letter>DD</Letter><Number>5</Number><Letter>EE</Letter><Letter>FF</Letter></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with option set in-between',
        '<WrappedSet><Number>UN</Number><Letter>D</Letter><Number>DEUX</Number><Number>TROIS</Number><Letter>E</Letter><Message>Failed if you can read me</Message><Repetition><Number>4</Number><Letter>DD</Letter><Number>5</Number><Letter>EE</Letter><Letter>FF</Letter></Repetition></WrappedSet>'
        ],
        ['$axel(-sel-).load(-string-) with repetition reduction to 1 and option unset',
         '<WrappedSet><Number>UN</Number><Repetition><Number>UN</Number></Repetition></WrappedSet>'
        ]                        
      ];
  truth =  'click to edit a letter click to edit a letter'; // 'click to edit an item';
  set = $axel('#editor-test-6').transform().text();
  assert_string("6.1", logger, set, truth, '$axel(-sel-).transform()');
  
  for (i = 0; i < cases.length; i++) {
    truth = cases[i][1];
    set = $axel('#editor-test-6').load(truth).xml();
    assert_string("6." + (i + 2), logger, canonical(set).join(''), canonical(truth).join(''), cases[i][0]);
  }
}

function test7 ( logger ) {
  var set, truth, i,
      cases = [
        ['$axel(-sel-).load(-string-) with repetition expansion',
         '<WrappedSet><Repetition1><Letter>a</Letter><Number>1</Number><Letter>c</Letter></Repetition1><Repetition2><Letter>b</Letter><Number>2</Number><Letter>d</Letter></Repetition2></WrappedSet>'
         ],
         ['$axel(-sel-).load(-string-) with small changes',
          '<WrappedSet><Repetition1><Letter>AA</Letter><Number>100</Number></Repetition1><Repetition2><Letter>BB</Letter><Number>200</Number></Repetition2></WrappedSet>'
          ]                       
      ];
  truth =  'click to edit a letter click to edit a letter'; // 'click to edit an item';
  set = $axel('#editor-test-7').transform().text();
  assert_string("7.1", logger, set, truth, '$axel(-sel-).transform()');
  
  for (i = 0; i < cases.length; i++) {
    truth = cases[i][1];
    set = $axel('#editor-test-7').load(truth).xml();
    assert_string("6." + (i + 2), logger, canonical(set).join(''), canonical(truth).join(''), cases[i][0]);
  }
}

// TODO : 'duplicate' et 'remove' en conjonction avec le filter="event" !
// coder $axel(-sel-).reset() pour réinitaliser un éditeur 
