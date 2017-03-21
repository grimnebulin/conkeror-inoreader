const INOREADER_STYLE = "<style type='text/css'>" +
      "#reader_pane code {" +
      "display: inline; padding: 0; font-family: monospace;" +
      "font-size: inherit; border: none; color: inherit;" +
      "}</style>";

$(INOREADER_STYLE).appendTo("head");

$("body").keydown(function (e) {
    if (inoreader_ignore_keydown_event(e))
        e.stopImmediatePropagation();
    if (e.keyCode == 83 && e.ctrlKey && e.shiftKey)
        $.inoreader_current_article(".footer_fav_img > a").clickthis();
});
