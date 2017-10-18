$(function(){
    /**
     * Filters the link URL either by converting it or returning null.
     * @param docUrl Docurment URL.
     * @param href Link to convert.
     * @return the converted click-friendly link, or `null` if the link is
     *          invalid.
     **/
    function filterLink(protocol, hostname, pageHref, href) {
        // Case 1: Mozilla extension
        // Sometimes an extension gets mixed in with the URLs. Ignore these.
        if (protocol.startsWith("moz-extension://")){
            console.log(`filtering [${protocol}] ${href} -> null: case 1`);
            return null;
        }
        // Case 2: URL length is < 1
        //      these are cases where the URL is just a blank tag '#'
        //      or just a slash '/'
        if (href == null || href.length <= 1){
            console.log(`filtering ${href} -> null: case 2`);
            return null;
        // Case 3: Easy match case. If the URL starts with <protocol>://
        //      Simply return the href in this case.
        } else if (href.match(/^[\w]{2,5}\:\/\//)) {
            console.log(`filtering ${href} -> ${href}: case 3`);
            return href;
        // Case 4: name link
        } else if (href.startsWith('#')) {
            console.log(`filtering ${href} -> ${pageHref}${href}: case 4`);
            return pageHref + href;
        // Case 5: relative page href
        //      return "protocol://hostname/<href>"
        } else if (href.startsWith('/')) {
            console.log(`filtering ${href} -> ${protocol}${hostname}${href}: case 5`);
            return protocol + hostname + href;
        }
        console.log(`filtering ${href}: None of the above :()`);
        return null;
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
            if (href == null){
                console.log("filtered link is null");
                continue;
            }
            var title = al[i][1]
            a = "<li><a href=\"" + href
                + "\" title=\"" + href +
                "\">" + title + "</a></li>";
            console.log(`ul.append("${a}")`);
            $("ul#all-links").append(a);
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
        console.log("Error: " + error);
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
        notifyTabUpdateList(null, null);
        $("input").keyup(filterLinkList);
        $("input").keypress(filterLinkList);
        // $("input").change(filterLinkList);
    });
});
