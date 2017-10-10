$(function(){
    function handleResponse(message) {
      console.log(`Message from the background script:  ${message.response}`);
    }

    function handleError(error) {
      console.log(`Error: ${error}`);
    }

    function sendLinks(){
        console.log("Sending message");
        var allLinks = Array();
        $("a").each(function(){
            href = $(this).attr("href").toString();
            // Skip mozilla URLs that show up on the page.
            if (href.startsWith("moz-")){
                console.log("skipping" + href);
            }else {
                console.log("Adding link " + $(this));
                allLinks.push([href, $(this).text()]);
            }
        })
        var sending = browser.runtime.sendMessage({
            "docUrl": document.URL,
            "allLinks": allLinks
         });
         sending.then(handleResponse, handleError);
    }
});
