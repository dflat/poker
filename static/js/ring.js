var onlongtouch; 
var timer;
var touchduration = 100; //length of time we want the user to touch before we do something

const POLL_INTERVAL = 1000;
var cx_real;
var cy_real;
var column_touched;
const start_angles = [Math.PI/2 - Math.PI/6, -Math.PI/6, -Math.PI/2 - Math.PI/6] 
const AFK_TIMEOUT = 20*60 // stop updating if no touches in 20 minutes
var last_touch_start = Date.now()

function touchstart(e) {
    // TODO :make this into a dispatcher for all touches, so can check # of touches
    // and limit it to one... use ''this'' object to select which sub-handler to call
    last_touch_start = Date.now()
    var touch = e.touches[0];
    touch_start_time = Date.now(); 
    cx_real = touch.pageX
    cy_real = touch.pageY

    if (!active_suit || e.touches.length > 1)
        return
    debug_info('touches:'+e.touches.length)
    e.preventDefault();
    var card_node = cards[0];
    var w = card_node.clientWidth;
    var h = card_node.clientHeight;
    var mn_cx = MAX_R + px_in_em
    var mx_cx = d - (MAX_R + px_in_em)
    var mx_cy = MAX_R + px_in_em
    cx = Math.min(mx_cx, Math.max(mn_cx, cx_real))
    cy = Math.max(mx_cy, cy_real)
    column_touched = rescale(cx_real,mn=0,mx=w,a=0,b=2)

    //cards.forEach(draw_circle);
    intervalID = setInterval(resize_circle, 16);

    timer = setTimeout(onlongtouch, touchduration); 
}

var other_player_box_touch_down = { }
function other_players_box_touched(e) {
    var touch
    e.preventDefault()
    touch = e.touches[0]
    other_player_box_touch_down.triggered = false
    other_player_box_touch_down.t0 = Date.now()
    other_player_box_touch_down.x0 = touch.pageX
    other_player_box_touch_down.y0 = touch.pageY
    if (other_player_box_touch_down.x0 > w/2) 
        other_player_box_touch_down.triggered = true

}

function card_display_box_touched(e) {
    e.preventDefault()
    if (cards_obscured)
        return
    const i = this.index
    current_display_card_index = i
    clear_selected_card()
    remove_card_from_hand(i)
    if (get_hand_size() == 0) {
        current_display_card_index = 0
    }

}

function get_hand_size() { return Object.keys(hand).length }

function remove_card_from_hand(i) {
    delete hand[i]
}

function get_px_in_em(elem) {
    return parseFloat(getComputedStyle(elem).fontSize);
}

function resize_circle(){
    dur = (Date.now() - touch_start_time)*8/1000
    cards.forEach(draw_circle);
    console.log('resized circle');
}


var intervalID = 0;
var r = 0;
var d = 0;
var shift_y = 0;
var touch_start_time = 0;
var right_bound = -Math.PI/6//0
var left_bound = -(Math.PI + right_bound)//-(Math.PI)

var start_bound_left_side;
var start_bound_right_side;
var arclength = Math.PI - Math.PI/3

var dur = 0;
var MAX_R; 

function quad_ease(t) {
    //return (t + (1/4)*Math.sin(5*Math.PI*t))
    return Math.pow(t,1/2)
}

function draw_circle(card, i) {
//    var r = R*px_in_em;
    //d = Math.min(window.innerWidth, window.innerHeight);

    var clamped_dur = clamp(dur,mn=0,mx=1)
    r = quad_ease(clamped_dur)*MAX_R;

    L = i/(N-1); // runs from 0 to 1 in steps
    var t = (1-L)*right_bound + L*left_bound //-1*Math.PI*(i/(N-1));
    card.t = t; // store angular position on card node
    card.i = i;

    rotate_node(card, t + Math.PI/2)

    var dx = r*Math.cos(t);
    var dy = r*Math.sin(t);
    off_x = card.clientWidth/2;
    off_y = card.clientHeight/2;
    card.style.left = cx + 0*d/2 + dx - off_x + 'px';
    card.style.top = shift_y + cy + dy - off_y + 'px';
    
    if(card_is_already_in_hand(card)) {
        card.classList.add('already-selected-card')
    }
    else
        card.classList.remove('already-selected-card')

    if (dur >= 4) {
       clearInterval(intervalID);
    }
}

function rotate_node(node, theta){
    node.style.webkitTransform = 'rotate('+theta+'rad)';
    node.style.mozTransform    = 'rotate('+theta+'rad)';
    node.style.msTransform     = 'rotate('+theta+'rad)';
    node.style.oTransform      = 'rotate('+theta+'rad)';
    node.style.transform       = 'rotate('+theta+'rad)';
}

var cx = 0;
var cy = 0;
var px_in_em = 100;
var cards = [];
const CARD_VALS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const CARD_VAL_MAP = {'2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,
                        'J':9,'Q':10,'K':11,'A':12};
var N = CARD_VALS.length;


