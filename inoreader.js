"use strict";

// Copyright 2016 Sean McAfee

// This file is part of conkeror-inoreader.

// conkeror-inoreader is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// conkeror-inoreader is distributed in the hope that it will be
// useful, but WITHOUT ANY WARRANTY; without even the implied warranty
// of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with conkeror-inoreader.  If not, see
// <http://www.gnu.org/licenses/>.


//  A page mode for the site inoreader.com.  Performs the following
//  steps:
//
//  Adds a stylesheet that renders <code> elements in the reader pane
//  properly.
//
//  Defines a browser object class that targets only useful follow
//  targets.
//
//  Passes various keypresses to the page rather than having Conkeror
//  handle them.
//
//  Adds a command bound to control-shift-S to "star" the currently
//  viewed article.

(function () {

    const INOREADER_STYLE =
        "<style type='text/css'>" +
        "#reader_pane code {" +
        "display: inline; padding: 0; font-family: monospace;" +
        "font-size: inherit; border: none; color: inherit;" +
        "}</style>";

    const INOREADER_LINKS =
        "//div[@id='tree_pane']//*[" +
          "not(ancestor::div[contains(@class,'_selected')])" +
        "][" +
          "self::span[" +
            "contains(@class,'tree_sub_node') or contains(@class,'tree_node')" +
          "] or self::img[" +
            "contains(@src,'images/icon_arrow')" +
          "]" +
        "]" +
        "|" +
        "//div[@id='subscriptions_buttons']//*[" +
          "self::a or self::button" +
        "][" +
          "not(parent::div[contains(@class,'view_toolbar_inner')])" +
        "]" +
        "|" +
        "//div[@id='reader_pane']//a";

    define_browser_object_class(
        "inoreader-links",
        null,
        xpath_browser_object_handler(INOREADER_LINKS),
        $hint = "select link"
    );

    define_keymap("inoreader_keymap", $display_name = "Inoreader");

    for (let key of "g,j,k,m,v,t,u,A,C-S".split(/,/))
        define_key(inoreader_keymap, key, null, $fallthrough);

    define_key(inoreader_keymap, "C-M-N", scroll_subscriptions(+25));
    define_key(inoreader_keymap, "C-M-P", scroll_subscriptions(-25));
    define_key(inoreader_keymap, "C-c C-t", toggle_order);
    define_key(inoreader_keymap, "C-c C-v C-a", view("all"));
    define_key(inoreader_keymap, "C-c C-v C-u", view("updated"));

    function scroll_subscriptions(offset) {
        return function (I) {
            I.buffer.document.getElementById("tree_pane").scrollTop += offset;
        };
    }

    const ARTICLE_ORDER = [ "newest", "oldest" ];

    // Toggle article order between newest-first and oldest-first,
    // bypassing the popular-first option:

    function toggle_order(I) {
        const $ = $$(I);
        const button = $("button#articles_order_button");
        function click() {
            button.clickthis();
            $.window.setTimeout(() => {
                maybe(
                    button.attr("title").match(/^Showing (\S+)/)
                ).foreach(([_, order]) => {
                    if (ARTICLE_ORDER.indexOf(order) < 0)
                        click();
                });
            }, 500);
        }
        click();
    }

    function view(type) {
        return function (I) {
            $$(I)("#subscriptions_radio_" + type).clickthis();
        };
    }

    let (
        [enable, disable] = setup_mode(
            { normal: inoreader_keymap },
            { follow: browser_object_inoreader_links }
        )
    ) {
        define_page_mode(
            "inoreader-mode",
                /^https?:\/\/(?:www\.)?inoreader\.com/,
            enable,
            disable,
            $display_name = "Inoreader"
        );
    }

    page_mode_activate(inoreader_mode);

    function ignore_keydown_event(e) {
        return e.keyCode == 32  // space
            || e.keyCode == 70  // F
            || e.keyCode == 80  // P
            || e.keyCode == 83  // S
        ;
    }

    function inoreader_dom_loaded_hook($) {
        $(INOREADER_STYLE).appendTo("head");
        $("body").keydown(function (e) {
            if (ignore_keydown_event(e))
                e.stopImmediatePropagation();
            if (e.keyCode == 83 && e.ctrlKey && e.shiftKey)
                $(".article_current .footer_fav_img > a").clickthis();
        });
    }

    on_dom_loaded(/inoreader\.com/, inoreader_dom_loaded_hook);

})();
