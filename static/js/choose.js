function loadScript(url)
{
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    head.appendChild(script);
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
function clamp(x, mn, mx) { return Math.min(mx, Math.max(mn, x)); }

function set_filter_blur(elem, val){// elem.style.filter = `blur(${val}px)` }
    elem.style.opacity = val}

/*
 * interpolate many elements with one interpolation call
 * to_interp = [{elem, set_attr, val_start, val_end}, ...]
 * lerp(to_interp, dur, callback, lerp_func)
 */

function easeInOutBack(x) {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;

    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
}

function lerp_sync(changes, dur, callback, lerp_func=(t)=>t*t) {
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


function lerp(elem, set_attr, val_start, val_end, dur, callback, lerp_func=(t)=>t*t) {
       var t0 = Date.now()
       interpolate = function() {
           let t = (Date.now() - t0)/dur
           t = lerp_func(clamp(t, mn=0, mx=1))   // apply custom lerp easing func
           let val = (1-t)*val_start + t*val_end // interpolation
           set_attr(elem, val)
           if (t == 1) { // end interpolation
               clearInterval(lerp_interval_id)
               if (callback)
                   callback()
           }
       }
       var lerp_interval_id = setInterval(interpolate, 8) // start interpolation
}

function append_emoji(emo, box, x, y) {
    let node = document.createElement('div')
    let anchor = document.createElement('a')

    node.classList.add('emoji-box')
    anchor.classList.add('emoji-symbol')

    node.data = emo
    anchor.innerText = emo['emoji'] // unicode for the emoji
    
    let node_size = Math.floor(w/n)
    node.style.position = 'absolute'
    console.log(x+' '+y)
    node.style.left = x + 'px'
    node.style.top = y + 'px'
    node.style.width = node_size + 'px'
    node.style.height  = node_size + 'px'
    anchor.style.fontSize = node_size / 2 + 'px'

    node.addEventListener('touchstart', emoji_touched)
    node.appendChild(anchor)
    box.appendChild(node)
}

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(-10 * x, 2) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

/* network calls */
function post_new_user(username, emoji) {
  let query = `?username=${username}&emoji=${emoji}`;
  let url = '/api/user/new' + query;
  ajax_request(url, new_user_created);
}

function new_user_created(xhr) {
    let resp = JSON.parse(xhr.response)
    if (resp['success'] == 1) {
        let username = resp['username']
        window.location.href = `http://r.local/ring/${username}`
    }
    else {
        // show username already taken message
    }
}
/* end network calls*/

function confirm_btn_pressed(event, emoji_data) {
    console.log('new user: ' + data_from_server.username + ' ' + emoji_data['name'])
    //alert(emoji_data['emoji'])
    post_new_user(data_from_server.username, emoji_data['emoji'])

}

function modal_overlay_confirm_choice(emoji_node) {
    console.log(emoji_node.data)
    let modal = document.createElement('div')
    modal.classList.add('modal')
    modal.style.position = 'absolute'
    modal.style.top = window.scrollY + 'px'
    modal.style.left = window.scrollX + 'px'

    let box = document.createElement('div')
    box.classList.add('modal-container')

    let clone = emoji_node.cloneNode(true)
    box.appendChild(clone)
    modal.appendChild(box)

    let msg = document.createElement('a')
    msg.classList.add('msg-anchor')
    msg.innerHTML = "Choose " + emoji_node.data['emoji'] + " as your avatar?"
    msg.style.opacity=0

    box.appendChild(msg)

    let btn = document.createElement('div')
    let btn_anchor = document.createElement('a')
    btn.classList.add('confirm-btn')
    btn_anchor.innerHTML = 'confirm'
    btn.style.position = 'relative'
    btn.style.top = h/4 + 'px'
    btn.style.width = w/2 +'px'
    btn.style.height = h/8 + 'px'
    btn.style.left = w/2 - w/4 + 'px'
    btn.style.opacity=0
    btn.addEventListener('touchstart', (e)=>confirm_btn_pressed(e,emoji_node.data))

    btn.appendChild(btn_anchor)
    box.appendChild(btn)



    let emoji_symbol = clone.querySelector('.emoji-symbol')

    var cur_left = emoji_node.getBoundingClientRect().left
    var cur_top = emoji_node.getBoundingClientRect().top //+ window.scrollY
    var cx = w/2 - col_w/2
    var cy = h/2 - col_w/2 //- window.scrollY
    var changes = [{elem:elems.emoji_container, set_attr:(e,v)=>{e.style.opacity=v}, 
                    val_start:1, val_end:0},
                   {elem:clone, set_attr:(e,v)=>{e.style.left = v+'px'}, 
                    val_start:cur_left, val_end:cx},
                   {elem:clone, set_attr:(e,v)=>{e.style.top = v+'px'}, 
                    val_start:cur_top, val_end:cy},
                   {elem:emoji_symbol, set_attr:(e,v)=>{e.style.fontSize = v+'px'}, 
                    val_start:Math.floor(col_w/2), val_end:col_w},
                   {elem:msg, set_attr:(e,v)=>{e.style.opacity = v}, 
                    val_start:0, val_end:1},
                   {elem:btn, set_attr:(e,v)=>{e.style.opacity = v}, 
                    val_start:0, val_end:1}]
    lerp_sync(changes, 200, callback=()=>{pulse(emoji_symbol)},lerp_func=easeInOutCubic)

    modal.addEventListener('touchstart', modal_touched) //(e)=>{e.currentTarget.remove()})
    document.body.appendChild(modal)
}

function pulse(elem) {
    let dur = 30*1000
    let t0 = Date.now()
    let delta_size = 10
    var pulseInt = function () {
        let t = Date.now() - t0
        elem.style.fontSize = col_w + delta_size*Math.sin(2*Math.PI*t/1000) + 'px'
        if (t > dur)
            clearInterval(interval_id)
    }
    var interval_id = setInterval(pulseInt, 8)
}

function modal_touched(event) {
//    event.currentTarget.remove()
    event.preventDefault()
    var ct = event.currentTarget
    ct.remove()
    lerp(elems.emoji_container, set_filter_blur, 0, 1, 100)//, callback=()=>{console.log(ct);ct.remove()})
}

function dist(x,y,a,b) { return Math.hypot(x-a, y-b) }
var last_touch_t = Date.now()
var last_touch_x = -100;
var last_touch_y = -100;
const double_tap_radius = 100;
const double_tap_delay = 500;
function emoji_touched(event) {
    if (event.touches.length > 1)
        return
    let t = Date.now()
    let touch = event.touches[0]
    let x = touch.pageX
    let y = touch.pageY
    let dist_delta = dist(x,y,last_touch_x,last_touch_y)
    if (t - last_touch_t < double_tap_delay) {
        if (dist_delta < double_tap_radius) {
            event.preventDefault()
            modal_overlay_confirm_choice(this)//event.target)
        }
    }
    last_touch_t = t
    last_touch_x = x
    last_touch_y = y
}

var n;
var w;
var h; + 'px'
var col_w;
function populate_emoji(filter=(x) => true) {
    let box = elems.emoji_container
    let emojis = []
    emoji.forEach(emo => {if (filter(emo)) {emojis.push(emo)}})

    w = window.innerWidth
    h = window.innerHeight
    n = 4 // number of columns
    col_w = Math.floor(w/n)
    for (let i=0; i < emojis.length; i++) {
        let x = (i % 4)*col_w
        let y = Math.floor(i/4)*col_w
        append_emoji(emojis[i], box, x, y)
    }

}

function window_touched(event) {
    event.preventDefault()
    console.log('window touched')
}

var elems = { }
function on_loaded() {
    loadScript('/static/js/utils.js')
    elems.emoji_container = document.getElementById('emoji-container')
    let pat = /.*/ // /.*(animal|food)/ig
    populate_emoji(filter=(emo) => emo['category'].match(pat))
    window.addEventListener('touchstart', window_touched)

}

document.addEventListener("DOMContentLoaded", on_loaded)