function init_card_nodes() {
    CARD_VALS.forEach((card) => {
        var node = document.createElement('div');
        node.style.fontSize = '1.5em';
        node.t = 0; //TODO should this be here?
        var anchor = document.createElement('a');
        anchor.text = card;
        anchor.style.fontSize = '1.5em';
        node.appendChild(anchor);
        node.id = card;
        node.style.position = 'absolute';
        cards.push(node);
        document.body.appendChild(node);
    });
    hide_card_nodes();
}

function hide_card_nodes() {
    cards.forEach(c => {
        c.style.left = '-100px';
        c.style.top = '-100px';
    });
}

function allow_drag_to_advance_round() {
    advance_triggered = false // ending the touch allows another round advance to begin
}

var last_touchend;
function touchend(e) {
    // handle half completed round advance drag
    if (drag_to_advance_round_started && !advance_triggered){
       reset_drag_to_advance_bar() 
    }
    allow_drag_to_advance_round()
    //touchdown = false

    var ctx = plane.getContext('2d');
    ctx.clearRect(0,0,plane.width,plane.height);
    hide_card_nodes();
    //stops short touches from firing the event
    if (intervalID){
        r = 0;
        clearInterval(intervalID);
    }
    if (timer)
        clearTimeout(timer); // clearTimeout, not cleartimeout..
    document.body.style.background = 'white';

    if (selected_card && active_suit) {
        update_hand_state()
        advance_display_card_index()
    }

    reset_suit_nodes()

    // post hand if player-felt isn't what was just touched
    if (Object.keys(hand).length == 2 && e.target.className != "other-players-box") {
        post_hand(username, hand)
    }
        // && e.target.className == "suit-box")

    // check for swipe, to vote to advance the round
    if (e.target.className == "other-players-box") {
        var x = e.changedTouches[0].pageX
        if (other_player_box_touch_down.triggered
            && Date.now() - other_player_box_touch_down.t0 < 1000
            && other_player_box_touch_down.x0 - x > w/8) {
            //vote_to_advance_round()
        }
    }

}


var MAX_HAND_SIZE = 2;
function update_hand_state() {
    var ix = current_display_card_index
    var card = display_cards[ix]
    hand[ix] = [card.value, card.suit]
}

function get_card_text_from_hand(i) {
    console.log(hand)
    console.log(i)
    var card = hand[i]
    return card.value + ''+suit_unicode[card.suit]
}

function advance_display_card_index(){
    const ix = current_display_card_index
    current_display_card_index = (ix + 1) % MAX_HAND_SIZE
}

var px = 0;
var py = 0;

function rescale(x,mn,mx,a=0,b=1){
    return a + ((x-mn)*(b-a))/(mx-mn);
}

function clamp(x, mn, mx) {
    return Math.min(mx, Math.max(mn, x));
}

var selected_card;
var prev_selected_card = null;
var card_select_start = null;
var select_interval_id;
function draw_sector(px,py) {
    // TODO -- expand radius proportional to thumb distance from circle center
    // -- easing functions, little overshoot-springy effects (if bored...)
    if (!active_suit)
        return
    var vx = px - cx_real; //TODO this is experimental .. switch back to cx, cy
    var vy = py - cy_real;
    var phi = Math.atan2(--vy,--vx); // inverted angle in (-pi,pi) for selection
    if (phi > Math.PI/2)
        phi = -Math.PI + (phi-Math.PI)

    // map horizontal swipe to circular sweep *not being used atm
    var range = r/2;
    var dx = -clamp(vx, mn=-range, mx=range);
    var L = rescale(dx, mn=-range, mx=range, a=left_bound, b=right_bound)
    var sector_width = Math.abs(left_bound-right_bound)
    //var phi = L;

   //var theta_slice = 2*Math.PI/(13);
    var theta_slice = 2*sector_width/(13);
    var ctx = plane.getContext('2d');
    ctx.clearRect(0,0,plane.width,plane.height);
    ctx.fillStyle = 'white';
    x0 = plane.width/2;
    ctx.beginPath();
    ctx.moveTo(cx + 0*x0,cy+shift_y);
    ctx.arc(cx + 0*x0,cy+shift_y,r+20,phi-theta_slice/2, phi+theta_slice/2);
    ctx.lineTo(cx + 0*x0,cy+shift_y);
    ctx.closePath();
    ctx.fill();

    // responsive sizing and opacity
    selected_card = null;
    var min_dist = 100;
    let zoom_factor = 1;
    cards.forEach(card => { 
        var anchor = card.querySelector('a')
        var dt = phi - card.t;
        var abs_dt = Math.abs(dt)
        if (abs_dt < theta_slice){
            card.style.opacity = 0.3 + 0.7*(1 - abs_dt/theta_slice);
            anchor.style.fontSize = 2 + zoom_factor*(1 - abs_dt/theta_slice) + 'em';
            if (abs_dt < min_dist){
                min_dist = abs_dt;
                selected_card = card;
                if(card_is_already_in_hand(selected_card)) {
                    selected_card = null;
                }
            }
        }
        else{
            card.style.opacity = 0.3;
            anchor.style.fontSize = '2em'
        }
    });
    if (min_dist > theta_slice){
        selected_card = null;
    }
    if (selected_card && active_suit){
        display_selected_card()
        //select_interval_id = setInterval(check_held_time, 100, card_select_start,
         //                               selected_card, prev_selected_card)
    }
    else {
        clear_selected_card()
        remove_card_from_hand(current_display_card_index)
    }

    prev_selected_card = selected_card


}

