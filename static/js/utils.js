/* --- functions to load data from server */
/*
var emoji;
function load_emoji(emoji_from_server) {
    emoji = emoji_from_server;
}

var data_from_server = {};
function load_data_from_server(attr, val) {
    console.log('got from server: ' + attr + ':' + val)
    data_from_server[attr] = val;
}
*/
/* --- end functions to load data from server */

function ajax_request(url, callback){
    var xhr = new XMLHttpRequest();
    xhr.onloadend = function(e){
        callback(xhr);
    };
    xhr.open('GET', url);
    xhr.send();
}

console.log('loaded utils.js')
