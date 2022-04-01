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
    touch_start_time = Date.now(); 
    var touch = e.touches[0];
    cx_real = touch.pageX
    cy_real = touch.pageY

    px = touch.pageX;
    py = touch.pageY;
    physics.update(event)

    if (!active_suit || e.touches.length > 1) {
        e.preventDefault();
        return
    }
    e.preventDefault();
    column_touched = rescale(cx_real,mn=0,mx=w,a=0,b=2)

    card_fan.fan(suit_codes[active_suit])
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
    //remove_card_from_hand(i)
    if (_hand.size == 0) {
        current_display_card_index = 0
        _hand.current_index = 0
    }

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
    node.theta = theta // TESTING EXPERIMENT
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

    /* reset UI */
    card_fan.hide_fan()
     
    /*
    if (selected_card && active_suit) {
        update_hand_state()
        advance_display_card_index()
    }
    */

    reset_suit_nodes()

    // post hand if player-felt isn't what was just touched
    if (_hand.size == 2 && e.target.className != "other-players-box") {
        _hand.post()
    }

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

class Round {
    constructor() {
        this.round_no = 0;
    }
}
/*
function card_display_box_touched(e) {//DUPE
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
*/
class Hand {
    MAX_HAND_SIZE = 2;
    API_ENDPOINT = '/api/hand';
    constructor() {
        this.cards = { }; // position index (0 or 1) => card_id (int)
        this.current_index = 0;
        this.dragging = false;
        this.drag_offset = [0,0];
        this.folded = false
    }
    add_card(card) {
        // add to internal hand model 
        let card_id = parseInt(card.getAttribute('card-id'))
        this.cards[this.current_index] = card_id;

        // apply special UI behavior
        card.classList.add(`hand-${this.current_index}`)
        card.addEventListener('touchstart', this.start_drag)
        card.addEventListener('touchmove', this.update_drag)
        card.addEventListener('touchend', this.end_drag)

        // move into hand position on screen
        let dest = this.get_destination(this.current_index)
        card_fan.move_card(card, dest)
        
        // advance internal hand model's index
        this.current_index = (this.current_index + 1) % this.MAX_HAND_SIZE;
    }
    remove_card_by_index(i) {
        if (!(i in this.cards))
            return null;
        let removed_id = this.cards[i];

        let old_card = card_fan.get_card(removed_id)
        console.log('removed from hand: ', old_card)
        old_card.classList.remove(`hand-${i}`)
        old_card.classList.remove(`selected-svg-card`)
        old_card.removeEventListener('touchstart', this.start_drag)
        old_card.removeEventListener('touchmove', this.update_drag)
        old_card.removeEventListener('touchend', this.end_drag)

        delete this.cards[i];
        this.current_index = i;
        return removed_id;
    }
    start_drag(event) {
        if (_hand.size < 2)
            return
        console.log(_hand.cards)
        _hand.dragging = true
        physics.update(event)
        for (let hand_index in _hand.cards) {
            let card = card_fan.get_card(_hand.cards[hand_index])
            let bbox = card.getBoundingClientRect()
            _hand.drag_offset[hand_index] = {left: physics.px_start - bbox.left,
                                             top: physics.py_start - bbox.top}
            console.log(physics.px_start, physics.py_start)
            console.log(bbox)
            console.log(_hand.drag_offset)
        }
    }
    update_drag(event) {
        if (!_hand.dragging)
            return
        event.preventDefault()
        if (event.touches.length > 1)
            return
        console.log('dragging hand', event.target.getAttribute('card-id'))
        _hand.move_hand_position({top:physics.py, left:physics.px}, _hand.drag_offset)
    }
    end_drag(event) {
        if (!_hand.dragging)
            return
        _hand.dragging = false
        _hand.toss()
    }
    toss() {
        let normed_speed = physics.speed/physics.max_speed
        let max_rot = Math.PI
        let max_dx = card_fan.card_h*3
        let max_dy = card_fan.card_h*5
        let dx = normed_speed*(physics.dir_vec.x)*max_dx
        let dy = normed_speed*(physics.dir_vec.y)*max_dy

        debug_info('theta:'+(physics.theta*(180/Math.PI)).toFixed(2) +
            'vel:' +physics.speed.toFixed(2) + 'normspeed:' + normed_speed.toFixed(1), 2)

        if (normed_speed > 0.2) {
            let dur = 100
            let lerp_func = (t)=>(1 - Math.pow((1 - t), 2))
            for (var i in this.cards) {
                let R = Math.random()
                let rot = (normed_speed)*(max_rot/2) + (.5 + R/2)*(max_rot/2)
                //let rot = (.25 + normed_speed/2)*(max_rot/2) + (.5 + R/2)*(max_rot/2)
                let card = card_fan.get_card(this.cards[i])
                let bbox = card.getBoundingClientRect()
                let dest = {top: bbox.top + dy*.5 + dy*(R/2 + 0.25) ,
                            left: bbox.left + dx*.5 + dx*(R/2 + 0.25),
                            theta: card.theta + rot}
                //card_fan.move_card(card, dest, dur, null, lerp_func)
                card_fan.move_card(card, dest, dur, ()=>this.after_fold(), lerp_func)
            }
            this.fold()
        }
        else {
            _hand.restore_hand_position()
        }
    }
    move_hand_position(dest, offsets) {
        for (let hand_index in this.cards) {
            let card = card_fan.get_card(this.cards[hand_index])
            let bbox = card.getBoundingClientRect()
            if (dest.left) card.style.left = dest.left - offsets[hand_index].left + 'px'
            if (dest.top) card.style.top = dest.top - offsets[hand_index].top + 'px'
            if (dest.theta) rotate_node(card, dest.theta)
        }
    }