function card_is_already_in_hand(selected_card) {
    var result = false;
    Object.values(hand).forEach(card => {
        if (card[0] == selected_card.id && card[1] == active_suit) {
            result = true
        }
    });
    return result
}

function get_card_id(suit_string, value_string) {
    let val = CARD_VAL_MAP[value_string] + 1
    let suit = suit_codes[suit_string]
    return suit*13 + val
}

var current_display_card_index = 0;
function display_selected_card() {
    var display_box = display_cards[current_display_card_index]
    var display_anchor = display_box.querySelector('a')
    display_box.value = selected_card.innerText 
    display_box.suit = active_suit

    //display_anchor.innerText = selected_card.innerText + ' ' + suit_unicode[active_suit]
    //display_anchor.style.color = suit_colors_dark[suit_codes[active_suit]]

    if (display_box.card_id) {
        place_card_offscreen(display_box.card_id)
    }
    let card_id = get_card_id(active_suit, selected_card.innerText)
    place_card_in_display_box(card_id, current_display_card_index)
    display_box.card_id = card_id
    console.log('displaying ' + card_id)
}

function clear_selected_card() {
    var display_box = display_cards[current_display_card_index]
    var display_anchor = display_box.querySelector('a')
    display_box.value = null;
    display_box.suit = null;
    display_anchor.innerText = '' 

    if (display_box.card_id) {
        place_card_offscreen(display_box.card_id)
    }

}

function check_held_time(card_select_start, selected_card, prev_selected_card) {
    if (selected_card == prev_selected_card) {
        elapsed = Date.now() - card_select_start
        if (elapsed > 1000) {
            debug_info('held')
            clearInterval(select_interval_id)
            return
        }
    }
    else {
        card_select_start = Date.now();
        debug_info(selected_card.innerText + active_suit);
    }
}

var drag_to_advance_bar;
var drag_to_advance_msg;
var drag_to_advance_msg_w;
function init_drag_to_advance_bar() {
    var container = document.createElement('div')
    var node = document.createElement('a') 
    drag_to_advance_bar = container
    draw_to_advance_msg = node
    drag_to_advance_msg_w = w/2

    container.classList.add('drag-to-advance-round-box')
    node.classList.add('drag-to-advance-text')
    container.style.position = 'absolute'
    container.style.top = other_players_box.style.top //+ 'px'
    container.style.left = w + 1 + 'px'
    container.style.width = drag_to_advance_msg_w +'px'  //w - box_padding*2 + 'px'
//    container.style.height = h + 'px'
    container.style.minHeight = other_players_box.style.minHeight //h/8 + 'px'
    container.style.maxHeight = other_players_box.style.maxHeight //2*h/8 + 'px'

    node.style.fontSize = drag_to_advance_msg_w / 8+'px'
    node.innerText = 'go to next round...'//'...'

    container.appendChild(node)
    document.body.appendChild(container)
}

var advance_triggered = false
var drag_to_advance_round_started = false
function drag_bar_to_advance_round(event) {
    if (advance_triggered)
        return
    var touch = event.touches[0]
    var px = touch.pageX
    var py = touch.pageY
    var vx = px - cx_real
    var vy = py - cy_real

    drag_to_advance_round_started = true

    var trigger_at_dx = w/2
    var dx = clamp(-vx, mn=0, mx=trigger_at_dx);
    var L = rescale(dx, mn=0, mx=trigger_at_dx, a=0, b=1)
    
    //const max_shift = w/4
    const max_shift = drag_to_advance_msg_w
    drag_to_advance_bar.style.left = w - (L*max_shift)+'px'//w - L*w + 'px'//px + 'px'
    drag_to_advance_bar.style.background = `rgba(204,204,204,${L})`
    drag_to_advance_bar.style.opacity = L;
    other_players_box.style.left = L*(-w/2) + 'px'
   
    debug_info(px)
    if (-vx > w/2 && !advance_triggered) { //&& !touchdown) {
        advance_triggered = true
//        animate_box_offscreen(other_players_box, L*(-w/2))
        lerp(other_players_box, 'left', L*(-w/2), -w, 200, 'px', callback=vote_to_advance_round)
    }

}
/*
function animate_box_offscreen(box, start_left_x) {
   var t0 = Date.now()
   var max_shift = w + start_left_x
   lerp_slide = function (box) {
       let t = (Date.now() - t0)/400
       box.style.left = start_left_x - max_shift*Math.pow(t,2)  + 'px'
       //drag_to_advance_bar.style.opacity = 1 - Math.pow(t,2)
       //let col = Math.pow(t,2)*255
       //drag_to_advance_bar.style.color = `rgb(${col},${col},${col})` 
       if (t > 1) {
           clearInterval(lerp_slide_id)
           vote_to_advance_round()
       }
   }
   var lerp_slide_id = setInterval(lerp_slide, 16, box)
}
*/
//var touchdown = false
function touchmove(event) {
    //touchdown = true
    if (event.target.className == "other-players-box" && cx_real > 0.80*w) {
        drag_bar_to_advance_round(event)
    }
    var touch = event.touches[0];
    px = touch.pageX;
    py = touch.pageY;
    draw_sector(px,py);
    //TODO move stuff into this function from draw sector (that isnt drawing sector)
    /*
    var up = (event.pageY > this.lastY), down = !up;
    this.lastY = event.pageY;
    if ((up && this.allowUp) || (down && this.allowDown)) event.stopPropagation();
    else event.preventDefault();
    */
}

