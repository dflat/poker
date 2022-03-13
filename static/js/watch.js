const HOST = '192.168.1.171'
const API_BASE = '/api'
const POLL_INTERVAL = 1000;

document.onreadystatechange = function () {
  if (document.readyState === 'complete') {
    init();
  }
}


function ajax_request(url, callback){
    var xhr = new XMLHttpRequest();
    xhr.onloadend = function(e){
        callback(xhr);
    };
    xhr.open('GET', url);
    xhr.send();
}


function get_round(round_id) {
  url = API_BASE + `/round/${round_id}`
  ajax_request(url, update_round_data);
}


function get_hands_html_frag() {
  url = API_BASE + `/watch/update_hands`
  ajax_request(url, update_round_data);
}


function replace_node(old_id, new_html) {
    old_container = document.getElementById(old_id)
    let frag = document.createRange().createContextualFragment(new_html);
    old_container.replaceWith(frag);
}


function update_round_data(xhr_data) {
    div_container = xhr_data.response;
    replace_node('hands-container', div_container);
}


function poll_for_updates() { setInterval(get_hands_html_frag, POLL_INTERVAL); }


function toggle_hands_visibility() {
    var elem = document.getElementById('watch-container');
    elem.classList.toggle('obscure-view');
}


function register_click_listener(id, callback) {
    var elem = document.getElementById(id);
    elem.onclick = callback;
}


function init() {
    console.log('watch started...');
    register_click_listener('display-toggle', toggle_hands_visibility);
    poll_for_updates();
}
