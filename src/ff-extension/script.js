/**
 * Collects the eBay purchase history data from the current page and prints-out a report in the given format.
 */
function EbayReport(params) {
    params = params || {};

    var sortby = params.sortBy || '';
    var reverseorder = params.reverseorder || false;

    /**
     * Get the inner text of a HTML element
     * 
     * @param {Object}
     *            element - The DOM element
     * @param {String}
     *            value - The default value if element is NULL
     * @return {String}
     */
    function getInnerText(element, value) {
        return null !== element ? element.innerText : value;
    }

    /**
     * Get the attribute value of a HTML element
     * 
     * @param {Object}
     *            element - The DOM element
     * @param {string}
     *            name - The attribute name
     * @param {String}
     *            value - The default value if element is NULL
     * @return {String}
     */
    function getAttribute(element, name, value) {
        return null !== element ? element.getAttribute(name) : value;
    }

    function prepare() {
        // parse the document
        var orders = document.querySelectorAll('#orders .result-set-r .order-r');
        var order, item;

        var data = [];

        if (null !== orders) {
            for (order in orders) {
                if (orders.hasOwnProperty(order)) {
                    var purchaseDate = getInnerText(orders[order].querySelector('.order-row .purchase-header .row-date'), '');
                    var orderItems = orders[order].querySelectorAll('.item-level-wrap');

                    for (item in orderItems) {
                        if (orderItems.hasOwnProperty(item)) {
                            var purchasePrice = getInnerText(orderItems[item].querySelector('.cost-label'), 0);
                            var itemSpec = getInnerText(orderItems[item].querySelector('.item-spec-r .item-title'), '');
                            var deliveryDate = getInnerText(orderItems[item]
                                    .querySelector('.item-spec-r .delivery-date strong'), '');
                            var shipStatus = getAttribute(orderItems[item]
                                    .querySelector('.purchase-info-col .order-status .ph-ship'), 'title', '');

                            data.push({
                                purchaseDate : purchaseDate,
                                price : purchasePrice,
                                specs : itemSpec,
                                deliveryDate : deliveryDate,
                                shipStatus : shipStatus.replace(/.*?([\d\/]+)/g, '$1')
                            });
                        }
                    }
                }
            }
        }

        return data;
    }

    function sort(data) {
        // sort the result
        if (sortby.length) {
            // sort by non-date field
            var sort1 = function(a, b) {
                if (sortby)
                    return reverseorder ? a[sortby] < b[sortby] : a[sortby] > b[sortby];
            };

            // sort by date field
            var sort2 = function(a, b) {
                var date1 = Date.parse(a[sortby].replace(/.*-\s*/g, ''));
                var date2 = Date.parse(b[sortby].replace(/.*-\s*/g, ''));

                return reverseorder ? date2 - date1 : date1 - date2;
            };

            // sort by number
            var sort3 = function(a, b) {
                var num1 = parseFloat(a[sortby].replace(/[^\d.]+/g, ''));
                var num2 = parseFloat(b[sortby].replace(/[^\d.]+/g, ''));

                return reverseorder ? num2 - num1 : num1 - num2;
            };

            if ('price' == sortby) {
                data.sort(sort3);
            } else if ('purchaseDate' != sortby && 'deliveryDate' != sortby && 'shipStatus' != sortby) {
                data.sort(sort1);
            } else {
                data.sort(sort2);
            }
        }

        return data;
    }

    this.get_data = function() {
        return sort(prepare());
    };
}

function onButtonClick(params) {
    params = params || {
        sortby : "",
        reverseorder : false
    };

    var ebay_report = new EbayReport(params);

    // get the report data
    var data = ebay_report.get_data();

    // push the data to the web extension
    browser.runtime.sendMessage({
        reportData : {
            orders : data,
            sortby : params.sortBy,
            reverseorder : params.reverseorder,
            tabId : params.hasOwnProperty('tabId') ? params.tabId : null
        }
    });
}

// inject the Report button into the eBay purchase history page
var parent = document.querySelector('#orders .container-header');
if (parent) {
    var button_class = "ebay-purchase-report";
    var old_button = parent.querySelector("." + button_class);

    if (null === old_button) {
        var button = document.createElement('a');
        button.innerHTML = "Quick Report";
        button.setAttribute("class", button_class);
        button.setAttribute("href", "#");
        button.setAttribute("style", "float:right;padding:3px;background-color:#FFD700;color:#000");
        button.addEventListener("click", function(event) {
            onButtonClick();
        });
        parent.appendChild(button);
    }
}

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.hasOwnProperty('sortBy')) {
        onButtonClick(request);
    }
});