onlongtouch = function() {
    //document.body.style.background = 'blue';
    console.log('touch noted.'); 
};

var plane;
function init_canvas() {
    plane = document.getElementById('plane');
    plane.width = window.innerWidth;
    plane.height = window.innerHeight;
    plane.classList.add('lock-screen');
}

var suit_nodes = [];
const suits = ['hearts','diamonds','spades','clubs']
const suit_codes = {'hearts':0,'diamonds':1,'spades':2,'clubs':3}
const suit_unicode = {hearts:'\u2665', diamonds:'\u2666', spades:'\u2660', clubs:'\u2663'};
var active_suit = null;
var SUIT_SELECTED_CLS = 'selected-suit'

function show_suit_choices() {
    suit_nodes.forEach(node => document.body.append(node));
}

function reset_suit_nodes() {
    suit_nodes.forEach(node => {
        node.classList.remove(SUIT_SELECTED_CLS)
        active_suit = null;
        reset_suit_size(node);
        node.style.opacity = suit_default_opacity;
    });
    clearInterval(suit_box_touched_interval_id)

}

function reset_suit_size(node){
    node.style.fontSize = suit_symbol_size_px + 'px'
}

var suit_box_touched_interval_id;
function suit_box_touched(e) {
    if (e.touches.length > 1 || cards_obscured)
        return
    e.preventDefault()
    suit_box_touched_interval_id = setInterval(modulate_suit_size, 16, this)
    this.classList.add(SUIT_SELECTED_CLS)
    active_suit = this.suit
}

function modulate_suit_size(suit_box) {
    var suit_symbol = suit_box.querySelector('a')
    var s = suit_symbol_size_px
    var ds = 20
    var t = (Date.now() - touch_start_time) / 1000
    var M = Math.pow(Math.sin(2*t),2)
    suit_symbol.style.fontSize =  s + ds*M + 'px'
    suit_box.style.opacity = .5 + 0.1*M
}


var suit_symbol_size_px;
var suit_default_opacity;
const suit_colors = ['#ec2c30', '#ec2c30', '#404241', '#404241']
const suit_colors_dark = [ '#ec2c30', //hearts
                           '#ec2c30', //diam
                            '#0a1527', //spades
                           '#0a1527'] //clubs

var main_suit_boxes = {}
function init_suit_nodes() {
    var i = 0
    var w = window.innerWidth
    var h = window.innerHeight
    var left_edge = 2*w/8
    var quad_w = w/2 - left_edge
    var quad_h = quad_w//h/4
    var font_size = quad_w/2
    suit_symbol_size_px = font_size
    suits.forEach((suit,i) => {

        var container = document.createElement('div')
        var node = document.createElement('a') 

        container.name = 'suit_box_'+suit
        main_suit_boxes[container.name] = container

        node.style.fontSize = font_size + 'px' //font_size + 'em'
        //node.style.position = 'absolute' // no ...center in the div...
        node.innerText = suit_unicode[suit]
        node.data = suit
        node.classList.add('big-suit')
        container.classList.add('suit-box')
        container.data = suit
        container.suit = suit
        container.style.position = 'absolute'
        container.style.left = left_edge + (i%2) * quad_w + 'px'
        container.style.bottom = (Math.trunc(i/2) %2) * quad_h + 'px'
        container.style.width = quad_w +'px'
        container.style.height = quad_h + 'px'
        container.style.background = suit_colors[i]
        container.appendChild(node)
        container.addEventListener("touchstart", suit_box_touched, true);
        suit_nodes.push(container)
    });
}


/* --- functions to load data from server */
var emoji;
function load_emoji(emoji_from_server) {
    emoji = emoji_from_server;
}

var data_from_server = {};
function load_data_from_server(attr, val) {
    console.log('got from server: ' + attr + ':' + val)
    data_from_server[attr] = val;
}
/* --- end functions to load data from server */


function get_random_emoji() {
    var i = Math.floor(Math.random() * emoji.length)
//    var rand_key = Object.keys(emoji)[i]
    return emoji[i]['emoji']
}

