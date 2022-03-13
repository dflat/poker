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

function ajax_request_done(data) {
    console.log('ajax request finished')
    console.log(data);
}

HOST = '192.168.1.171'
API_ENDPOINT = '/api/hand'

function post_hand(user, card_a, card_b) {
  query = `?user=${user}&card_a=${card_a}&card_b=${card_b}`;
  url = API_ENDPOINT + query;
  ajax_request(url, ajax_request_done);
}

function init() {

    console.log('app started...');
    cells = document.querySelectorAll('.card-cell');

    var chosen = [];

    const CHOSEN = "chosen"
    var user = document.querySelector('#card-grid').getAttribute('data');

    function choose(event) { 
      event.preventDefault();
      got = event.currentTarget.querySelector('.card');
      var already_chosen = chosen.indexOf(got);
      console.log('already',already_chosen);

      if (already_chosen > -1) {
        // un-choose
        removed = chosen.splice(already_chosen, 1);
        got.classList.remove(CHOSEN);
      }
      else {
        if (chosen.length > 1) {
          // only allow 2 selected cards at a time
          removed = chosen.shift();
          removed.classList.remove(CHOSEN);
        }
        chosen.push(got);
        got.classList.add(CHOSEN);
      }

      if (chosen.length == 2) {
          // post hand to server
          card_a = chosen[0].getAttribute('data');
          card_b = chosen[1].getAttribute('data');
          post_hand(user, card_a, card_b);
      }

    }

    function register_click_listener(elem) {
      elem.onclick = choose;
    }

    cells.forEach(register_click_listener);
}