    after_fold() {
        for (let hand_index in _hand.cards) {
            let card = card_fan.get_card(_hand.cards[hand_index])
            let fade = {val_start:1, val_end:0, set_attr:(e,v)=>e.style.opacity=v, elem:card}
           // lerp_sync([fade], 2000)//, ()=>this.reset())//, ()=>_hand.clear(hand_index))
        }
    }

    restore_hand_position() {
        for (let hand_index in this.cards) {
            let dest = this.get_destination(hand_index)
            let card = card_fan.get_card(this.cards[hand_index])
            card_fan.move_card(card, dest)
        }
    }
    get_destination(hand_index) {
        let pad = card_fan.card_w/4
        let left = pad + (card_fan.section_w)*hand_index
        let top =  h - card_fan.card_h*(2/3)
        let max_theta = Math.PI/32
        let theta = hand_index == 0 ? -max_theta : max_theta
        return {left:left, top:top, theta:theta};
    }
    get size() {
        return Object.keys(this.cards).length;
    }
    has_card(card) {
        let card_id = parseInt(card.getAttribute('card-id'));
        return Object.values(this.cards).includes(card_id);
    }
    swap() {
    }
    reset() {
        this.clear_card(0)
        this.clear_card(1)
        this.current_index = 0
        this.folded = false
        console.log('hand reset')
    }
    clear_card(card_index) {
        let removed_card_id = this.remove_card_by_index(card_index);
        if (removed_card_id) {
            console.log('removed_card_id', removed_card_id)
            card_fan.hide_card(removed_card_id)
        }
    }
    obscure() {
    }
    fold() {
        const endpoint = '/api/hand/fold'
        let query = `?user=${user_profile.info.username}`;
        let url = endpoint + query
        ajax_request(url, (xhr)=>this.hand_folded(xhr));
    }
    hand_folded(xhr) {
        let resp = xhr.response;
        this.folded = true
        console.log('folded set to true', this.folded)
        console.log(resp);
    }
    post() {
        const endpoint = '/api/hand'
        let user = user_profile.info.username;
        console.log('posted hand for:'+user);
        let query = `?user=${user}&card_a=${this.cards[0]}&card_b=${this.cards[1]}`;
        let url = endpoint + query;
        ajax_request(url, this.hand_posted);
    }
    hand_posted(xhr) {
        let resp = xhr.response;
        console.log(resp);
    }