var fold_text_node;
function init_fold_btn() {
    var bar_height = Math.round(h/8) - 10
    var quad_h = h/4
    var bar_height = Math.round(h/16) - 10
    var container_width = w/4
    var font_size = container_width / 4

    var container = document.createElement('div')
    var text_node = document.createElement('a') 
    fold_text_node = text_node

    container.classList.add('fold-btn')
    text_node.classList.add('fold-btn-text')

    text_node.style.fontSize = font_size + 'px' 
    var glasses = query_emoji(emoji,
                                (x) => x['name'].toLowerCase().includes('sunglasses'))
    text_node.innerText = "fold" //glasses //'obscure/reveal'

    container.style.position = 'absolute'
    container.style.left = 0 + 'px' 
    container.style.bottom = 0 + 'px'//bar_height + 10 + 8 + quad_h + 'px'
    container.style.width = container_width +'px'
    container.style.height = container_width + 'px'//quad_h - bar_height - 10 - 8 + 'px'

    container.addEventListener("touchstart", fold_box_touched, false);

    container.appendChild(text_node)
    document.body.appendChild(container)
}

var obscure_card_btn;
function init_obscure_btn() {
    var bar_height = Math.round(h/8) - 10
    var quad_h = h/4
    var bar_height = Math.round(h/16) - 10
    var container_width = w/4
    var font_size = container_width / 2

    var container = document.createElement('div')
    obscure_card_btn = container
    var text_node = document.createElement('a') 
    container.classList.add('obscure-btn')
    text_node.classList.add('obscure-btn-text')

    text_node.style.fontSize = font_size + 'px' 
    var glasses = query_emoji(emoji,
                                (x) => x['name'].toLowerCase().includes('sunglasses'))
    text_node.innerText = glasses //'obscure/reveal'

    container.style.position = 'absolute'
    container.style.right = 0 + 'px' 
    container.style.bottom = 0 + 'px'//bar_height + 10 + 8 + quad_h + 'px'
    container.style.width = container_width +'px'
    container.style.height = container_width + 'px'//quad_h - bar_height - 10 - 8 + 'px'

    container.addEventListener("touchstart", obscure_box_touched, false);

    container.appendChild(text_node)
    document.body.appendChild(container)
}

var folded = false; //TODO: use this to allow unfolding
function fold_box_touched(e) {
    e.preventDefault()
    if (e.touches.length > 1)
        return
    if (Object.keys(hand).length < 2)
        return
    fold_hand(username)
    var text_node = this.querySelector('a')
    text_node.innerText = 'folded'
}

var cards_obscured = false
var hidden_cards_text = []
var hidden_card_ids = []

function obscure_cards() {
    obscure_card_btn.classList.add('obscure-on')
    display_cards.forEach((disp_card,i) => {
        var text_node = disp_card.querySelector('a')
        hidden_cards_text.push(text_node.innerText)

        let display_box = display_cards[i]
        if (display_box.card_id) {
            place_card_offscreen(display_box.card_id)
            hidden_card_ids.push(display_box.card_id)
        }

        text_node.innerText = get_random_emoji()
    });
    cards_obscured = true
}

function un_obscure_cards() {
    obscure_card_btn.classList.remove('obscure-on')
    display_cards.forEach((card,i) => {
        var text_node = card.querySelector('a')
        var original_card_text = hidden_cards_text.shift()
        text_node.innerText = original_card_text

        let card_id = hidden_card_ids.shift()
        if (card_id) {
            place_card_in_display_box(card_id, i)
        }
        
    });
    cards_obscured = false
}

function obscure_box_touched(e) {
    e.preventDefault()
    if (e.touches.length > 1)
        return

    if (!cards_obscured) { 
        obscure_cards()
    }
    else { 
        un_obscure_cards()
    }
}


var username;
var round_node;
function init_status_bar() {
    var bar_height = Math.round(h/16) - 10
    var font_size = bar_height / 2

    var container = document.createElement('div')
    var name_node = document.createElement('a') 
    round_node = document.createElement('a') 

    container.classList.add('status-bar')

    name_node.classList.add('name-tag')
    name_node.classList.add('status-tag')
    name_node.style.fontSize = font_size + 'px' 
    name_node.style.maxWidth = w/2 + 'px'

    round_node.classList.add('round-num-tag')
    round_node.classList.add('status-tag')
    round_node.style.fontSize = font_size + 'px' 

    console.log('data_from_server: '+ data_from_server['username'])

    username = data_from_server['username'] || get('name') ||
                        'default_name' + get_random_emoji()

    name_node.innerText = username
    round_node.innerText = 'round # ' + data_from_server['round_no']

    container.style.position = 'absolute'
    container.style.left = 0 + 'px' 
    container.style.top = 0 + 'px'
    container.style.width = w +'px'
    container.style.height = bar_height + 'px'

    container.appendChild(name_node)
    container.appendChild(round_node)
    document.body.appendChild(container)
}

