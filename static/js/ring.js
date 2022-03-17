var onlongtouch; 
var timer;
var touchduration = 100; //length of time we want the user to touch before we do something

function touchstart(e) {

    if (!active_suit || e.touches.length > 1)
        return
    debug_info('touches:'+e.touches.length)
    e.preventDefault();
    touch_start_time = Date.now(); 
    var touch = e.touches[0];
    var card_node = cards[0];
    var w = card_node.clientWidth;
    var h = card_node.clientHeight;
    var mn_cx = MAX_R + px_in_em
    var mx_cx = d - (MAX_R + px_in_em)
    var mx_cy = MAX_R + px_in_em
    //debug_info(mn_cx +' '+ touch.pageX +' '+ mx_cx)
    cx = Math.min(mx_cx, Math.max(mn_cx, touch.pageX))
    cy = Math.max(mx_cy, touch.pageY)

    //cards.forEach(draw_circle);
    intervalID = setInterval(resize_circle, 16);

    timer = setTimeout(onlongtouch, touchduration); 
}

function card_display_box_touched(e) {
    e.preventDefault()
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
var N = CARD_VALS.length;


function init_card_nodes() {
    CARD_VALS.forEach((card) => {
        var node = document.createElement('div');
        node.style.fontSize = '2em';
        node.t = 0; //TODO should this be here?
        var anchor = document.createElement('a');
        anchor.text = card;
        anchor.style.fontSize = '2em';
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
function touchend(e) {

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
    var msg = []
//    hand.forEach(card => msg.push(card[0]+suit_unicode[card[1]]))
    each(hand, (i,card) => msg.push(card[0]+suit_unicode[card[1]]))
    debug_info('cards in hand: ' + msg.join(', '))
//    debug_info('cards in hand:'+hand[0][0]+hand[0][1]+', '+hand[1][0]+hand[1][1])

}

var MAX_HAND_SIZE = 2;
function update_hand_state() {
    var ix = current_display_card_index
    var card = display_cards[ix]
    hand[ix] = [card.value, card.suit]
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
    // -- delete selected display card when tapped
    // -- easing functions, little overshoot-springy effects (if bored...)
    if (!active_suit)
        return
    var vx = px - cx;
    var vy = py - cy;
    var phi = Math.atan2(--vy,--vx); // inverted angle in (-pi,pi)
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
    cards.forEach(card => { 
        var anchor = card.querySelector('a')
        var dt = phi - card.t;
        var abs_dt = Math.abs(dt)
        if (abs_dt < theta_slice){
            card.style.opacity = 0.3 + 0.7*(1 - abs_dt/theta_slice);
            anchor.style.fontSize = 2 + 1*(1 - abs_dt/theta_slice) + 'em';
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

    // draw suit in center TODO

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

var current_display_card_index = 0;
function display_selected_card() {
    var display_box = display_cards[current_display_card_index]
    var display_anchor = display_box.querySelector('a')
    display_box.value = selected_card.innerText 
    display_box.suit = active_suit
    display_anchor.innerText = selected_card.innerText + ' ' + suit_unicode[active_suit]

    display_anchor.style.color = suit_colors_dark[suit_codes[active_suit]]
}

function clear_selected_card() {
    var display_box = display_cards[current_display_card_index]
    var display_anchor = display_box.querySelector('a')
    display_box.value = null;
    display_box.suit = null;
    display_anchor.innerText = '' 

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

function touchmove(event) {
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

const suit_unicode = {heart:'\u2665', diamond:'\u2666', spade:'\u2660', club:'\u2663'};
var suit_nodes = [];
const suits = ['heart','diamond','spade','club']
const suit_codes = {'heart':0,'diamond':1,'spade':2,'club':3}
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
    if (e.touches.length > 1)
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
const suit_colors = ['#ec2c30', '#1843d7', '#404241', '#1f8a59']
const suit_colors_dark = [ '#ec2c30', //heart
                           '#1843d7', //diam
                            '#0a1527', //spade
                           '#1f8a59'] //club
                           //rgb_to_hex([143, 46, 76]), //heart '#D16D8C'
                           //rgb_to_hex([114, 50, 170]), //diam
                           //rgb_to_hex([38, 38, 38]), //spade'#404241'
                           //rgb_to_hex([79, 151, 87]) ] //club

function init_suit_nodes() {
    var i = 0
    var w = window.innerWidth
    var h = window.innerHeight
    var quad_w = w/2
    var quad_h = h/4
    var font_size = quad_w/2
    suits.forEach((suit,i) => {

        var container = document.createElement('div')
        var node = document.createElement('a') 
        node.style.fontSize = font_size + 'px' //font_size + 'em'
        //node.style.position = 'absolute' // no ...center in the div...
        node.innerText = suit_unicode[suit]
        node.data = suit
        node.classList.add('big-suit')
        container.classList.add('suit-box')
        container.data = suit
        container.suit = suit
        container.style.position = 'absolute'
        container.style.left = (i%2) * quad_w + 'px'
        container.style.bottom = (Math.trunc(i/2) %2) * quad_h + 'px'
        container.style.width = quad_w +'px'
        container.style.height = quad_h + 'px'
        container.style.background = suit_colors[i]
        container.appendChild(node)
        container.addEventListener("touchstart", suit_box_touched, true);
        suit_nodes.push(container)
    });
}


function init_status_bar() {
    var bar_height = Math.round(h/16) - 10
    var font_size = bar_height / 2

    var container = document.createElement('div')
    var name_node = document.createElement('a') 
    var round_node = document.createElement('a') 

    container.classList.add('status-bar')

    name_node.classList.add('name-tag')
    name_node.classList.add('status-tag')
    name_node.style.fontSize = font_size + 'px' 

    round_node.classList.add('round-num-tag')
    round_node.classList.add('status-tag')
    round_node.style.fontSize = font_size + 'px' 

    name_node.innerText = 'default_name'
    round_node.innerText = 'round # X'

    container.style.position = 'absolute'
    container.style.left = 0 + 'px' 
    container.style.top = 0 + 'px'
    container.style.width = w +'px'
    container.style.height = bar_height + 'px'

    container.appendChild(name_node)
    container.appendChild(round_node)
    document.body.appendChild(container)
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
    container.style.left = i * half_w + 4 + 'px'
    container.style.top = Math.round(quad_h/4) + 'px'
    container.style.width = half_w - 8 +'px'
    container.style.height = quad_h + 'px'

    //node.style.color = suit_colors[i]

    container.appendChild(node)
    display_cards.push(container)
    document.body.appendChild(container)
    container.addEventListener("touchstart", card_display_box_touched, false); //WIP

}

var hand = { };
var debug_node;
var debug_msg = '';
function debug_info(msg) {
   debug_node.innerText = msg; 
   debug_msg = msg;
}

function init_debug(){
    debug_node = document.createElement('p')
    debug_node.style.fontSize = '2em'
    debug_node.style.background = 'pink'
    debug_node.style.position = 'absolute'
    debug_node.style.left = '0px'
    debug_node.style.top = '0px'
    debug_node.innerText = 'debug info'
    document.body.appendChild(debug_node)
}

/* ---- utility funcs */
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
    MAX_R = Math.round((.9)*d/2)
}

document.addEventListener("DOMContentLoaded", function(event) {

    update_dimensions()
    //d = Math.min(window.innerWidth, window.innerHeight);
    //MAX_R = Math.round((.9)*d/2)
    shift_y = 0//-(r);

    init_debug();
    init_card_nodes();
    init_suit_nodes();
    init_canvas();
    init_status_bar();
    init_card_display_node(0) // to display two chosen cards
    init_card_display_node(1)

    px_in_em = get_px_in_em(cards[0])
    suit_symbol_size_px = window.innerWidth/4;
    suit_default_opacity = 0.2;
    show_suit_choices();  

    window.addEventListener("touchstart", touchstart, false);
    window.addEventListener("touchend", touchend, false);
    window.addEventListener("touchmove", touchmove, false);
    window.addEventListener("touchmove", touchmove, false);
   // document.body.addEventListener("touchmove", touchmove, false);

});