    static get_suit_code(card_id) {
        return Math.floor((card_id-1)/13)
    }
}

var hand = { };
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

var px = 0; // Touch point
var py = 0;

function rescale(x,mn,mx,a=0,b=1){
    return a + ((x-mn)*(b-a))/(mx-mn);
}

function clamp(x, mn, mx) {
    return Math.min(mx, Math.max(mn, x));
}

function choose_from_fan(event) {
    if (!active_suit)
        return
    card_fan.choosing_update()


}

var selected_card;
var prev_selected_card = null;
var card_select_start = null;
var select_interval_id;

/*
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
    }
    else {
        clear_selected_card()
        remove_card_from_hand(current_display_card_index)
    }

    prev_selected_card = selected_card


}
*/

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
/*
    if (display_box.card_id) {
        place_card_offscreen(display_box.card_id)
    }
    */

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
        lerp(other_players_box, 'left', L*(-w/2), -w, 200, 'px', callback=vote_to_advance_round)
    }
}

class Physics {
    constructor() {
        this.acc_x = 0;
        this.acc_y = 0;
        this.px = 0;
        this.py = 0;
        this.px_start = 0;
        this.py_start = 0;
        this.t = Date.now();
        this.t0 = Date.now();
        this.dt = 0;
        this.disp_x = 0;
        this.disp_y = 0;
        this.max_v = 10
        this.max_speed = Math.hypot(this.max_v, this.max_v)
        this.history_n = 30
        this.pos_history = []
    }
    get vel_x() {
        return Math.min(this.max_v, Math.abs(this.vel_x_raw)) * (this.vel_x_raw < 0 ? -1 : 1)
    }
    get vel_y() {
        return Math.min(this.max_v, Math.abs(this.vel_y_raw)) * (this.vel_y_raw < 0 ? -1 : 1)
    }
    get speed() {
        return Math.hypot(this.vel_x, this.vel_y)
    }
    get theta() {
        return Math.atan2(this.dir_vec.y, this.dir_vec.x)
    }
    get dir_vec() {
        return {x:this.vel_x/this.speed, y:this.vel_y/this.speed}
    }
    update(event) {
        this.touch = event.touches[0]
        let px = this.touch.pageX
        let py = this.touch.pageY
        if (event.type == 'touchstart') {
            this.px_start = px
            this.py_start = py
            this.t0 = Date.now()
        }
        if (event.type == 'touchend') {
        }

        this.disp_x = px - this.px
        this.disp_y = py - this.py

        let t = Date.now()
        this.dt  = t - this.t
        
        this.vel_x_raw = this.disp_x / this.dt
        this.vel_y_raw = this.disp_y / this.dt

        this.t = t 
        this.px = px
        this.py = py
    }
}

function touchmove(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
    if (event.target.className == "other-players-box" && cx_real > 0.80*w) {
        drag_bar_to_advance_round(event)
    }
    var touch = event.touches[0];
    px = touch.pageX;
    py = touch.pageY;
    physics.update(event)

    choose_from_fan(event);

    //TODO move stuff into this function from draw sector (that isnt drawing sector)
    /*
    var up = (event.pageY > this.lastY), down = !up;
    this.lastY = event.pageY;
    if ((up && this.allowUp) || (down && this.allowDown)) event.stopPropagation();
    else event.preventDefault();
    */
}


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
    if (e.touches.length > 1 || cards_obscured || _hand.folded)
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
    var quad_h = quad_w * 0.7//h/4
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


