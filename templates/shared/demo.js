$(
  // Extracts xt:attribute and xt:use from <div class="demo"> fragments
  // Generates and insert the source code before the fragment
  // NOTE: MUST be called before transforming the template !
  function sourceDemo () {
    $('div.extract').each( 
      function(index, el) { 
        var buffer = [];
        var items = this.getElementsByTagNameNS("*", "*");
        $.each(items,
          function (index, el) {
            var accu;
            var n = el.nodeName.toLowerCase();
            if ((n === 'xt:use') || (n === 'xt:attribute')) {
              if (n.charAt(2) == ':') {
                n = n.substr(3);
              }
              accu = [];
              $.each(el.attributes, 
                    function(index, attr) {
                      accu.push(attr.nodeName + "='" + attr.nodeValue + "'"); 
                    });
              if (el.textContent) {
                buffer.push('&lt;xt:' + n + ' ' + accu.join(' ') + '>' + el.textContent.replace('&', '&amp;', 'g') + '&lt;/xt:' + n + '>');
              } else {
                buffer.push('&lt;xt:' + n + ' ' + accu.join(' ') + '/>');
              }
            }
          }
        );
        var src = "<div class='source'><pre>" + buffer.join('<br/>') + "</pre></div>";
        $(this).before(src); 
      }
    ); 
  }
);