var other_players_box;
var other_players_box_left;
var other_players_box_min_h;
function init_other_players_box() {
    const box_top_offset = h/16 + h/4 + 10 + 10 //TODO added 10 here, idk if any dependent positions
    const box_padding = 10
    other_players_box_left = box_padding
    other_players_box_min_h = h/8
    var container = document.createElement('div')
    container.classList.add('other-players-box')
    container.style.position = 'absolute'
    container.style.top = box_top_offset + 'px'
    container.style.left = other_players_box_left + 'px'
    container.style.width = w - box_padding*2 + 'px'
    container.style.minHeight = other_players_box_min_h + 'px'
    container.style.maxHeight = 2*other_players_box_min_h + 'px'

    container.addEventListener("touchstart", other_players_box_touched, false); //WIP
    container.addEventListener("touchmove", touchmove, false); //WIP
    document.body.appendChild(container)
    other_players_box = container
}

var active_players = { }
function add_other_players_hand(player_info) {
    var div = document.createElement('div')
    var anchor = document.createElement('a')
    div.classList.add('other-player-hand-container')
    anchor.classList.add('other-player-hand-text') 
    anchor.innerText = player_info.emoji //username // + (emoji || '')
    anchor.style.fontSize = other_players_box_min_h/2 + 'px' 
    div.appendChild(anchor)
   // check_if_won_last_round(player_info, div)  // don't do this here, no DOM bbox data 'til added
    other_players_box.appendChild(div)
    check_if_won_last_round(player_info, div) // check after adding to DOM to get rendered bbox data
    active_players[player_info.username] = div
}

function check_for_round_winners(round_no) {
    let check_winner = function (xhr) {
        let resp = JSON.parse(xhr.response)
        let winner_ids = []
        if (!resp.winners) {
            console.log('no winners returned from server.')
            return
        }
        for (let [key, user_id] in Object.entries(resp.winners)) {
            winner_ids.push(resp.winners[key])
        }
        if (winner_ids.length > 0) {
            winners = winner_ids
            console.log('winners::: ' + winners)
        }
    }

    const endpoint = `/api/round/${round_no}`
    ajax_request(endpoint, check_winner) 

}

function check_if_won_last_round(player_info, div) {
    if (winners && winners.includes(player_info.id)) {
//        div.style.background = 'yellow' // TODO: WIP
        let anchor = document.createElement('a')
        anchor.innerHTML = '&#128081;' // crown emoji👑
        anchor.style.position = 'relative'
        anchor.style.display = 'block'
        anchor.style.height = 0 // don't take up space in div
        anchor.style.fontSize = 3 + 'em'
        anchor.style.zIndex = 2;
        div.appendChild(anchor)
        let div_bbox = div.getBoundingClientRect()
        let anchor_bbox = anchor.getBoundingClientRect()
        let dx = div_bbox.left - anchor_bbox.left
        let dy = div_bbox.top - anchor_bbox.top
        let pixw = get_px_in_em(anchor)
        console.log('dx,dy: ' + dx + ' ' + dy + 'bbox,div,anch:' + div_bbox + ' ' + anchor_bbox)
        anchor.style.top = dy - pixw/2 + 'px'
        anchor.style.left = dx - pixw + 'px'
        
        rotate_node(anchor, -Math.PI/4)

    }

}

function cull_player(username) {
   console.log('cleared player')
   node = active_players[username]
   node.remove()
   delete active_players[username]
   console.log(active_players)
}

/*
function nest(...elems) {
    nodes = []
    var root = document.createElement(elems[0])
    nodes.append(root)
    for (var i=1; i < elems.length; i++){
        node = document.createElement(elems[i])
        root.appendChild(node)
        root = node
    }
}
*/

var display_cards = [];
function init_card_display_node(i) {
    var w = window.innerWidth
    var h = window.innerHeight
    var half_w = w/2
    var pad = 10
    var disp_w = half_w - 2*pad
    var quad_h = h/4
    var font_size = half_w/2

    var container = document.createElement('div')
    var node = document.createElement('a') 
    node.style.fontSize = font_size + 'px' 
    node.innerText = ''
    
    node.index = i
    container.index = i
    node.id = 'display-card' + i
    container.id = 'display-card-box' + i
    node.classList.add('display-card')
    container.classList.add('display-card-box')

    container.value = null;
    container.suit = null;
    container.style.position = 'absolute'
    //container.style.left = i * half_w + 4 + 'px'
    container.style.left = i * (half_w) + pad + 'px'
    container.style.top = Math.round(quad_h/4) + 'px'
    //container.style.width = half_w - 8 +'px'
    container.style.width = disp_w +'px'
    container.style.height = quad_h + 'px'

    //node.style.color = suit_colors[i]

    container.appendChild(node)
    display_cards.push(container)
    document.body.appendChild(container)
    container.addEventListener("touchstart", card_display_box_touched, false); //WIP

}

var round_no; // = 0;
var winners;
function update_round_node(i) {
    round_node.innerText = 'round # ' + i

    // advanced to new round
    if (round_no != undefined && i > round_no) {
        clean_slate_for_new_round()
        check_for_round_winners(round_no)
    }
    round_no = i
}

