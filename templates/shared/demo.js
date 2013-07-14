$(
  // Extracts xt:attribute and xt:use from <div class="demo"> fragments
  // Generates and insert the source code before the fragment
  // NOTE: MUST be called before transforming the template !
  function sourceDemo () {
    // FIXME: dumpXML works only with terminal nodes or with nodes containing only terminal nodes
    function dumpXML (el) {
      var tmp, prefix = '',
          n = el.nodeName.toLowerCase(), 
          accu = [];
      if ((n === 'xt:use') || (n === 'xt:attribute')) {
        if (n.charAt(2) === ':') {
          n = n.substr(3);
        }
        prefix = 'xt:';
      }
      $.each(el.attributes, 
            function(index, attr) {
              accu.push(attr.nodeName + "='" + attr.nodeValue + "'"); 
            });
      if (el.children.length > 0) { // non text content 
        tmp = [];
        $.each(el.children, 
              function(index, el) {
                tmp.push(dumpXML(el)); 
              });           
        return '&lt;' + prefix + n + ' ' + accu.join(' ') + '>' + tmp.join() + '&lt;/' + prefix + n + '>';
      } else if (el.textContent) {
        return '&lt;' + prefix + n + ' ' + accu.join(' ') + '>' + el.textContent.replace('&', '&amp;', 'g').replace('<', '&amp;lt;', 'g') + '&lt;/' + prefix + n + '>';
      } else {
        return '&lt;' + prefix + n + ' ' + accu.join(' ') + '/>';
      }
    }
    $('div.extract').each( 
      function(index, el) { 
        var buffer = [],
            items = this.getElementsByTagNameNS("*", "*");
        $.each(items,
          function (index, el) {
            var accu;
            var n = el.nodeName.toLowerCase();
            if ((n === 'xt:use') || (n === 'xt:attribute')) {
              if (n.charAt(2) == ':') {
                n = n.substr(3);
              }
              buffer.push(dumpXML(el));
            }
          }
        );
        var src = "<div class='source'><pre>" + buffer.join('<br/>') + "</pre></div>";
        $(this).before(src); 
      }
    ); 
  }
);