class User {
    constructor(user_info) {
        this.info = user_info;
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

    console.log('data_from_server: '+ data_from_server.user)

/*    username = data_from_server.user.username || get('name') ||
                        'default_name' + get_random_emoji() */

    name_node.innerText = data_from_server.user.username || 'default_name'
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
    var disp_w = half_w - pad
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
    container.style.left = i * (disp_w) + pad + 'px'
    container.style.top = Math.round(quad_h/4) + 'px'
    container.style.width = disp_w +'px'
    container.style.height = quad_h + 'px'

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

function lerp_sync(changes, dur, callback, lerp_func=(t)=>t*t) {
       /* *
        * e.g.: changes = [{val_start:a, val_end:z, set_attr:func, elem:node}, {...}, ... ]
        * */
       var t0 = Date.now()
       interpolate = function() {
           let t = (Date.now() - t0)/dur
           t = lerp_func(clamp(t, mn=0, mx=1))   // apply custom lerp easing func
           changes.forEach(change => {
               let val = (1-t)*change.val_start + t*change.val_end // interpolate each change
               change.set_attr(change.elem, val)
           })
           if (t == 1) { // end interpolation
               clearInterval(lerp_interval_id)
               if (callback)
                   callback()
           }
       }
       var lerp_interval_id = setInterval(interpolate, 8) // start interpolation
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
    //fold_text_node.innerText = 'fold'
    un_obscure_cards()
    clear_winners()
    _hand.reset()
    card_fan.reset()
   
    for (let i = 0; i < 2 ; i++) {
        var j = 1-i // for some reason there's no i-- in javascript I guess
        current_display_card_index = j
        clear_selected_card()
//        remove_card_from_hand(j)
    }
    
}


var card_svgs;
var card_svgs_fan = []
var card_width;
var card_backs = []
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
    let disp_bbox = display_cards[0].getBoundingClientRect()
    let card_padding = 40
    card_height = disp_bbox.height - card_padding*2
    card_width = card_height*aspect //w/4  
    let apply_style = (card_svg_collection, y_pos) => {
        card_svg_collection.forEach(card => {
            // add css class 'hidden' (todo?)
            card.style.display = 'none'
            card.style.position = 'absolute'
            card.style.width = card_width + 'px'
            card.style.height = card_height + 'px'//card_width*(1/aspect) + 'px'
            card.style.left = -card_width - 10 + 'px'
            card.style.top = y_pos + 'px'
        })
    }
    apply_style(card_svgs, 0)
    apply_style(card_svgs_fan, 0)

    // clone card backs
    let card_back_original = document.querySelector('#card-back-container #svg2')
    let card_backs_div = document.createElement('div')
    let n = 2;
    card_backs_div.id = "card-backs"
    for (let i=0; i<n; i++) {
        let back = card_back_original.cloneNode(true)
        back.id = `card-back-${i}`
        back.style.position = 'absolute'
        back.style.width = card_width + 'px'
        back.style.height = card_height + 'px'
        back.style.left = card_width/4 + 'px'
        back.style.top = h + card_height/2 + 'px'
        card_backs_div.appendChild(back)
    }
    document.body.appendChild(card_backs_div)
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


class CardFan {
    constructor(svgs) {
        this.svgs = svgs;
        this.hidden_top = h + card_width/2;
        //this.hidden_left = -card_width - 100;
        this.hidden_left = w/2 -card_width/2;

        this.card_w = card_width;
        this.aspect = 25/35 
        this.card_h = card_width*(1/this.aspect)

        this.top_pad = 20
        this.side_pad = 200
        let felt_bbox = other_players_box.getBoundingClientRect();
        this.under_felt = felt_bbox.bottom + this.top_pad;
        this.top_edge = h + card_width / 2;
       
        this.section_w = card_width/6 // Math.max(card_w/6,100)
        let range = this.section_w*13
        this.left_edge = (w - range) / 2
        

        this.lerp_speed = 200;
        this.reset()
    }
    reset() {
        this.selected_card = null;
        this.active_suit = null;
        this.fanned_cards = null;
        this.svgs.forEach(svg=>{svg.style.left=this.hidden_left;
                                svg.style.top =this.hidden_top;
                                svg.style.opacity=1;});
    }

    get_suit(suit_code) {
        return this.svgs.slice(suit_code*13, (suit_code+1)*13);
    }
    get_card(card_id) {
        return this.svgs[card_id-1];
    }

    rotate_fan(card,i) {
        let max_dt = Math.PI/64;
        let dt = (1 - 2*Math.random())*max_dt;
        rotate_node(card, dt);
    }

    hide_card(card_id) {
        let dest = {left:this.hidden_left, top: this.top_edge, theta:0}
        this.move_card(this.get_card(card_id), dest)
    }

    fan(suit_code) {
        this.t0 = Date.now()
        // remove stale card from hand (e.g. for accidental card selection)
        if (_hand.size == _hand.MAX_HAND_SIZE) {
            let removed_card_id = _hand.remove_card_by_index(_hand.current_index);
            // todo: remove selected-card css class
            if (Hand.get_suit_code(removed_card_id) != suit_code) {
                // If it's not the active suit being fanned, move the card offscreen.
                this.hide_card(removed_card_id);
            }
        }
        this.fanned_cards = this.get_suit(suit_code);
        this.fanned_cards.forEach((card,i) => {
            if (_hand.has_card(card)) {
                return;
            }
            //card.style.top = py - this.card_h + 'px';//this.top_edge + 'px'; //INSTANT (no lerp)
            card.style.display = '';
            
            let bbox = card.getBoundingClientRect();
            let move_to_top = py - this.card_h
            let move_to_left = this.left_edge + i*this.section_w; //+ 'px';
            let lerp_onscreen_left = {val_start: bbox.left, val_end: move_to_left, elem: card,
                                 set_attr: (e,v)=>{card.style.left = v+'px'} };
            let lerp_onscreen_top = {val_start: bbox.top, val_end: move_to_top, elem: card,
                                 set_attr: (e,v)=>{card.style.top = v+'px'} };
            let lerp_onscreen_theta = {val_start: card.theta || 0, val_end: 0, elem: card,
                                 set_attr: (e,v)=>rotate_node(e,v) };
            lerp_sync([lerp_onscreen_left, lerp_onscreen_top, lerp_onscreen_theta],
                       this.lerp_speed, null, (t)=>t*t); 
        });
        //this.choosing_update() //EXPERIMENTAL
    }

    hide_fan() {
        if (!this.fanned_cards)
            return;
        this.fanned_cards.forEach((card,i) => {
            if (_hand.has_card(card)) {       // Don't hide a card if it's in the player's hand.
                return;
            }
            if (card == this.selected_card) { // Move card into hand.
                _hand.add_card(card);
            }
            else {                            // Move card off screen.
                let dest = {left:this.hidden_left, top: this.top_edge, theta:0}
                this.move_card(card, dest)
            }
        });
    }

    move_card(card, dest, dur, callback, lerp_func) {
        lerp_func = lerp_func || ((t)=>(t*t))
        dur = dur || this.lerp_speed
        callback = callback || null
        let bbox = card.getBoundingClientRect();
        let lerp_left_pos = {val_start: bbox.left, val_end: dest.left,
                             set_attr: (e,v)=>{card.style.left = v+'px'}, elem: card};
        let lerp_top_pos = {val_start: bbox.top, val_end: dest.top,
                             set_attr: (e,v)=>{card.style.top = v+'px'}, elem: card};
        let lerp_rotation = {val_start:card.theta, val_end:dest.theta,
                             set_attr:(e,v) => rotate_node(e,v), elem: card};
        lerp_sync([lerp_left_pos, lerp_top_pos, lerp_rotation], dur, callback, lerp_func);
        //klerp_sync([lerp_left_pos, lerp_top_pos, lerp_rotation], this.lerp_speed, null);
    }

    choosing_update() {
        let x = px //cx_real
        let L = rescale(x, mn=0, mx=w, a=0, b=1)
        let section = rescale(x, mn=0, mx=w, a=0,b=13)  // discretized..use to determine selected
        let max_dy = this.card_h / 3 //100
        let max_rot = Math.PI/16
        let radius = this.section_w*3
        let min_dist = 1000 // just an initial, arbitrary large value

        this.fanned_cards.forEach((card,i) => { 
            if (_hand.has_card(card))
                return;
            if (card != this.selected_card) {
                card.classList.remove('selected-svg-card')
            }
            let bbox = card.getBoundingClientRect()
            let dx = x - (bbox.left + this.section_w/2); // deviation from center of card section
            let abs_dx = Math.abs(dx)
            let dy = 0

            if (abs_dx < radius) { // in radius of dy effect
                let steepness = 4
                let dx_norm = abs_dx/radius
                dy = max_dy*Math.pow(Math.E, -(Math.pow(steepness*dx_norm, 2)))// gaussian

                if (abs_dx < min_dist){
                    min_dist = abs_dx;
                    selected_card = card;
                    if(card_is_already_in_hand(selected_card)) {
                        selected_card = null;
                    }
                }
            }
            else{ // not in radius of dy effect
                dy = 0
            }

            // spread cards out as a function of horizontal distance from touch
            /*
            let elapsed_t = Date.now() - this.t0
            if (elapsed_t > 2000) {
                let touch_dx = dx < 1 ? -1 : 1 
                card.style.left = bbox.left - touch_dx*dy//(elapsed_t/2000)
            }
            */

            //card.style.top = this.top_edge - dy + 'px'
            // TODO: staggered lazy catch up to py position, use velocity or accel.
            /*
            let ix = this.selected_card
                     ?  parseInt(this.selected_card.getAttribute('card-id')) % 13
                     : 0
            debug_info(ix, 2)
            let delta_ix = Math.abs(i - ix)
            console.log(delta_ix*physics.vel_y)
            let max_stagger = 10
            let stagger = delta_ix*max_stagger*Math.min(10,physics.vel_y)
//            stagger = Math.abs(stagger) < 10 ? stagger : stagger
            stagger = Math.abs(physics.vel_x) > Math.abs(physics.vel_y) ? 0 : stagger
            */
            card.style.top = py - this.card_h - dy + 'px'

            let M = i/13
            card.theta = (-max_rot*(1-M) + max_rot*(M))*(dy/max_dy)
            rotate_node(card, card.theta)
        }); 
        // TODO: do stuff with selected card
        if (selected_card) {
            if (px < this.left_edge - radius/2){  // cancel selection if near left screen
                this.selected_card = null;
                return
            }
            this.selected_card = selected_card
            selected_card.classList.add('selected-svg-card')
        }
    }
}

var debug_node;
var debug_msg = '';
const DEBUG_MODE = true//false
const DEBUG_LEVEL = 1
function debug_info(msg, level=1) {
   if (DEBUG_MODE && level > DEBUG_LEVEL) {
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
    if (!xhr.response)
        return
    var data = JSON.parse(xhr.response)
    var keys = Object.keys(data)
    if (keys.length == 0)
        return
    update_round_node(data['round_no'])
    
    var players = data['players']
    for (var username in players) {
        var player_info = players[username]
        // add new players to the round
        if (!(username in active_players) && !player_info.folded) {
            add_other_players_hand(player_info)
        }
        // remove folded players from the round
        if (player_info.folded == 1 && player_info.username in active_players) {
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

var card_fan;
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
    //init_fold_btn();
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

    card_fan = new CardFan(card_svgs_fan);
    _hand = new Hand();
    user_profile = new User(data_from_server.user);
    physics = new Physics();

    //TODO: dynamic poll rate
    var get_round_data_interval_id = setInterval(get_round_data, POLL_INTERVAL)

});