function lerp(elem, attr, val_start, val_end, dur, units, callback,lerp_func=(t)=>t*t) {
       var set_attr = function (elem, attr, val) { elem.style[attr] = val }
       var t0 = Date.now()
       interpolate = function() {
           let t = (Date.now() - t0)/dur
           //t = Math.pow(clamp(t, mn=0, mx=1), 2) // quadradic
           t = lerp_func(clamp(t, mn=0, mx=1)) // apply custom lerp easing func
           let val = (1-t)*val_start + t*val_end // interpolation
           set_attr(elem, attr, val + units)
           if (t == 1) { // end interpolation
               clearInterval(lerp_interval_id)
               if (callback)
                   callback()
           }
       }
       var lerp_interval_id = setInterval(interpolate, 16) // start interpolation
}

function reset_drag_to_advance_bar() {
    var cur_left_box = other_players_box.getBoundingClientRect().left
    var cur_left_text = drag_to_advance_bar.getBoundingClientRect().left
    var displacement = cur_left_box - other_players_box_left
    let T = 200
    if (displacement != 0) { // interpolate back to original position
        lerp(other_players_box, 'left', cur_left_box, other_players_box_left, T, 'px') 
        lerp(drag_to_advance_bar, 'left', cur_left_text, w + 1, T, 'px') 
    }
    else {
        drag_to_advance_bar.style.left = w + 1 + 'px'
        other_players_box.style.left = other_players_box_left+'px'
    }
}

function clear_winners() {
    winners = []
}

function clean_slate_for_new_round() {
    reset_drag_to_advance_bar()
    fold_text_node.innerText = 'fold'
    un_obscure_cards()
    clear_winners()
    for (let i = 0; i < 2 ; i++) {
        var j = 1-i // for some reason there's no i-- in javascript I guess
        current_display_card_index = j
        clear_selected_card()
        remove_card_from_hand(j)
    }
}

var card_svgs;
var card_svgs_fan = []
var card_width;
function init_card_svgs() {
    card_svgs = document.querySelectorAll('#card-svgs > svg') // Original svg set

    let card_fan_div = document.createElement('div')          // Clone set for user selection fan
    card_fan_div.id = "card-svg-fan"
    card_svgs.forEach((card) => {
        let clone = card.cloneNode(true) // deep clone
        card_fan_div.appendChild(clone)
        card_svgs_fan.push(clone)
    })
    document.body.appendChild(card_fan_div)

    let aspect = 25/35
    card_width = w/4 // get display-card-box0 and use its width - some padding (todo)
    let apply_style = (card_svg_collection, y_pos) => {
        card_svg_collection.forEach(card => {
            // add css class 'hidden' (todo?)
            card.style.display = 'none'
            card.style.position = 'absolute'
            card.style.width = card_width + 'px'
            card.style.height = card_width*(1/aspect) + 'px'
            card.style.left = -card_width - 10 + 'px'
            card.style.top = y_pos + 'px'
        })
    }
    apply_style(card_svgs, 0)
    apply_style(card_svgs_fan, 0)
}

function place_card_svg(card_id, cx, cy) {
    let card = card_svgs[card_id-1]
    card.style.display = ''
    let card_bbox = card.getBoundingClientRect()
    let card_cx = card_bbox.left + card_bbox.width/2
    let card_cy = card_bbox.top + card_bbox.height/2
    let dx = cx - card_cx
    let dy = cy - card_cy
    card.style.left = card_bbox.left + dx + 'px'
    card.style.top = card_bbox.top + dy + 'px'
}

function place_card_in_display_box(card_id, display_box_id) {
    let display_elem = display_cards[display_box_id]
    let display_bbox = display_elem.getBoundingClientRect()
    let cx = display_bbox.left + display_bbox.width/2
    let cy = display_bbox.top + display_bbox.height/2
    place_card_svg(card_id, cx, cy)
}

function place_card_offscreen(card_id) {
    let card = card_svgs[card_id-1]
    card.style.display = 'none'
    card.style.left = -card_width - 10 + 'px'
    card.style.top = 0 + 'px'
}

var hand = { };
var debug_node;
var debug_msg = '';
const DEBUG_MODE = false
function debug_info(msg) {
   if (DEBUG_MODE) {
       debug_node.innerText = msg; 
       debug_msg = msg;
   }
}

function init_debug(){
    if (DEBUG_MODE) {
        debug_node = document.createElement('p')
        debug_node.style.fontSize = '2em'
        debug_node.style.background = 'pink'
        debug_node.style.position = 'absolute'
        debug_node.style.left = '0px'
        debug_node.style.top = '0px'
        debug_node.innerText = 'debug info'
        document.body.appendChild(debug_node)
    }
}

/* ---- utility funcs */


const API_ENDPOINT = '/api/hand'

function fold_hand(user) {
    const endpoint = '/api/hand/fold'
    query = `?user=${user}`;
    var url = endpoint + query
    ajax_request(url, fold_hand_done);
}

function fold_hand_done() {
}

function vote_to_advance_round() {
    advance_round()
}

