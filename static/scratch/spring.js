const config = {
    from:0,
    to:400,
    tension:170,
    mass:1,
    friction:26,
    velocity:0,
    precision:0.01
}

let velocity = config.velocity
let position = config.from

update()

function update() {
  const tensionForce = -tension * (currentPosition - toPosition)
  const dampingForce = -config.friction * velocity
  const acceleration = (tensionForce + dampingForce) / mass
  velocity = velocity + acceleration
  position = position + velocity  if (Math.abs(position - to.progress) > precision {    
    window.requestAnimationFrame(update)
  }
}
