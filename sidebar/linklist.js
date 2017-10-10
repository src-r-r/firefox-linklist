$(function(){
    /**
     * Filters the link URL either by converting it or returning null.
     * @param docUrl Docurment URL.
     * @param href Link to convert.
     * @return the converted click-friendly link, or `null` if the link is
     *          invalid.
     **/
    function filterLink(protocol, hostname, pageHref, href) {
        console.log(`filtering ${href}`)
        if (href.startsWith("/")) { /* relative link */
            // The page href contains the full path, which we don't want.
            re = new RegExp(/^[\w]{2,5}\:\/\/[^\?\&\/]*/, 'i')
            baseUrl = re.exec(pageHref);
            console.log(`Matching ${re} against ${pageHref} -> ${baseUrl} + ${href}`);
            return baseUrl + href;
        } else if (href.startsWith("#")) { /* name */
            return pageHref + href;
        } else if (href.match(/^moz\-/)) {
            console.log("invalid link - mozilla extension");
            return null;
        }
        console.log(`Valid link: ${href}`);
        return href;
    }

    function filterLinkList(){
        val = $("input").val();
        console.log(val);
        $("ul#all-links li a").each(function(){
            $(this).parent().removeClass("exactMatch");
            var res = fuzzyMatch(val, $(this).attr("href"), $(this).text());
            var hasMatch = res[0];
            var link = res[1];
            var title = res[2].replace(/[\s\t]{1,}/gi,
                ' ').replace(/[\n\r]+/gi, '');
            $(this).html(title);
            if (hasMatch){
                $(this).parent().show();
            } else if (val.length > 0) {
                $(this).parent().hide();
            }
            /* move exact results to the top */
            exactMatch = $(this).text().toLowerCase().includes(val.toLowerCase());
            if (val.length > 0 && exactMatch){
                console.log(`Exact match: ${title}`);
                li = $(this).parent();
                $(li).detach();
                $("ul#all-links").prepend($(li));
                $(li).addClass("exactMatch");
            }
        });
    }

    function updateLinkList(request, sender, sendResponse){
        al = request.allLinks;
        $("ul#all-links").empty();
        for (var i = 0; i < al.length; i++){
            var href = filterLink(request.protocol,
                                  request.hostname,
                                  request.pageHref, al[i][0]);
            var title = al[i][1]
            if (href != null){
                a = "<li><a href=\"" + href
                    + "\" title=\"" + href +
                    "\">" + title + "</a></li>";
                $("ul#all-links").append(a);
            }
        }
        filterLinkList($("input"));
    }

    function fuzzyMatch(search, link, title){
        title = title.replace("<b>", "").replace("</b>", "");
        for (var c = 0; c < search.length; ++c){
            var char = search[c];
            var re = new RegExp('[' + search[c] + '](?!\>)', 'ig');
            if (!title.match(re)){
                title = title.replace("<b>", "").replace("</b>", "");
                return [false, link, title];
            } else {
                title = title.replace(re, "<b>$&</b>");
            }
        }
        return [true, link, title];
    }

    function onExecuted(result){
        console.log("Send link update request");
    }

    function onError(error){
        console.log(`Error: ${error}`);
    }

    function notifyTabUpdateList(tabId, selectInfo){
        var sendLinks = "var allLinks = Array();" +
                        "$('a').each(function(){" +
                        "    href = $(this).attr('href');" +
                        "    if (href == undefined){" +
                        "       href = ''; }" +
                        "    console.log('Adding link ' + $(this));" +
                        "    allLinks.push([href, $(this).text()]);" +
                        "});" +
                        "var sending = browser.runtime.sendMessage({" +
                        "    'protocol': window.location.protocol," +
                        "    'hostname': window.location.hostname," +
                        "    'pageHref': window.location.href," +
                        "    'allLinks': allLinks" +
                        "});" +
                        "sending.then(handleResponse, handleError);";
        browser.tabs.executeScript({
            code: sendLinks
        }).then(onExecuted, onError);
    }

    browser.runtime.onMessage.addListener(updateLinkList);


    browser.tabs.onActivated.addListener(notifyTabUpdateList);
    browser.tabs.onUpdated.addListener(notifyTabUpdateList);
    // browser.tabs.onSelectionChanged.addListener(notifyTabUpdateList);

    $(document).ready(function(){
        $("input").keyup(filterLinkList);
        $("input").keypress(filterLinkList);
        // $("input").change(filterLinkList);
    });
});