function advance_round() {
    var url = '/api/advance'
    ajax_request(url, round_advanced)
    debug_info('advance round called')
}
function round_advanced(xhr) {
    debug_info('advance round returned')

    resp = JSON.parse(xhr.response)
    if ("error" in resp)
        reset_drag_to_advance_bar() // ExPeRiMeNtAl, TODO verify if it should be here.

    // lock updates globally, so no polling update occurs
    // while this triggered update occurs.
    global_update_locked = true
    get_round_data(pass_thru_lock=true)

}

function post_hand(user, hand) {
  console.log('posted hand for:'+user)
  var card_a = hand[0][0] + '_' + hand[0][1]
  var card_b = hand[1][0] + '_' + hand[1][1]
  query = `?user=${user}&card_a=${card_a}&card_b=${card_b}`;
  var url = API_ENDPOINT + query;
  ajax_request(url, ajax_request_done);
}

var global_update_locked=false
function get_round_data(pass_thru_lock=false) {
    let time_since_last_touch = Date.now() - last_touch_start
    if (time_since_last_touch > AFK_TIMEOUT*1000)
        return
    if (global_update_locked && !pass_thru_lock){
        debug_info('locked out')
        return
    }
    if (global_update_locked && pass_thru_lock) {
        debug_info('passed thru lock')
        global_update_locked=false
    }
    const endpoint = '/api/round/current'
    ajax_request(endpoint, process_round_data) 
}

function process_round_data(xhr) {
    var data = JSON.parse(xhr.response)
    var keys = Object.keys(data)
    if (keys.length == 0)
        return
    console.log(data['round_no'])
    update_round_node(data['round_no'])
    
    var players = data['players']
    for (var username in players) {
        var player_info = players[username]
        // add new players to the round
        if (!(username in active_players)) {
            add_other_players_hand(player_info)
        }
        // remove folded players from the round
        if (player_info.folded == 1) {
            console.log(username + ' folded')
            cull_player(username);
        }
    }
    //cull old players from prev round
    for (player in active_players) {
        if (!(player in players)) {
            cull_player(player)
        }
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


function query_emoji(arr, pred) {
    var matches = []
    arr.forEach(item => {
        if (pred(item))
            matches.push(item)
    });
    if (matches.length == 0)
        return null
    return matches[0]['emoji']
}

function toUTF16(codePoint) {
  var TEN_BITS = parseInt('1111111111', 2);
  function u(codeUnit) {
    return '\\u'+codeUnit.toString(16).toUpperCase();
  }

  if (codePoint <= 0xFFFF) {
    return u(codePoint);
  }
  codePoint -= 0x10000;

  // Shift right to get to most significant 10 bits
  var leadSurrogate = 0xD800 + (codePoint >> 10);

  // Mask to get least significant 10 bits
  var tailSurrogate = 0xDC00 + (codePoint & TEN_BITS);

  return u(leadSurrogate) + u(tailSurrogate);
}

function get(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
      return decodeURIComponent(name[1]);
}

function each(obj, fn) { Object.keys(obj).forEach(key => fn(key, obj[key])); }

function rgb_to_hex(rgb_arr) {
    /*
    var hex = []
    rgb_arr.forEach(b => {
        b = b.toString(16)
        hex.push(b.length == 1 ? '0'+b : b)
    });
    */
    var hex = rgb_arr.map( b => {
        b = b.toString(16)
        return b.length == 1 ? '0'+b : b
    });
    return "#"+hex.join('')
}
/* ---- end utility funcs */

/*TODO.. use this to respond to changing viewport size on device...*/
var w;
var h;
function update_dimensions() {
    w = window.innerWidth
    h = window.innerHeight
    d = Math.min(window.innerWidth, window.innerHeight);
    MAX_R = Math.round((.7)*d/2)
}

document.addEventListener("DOMContentLoaded", function(event) {

    update_dimensions()
    //d = Math.min(window.innerWidth, window.innerHeight);
    //MAX_R = Math.round((.9)*d/2)
    shift_y = 0//-(r);

    //init_debug();
    init_card_nodes();
    init_suit_nodes();
    init_canvas();
    init_status_bar();
//    check_for_round_winners() //WIP EXPERIMENTAL
    winners = data_from_server.winners
    console.log('winners from page load: ' + winners)
    init_other_players_box()
    init_obscure_btn();
    init_fold_btn();
    init_card_display_node(0) // to display two chosen cards
    init_card_display_node(1)
    init_drag_to_advance_bar()
    init_card_svgs()
    init_debug();

    px_in_em = get_px_in_em(cards[0])
    //suit_symbol_size_px = window.innerWidth/4;
    suit_default_opacity = 0.2;
    show_suit_choices();  

    window.addEventListener("touchstart", touchstart, false);
    window.addEventListener("touchend", touchend, false);
    window.addEventListener("touchmove", touchmove, false);
    //window.addEventListener("touchmove", touchmove, false);
   // document.body.addEventListener("touchmove", touchmove, false);

    //TODO: dynamic poll rate
    var get_round_data_interval_id = setInterval(get_round_data, POLL_INTERVAL)

});

