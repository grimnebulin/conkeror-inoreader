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

conkeror.inoreader_alternate_view = (function () {

    const INOREADER_LINKS = `
        //div[@id='tree_pane']//*[
          not(ancestor::div[contains(@class,'_selected')])
        ][
          self::span[
            contains(@class,'tree_sub_node') or contains(@class,'tree_node')
          ] or self::img[
            contains(@src,'images/icon_arrow')
          ]
        ]
        |
        //div[@id='subscriptions_buttons']//*[
          self::a or self::button
        ][
          not(parent::div[contains(@class,'view_toolbar_inner')])
        ]
        |
        //div[@id='reader_pane']//a
    `;

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
    define_key(inoreader_keymap, "C-c C-s", toggle_subscriptions);

    function scroll_subscriptions(offset) {
        return function (I) {
            I.buffer.document.getElementById("tree_pane").scrollTop += offset;
        };
    }

    function toggle_order(I) {
        const $ = $$(I);
        $.xpath(xpath`//div[@id='sb_rp_section_options']/..//div[${'inno_toolbar_button_menu_item'}]`).filter(function () {
            return /(Newest|Oldest) first/.test(this.innerText) && $(this).children("span").length == 0;
        }).get(0).click();
    }

    function toggle_subscriptions(I) {
        $$(I).xpath("//div[(@id='subscriptions_radio_all' or @id='subscriptions_radio_updated') and not(./span)]").clickthis();
    }

    function kill_some_keys(event) {
        const elem = event.target;
        if (elem instanceof Ci.nsIDOMHTMLInputElement) return;
        if (elem instanceof Ci.nsIDOMHTMLTextAreaElement) return;
        if (event.key !== "f") return;
        event.stopPropagation();
    }

    const [enable, disable] = setup_mode(
        { normal: inoreader_keymap },
        { follow: browser_object_inoreader_links },
        buffer => {
            buffer.browser.addEventListener("keyup", kill_some_keys, true);
            buffer.browser.addEventListener("keydown", kill_some_keys, true);
        },
        buffer => {
            buffer.browser.removeEventListener("keyup", kill_some_keys, true);
            buffer.browser.removeEventListener("keydown", kill_some_keys, true);
        }
    );

    define_page_mode(
        "inoreader-mode",
        /^https?:\/\/(?:www\.)?inoreader\.com/,
        enable,
        disable,
        $display_name = "Inoreader"
    );

    page_mode_activate(inoreader_mode);

    const alternate_view = new Map;

    function view_alternate(I) {
        const $ = $$(I);
        const article = $.inoreader_current_article();

        if (article.length === 0) {
            I.minibuffer.message("No current article");
            return;
        }

        const titleLink = article.find("a[id^='article_feed_info_link_']");

        if (titleLink.length === 0) {
            I.minibuffer.message("Cannot locate feed title");
            return;
        }

        const title = titleLink.text().replace(/^\s+/, "").replace(/\s+$/, "");

        alternate_view.lookup(title).foreach(
            f => f(article, $, I)
        ).orElse(
            () => I.minibuffer.message("No alternate view defined for feed " + title)
        );

    }

    define_key(inoreader_keymap, "V", view_alternate);

    return function (title, callback) {
        alternate_view.set(title, callback);
    };

})();

$$.static.inoreader_current_article = function (/* selector */) {
    const article = this("#reader_pane div.article_current");
    return arguments.length === 0 ? article : article.find(arguments[0]);
};

$$.fn.inoreader_link = function () {
    return this.find("div.article_title a");
};

function inoreader_ignore_keydown_event(e) {
    return e.keyCode == 32  // space
        || e.keyCode == 70  // F
        || e.keyCode == 80  // P
        || e.keyCode == 83  // S
        || e.keyCode == 53  // 5 (so C-x 5 f works)
    ;
}
